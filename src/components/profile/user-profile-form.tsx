"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useToast } from "@/hooks/use-toast"
import {
  PROFILE_IMAGE_ALLOWED_FORMATS_LABEL,
  PROFILE_IMAGE_MAX_SIZE_BYTES,
  PROFILE_IMAGE_MAX_SIZE_LABEL,
  isAllowedProfileImageType,
} from "@/config/imageUpload"
import {
  fetchProfile,
  getProfileAuthToken,
  resolveProfileImageUrl,
  updateProfile,
  type ProfileData,
} from "@/lib/profile/profile-api"
import {
  ROLE_TIER_LABELS,
  getOrgIdFromAuth,
  getRoleTier,
  getStoredAuthUser,
} from "@/lib/auth"
import { fetchRoles } from "@/lib/roles/roles-api"
import {
  themePrimaryAvatarClassName,
  themePrimaryBadgeClassName,
  themePrimaryButtonSmClassName,
} from "@/lib/form-field-styles"

const profileSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

type ProfileSnapshot = {
  profile: ProfileData | null
  roleOptions: Array<{ id: string; name: string }>
}

let profileSnapshotCache: ProfileSnapshot | null = null
let profileLoadPromise: Promise<ProfileSnapshot> | null = null

async function loadProfileSnapshot(token: string): Promise<ProfileSnapshot> {
  if (profileSnapshotCache) return profileSnapshotCache
  if (profileLoadPromise) return profileLoadPromise

  profileLoadPromise = (async () => {
    const storedUser = getStoredAuthUser()
    const orgId = getOrgIdFromAuth(storedUser)

    const [profile, roles] = await Promise.all([
      fetchProfile(token),
      orgId ? fetchRoles(orgId, token).catch(() => []) : Promise.resolve([]),
    ])

    const snapshot: ProfileSnapshot = {
      profile,
      roleOptions: roles.map((role) => ({ id: role.id, name: role.name })),
    }
    profileSnapshotCache = snapshot
    return snapshot
  })()

  try {
    return await profileLoadPromise
  } finally {
    profileLoadPromise = null
  }
}

function applyProfileSnapshot(
  snapshot: ProfileSnapshot,
  cachedDefaults: ReturnType<typeof getCachedProfileDefaults>,
  form: ReturnType<typeof useForm<ProfileFormValues>>,
  setters: {
    setRoleOptions: (options: Array<{ id: string; name: string }>) => void
    setRoleId: (id: string) => void
    setRoleName: (name: string) => void
    setProfileImageUrl: (url: string) => void
  }
) {
  const { profile, roleOptions } = snapshot

  setters.setRoleOptions(roleOptions)

  if (!profile) return

  form.reset({
    name: profile.name || cachedDefaults.name,
    email: profile.email || cachedDefaults.email,
    phone: typeof profile.phone === "string" ? profile.phone : "",
  })

  const profileRoleId =
    typeof profile.role === "string" ? profile.role : cachedDefaults.roleId
  if (profileRoleId) setters.setRoleId(profileRoleId)

  if (typeof profile.role_name === "string" && profile.role_name) {
    setters.setRoleName(profile.role_name)
  } else if (profileRoleId) {
    const matchedRole = roleOptions.find((role) => role.id === profileRoleId)
    if (matchedRole) setters.setRoleName(matchedRole.name)
  }

  const imageUrl = resolveProfileImageUrl(
    typeof profile.profile_image === "string" ? profile.profile_image : ""
  )
  if (imageUrl) setters.setProfileImageUrl(imageUrl)
}

function getCachedProfileDefaults() {
  const storedUser = getStoredAuthUser()
  const roleId =
    String(storedUser?.roleData?.id ?? storedUser?.roleData?._id ?? "") || ""
  return {
    name: storedUser?.result?.name ?? "",
    email: storedUser?.result?.email ?? "",
    phone: "",
    roleId,
    roleName: String(storedUser?.roleData?.role_name ?? ""),
    roleTier: getRoleTier(storedUser),
  }
}

export function UserProfileForm() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cachedDefaults = useMemo(() => getCachedProfileDefaults(), [])

  const [isReady, setIsReady] = useState(() => profileSnapshotCache !== null)
  const [isSaving, setIsSaving] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState(() => {
    const image = profileSnapshotCache?.profile?.profile_image
    return typeof image === "string" ? resolveProfileImageUrl(image) : ""
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [roleId, setRoleId] = useState(
    () =>
      (typeof profileSnapshotCache?.profile?.role === "string"
        ? profileSnapshotCache.profile.role
        : "") || cachedDefaults.roleId
  )
  const [roleName, setRoleName] = useState(
    () =>
      (typeof profileSnapshotCache?.profile?.role_name === "string"
        ? profileSnapshotCache.profile.role_name
        : "") || cachedDefaults.roleName
  )
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name: string }>>(
    () => profileSnapshotCache?.roleOptions ?? []
  )

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profileSnapshotCache?.profile?.name || cachedDefaults.name,
      email: profileSnapshotCache?.profile?.email || cachedDefaults.email,
      phone:
        typeof profileSnapshotCache?.profile?.phone === "string"
          ? profileSnapshotCache.profile.phone
          : cachedDefaults.phone,
    },
  })

  useEffect(() => {
    let cancelled = false

    const setters = {
      setRoleOptions,
      setRoleId,
      setRoleName,
      setProfileImageUrl,
    }

    if (profileSnapshotCache) {
      applyProfileSnapshot(profileSnapshotCache, cachedDefaults, form, setters)
    }

    async function loadProfile() {
      const token = getProfileAuthToken()
      const showLoading = profileSnapshotCache === null

      if (!token) {
        if (!cancelled && showLoading) setIsReady(true)
        return
      }

      try {
        const snapshot = await loadProfileSnapshot(token)
        if (cancelled) return

        applyProfileSnapshot(snapshot, cachedDefaults, form, setters)
        if (showLoading) setIsReady(true)
      } catch {
        if (!cancelled && showLoading) setIsReady(true)
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const displayImage = previewUrl || profileImageUrl
  const displayName = form.watch("name")
  const displayRoleName =
    roleName ||
    roleOptions.find((role) => role.id === roleId)?.name ||
    cachedDefaults.roleName ||
    ""
  const initials = displayName
    ? displayName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAllowedProfileImageType(file)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: `Please upload ${PROFILE_IMAGE_ALLOWED_FORMATS_LABEL}.`,
      })
      event.target.value = ""
      return
    }

    if (file.size > PROFILE_IMAGE_MAX_SIZE_BYTES) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: `Profile image must be under ${PROFILE_IMAGE_MAX_SIZE_LABEL}.`,
      })
      event.target.value = ""
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    event.target.value = ""
  }

  async function onSubmit(values: ProfileFormValues) {
    const token = getProfileAuthToken()
    if (!token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You are not logged in.",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await updateProfile(token, {
        name: values.name,
        phone: values.phone,
        profileImage: selectedImage,
      })

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to save profile.",
        })
        return
      }

      if (result.data?.profile_image) {
        const imageUrl = resolveProfileImageUrl(result.data.profile_image)
        setProfileImageUrl(imageUrl)
        if (profileSnapshotCache?.profile) {
          profileSnapshotCache = {
            ...profileSnapshotCache,
            profile: {
              ...profileSnapshotCache.profile,
              profile_image: result.data.profile_image,
            },
          }
        }
      }

      if (profileSnapshotCache?.profile) {
        profileSnapshotCache = {
          ...profileSnapshotCache,
          profile: {
            ...profileSnapshotCache.profile,
            name: values.name,
            phone: values.phone,
          },
        }
      }

      setSelectedImage(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving profile:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save profile. Please try again.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        {!isReady ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative w-fit">
                  <Avatar className="h-20 w-20">
                    {displayImage ? (
                      <AvatarImage src={displayImage} alt={displayName || "Profile"} />
                    ) : null}
                    <AvatarFallback
                      className={`text-lg font-semibold ${themePrimaryAvatarClassName}`}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                  >
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Change profile photo</span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{displayName || "User"}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={themePrimaryBadgeClassName}>
                      {ROLE_TIER_LABELS[cachedDefaults.roleTier]}
                    </Badge>
                    {displayRoleName ? (
                      <Badge variant="outline">{displayRoleName}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {PROFILE_IMAGE_ALLOWED_FORMATS_LABEL} up to {PROFILE_IMAGE_MAX_SIZE_LABEL}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Email address"
                          readOnly
                          className="bg-muted/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Role</FormLabel>
                  <Input
                    value={displayRoleName || "Not assigned"}
                    readOnly
                    className="bg-muted/50"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  size="sm"
                  className={themePrimaryButtonSmClassName}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  )
}
