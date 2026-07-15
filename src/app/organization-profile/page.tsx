"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { MapLogo } from "@/components/brand/map-logo"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formSelectTriggerClassName } from "@/lib/form-field-styles"
import { AUTH_USER_STORAGE_KEY, getStoredAuthUser } from "@/lib/auth"
import {
  fetchProfile,
  getProfileAuthToken,
  updateOrganizationProfile,
} from "@/lib/profile/profile-api"
import { cn } from "@/lib/utils"

function getUserNameFromAuth(): string {
  const storedUser = getStoredAuthUser()
  const result = storedUser?.result

  const candidates = [
    result?.name,
    typeof result?.full_name === "string" ? result.full_name : "",
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  return ""
}

function getOrganizationNameFromAuth(): string {
  const storedUser = getStoredAuthUser()
  const organization = storedUser?.organization
  if (!organization) return ""

  const candidates = [
    organization.organization_name,
    organization.name,
    organization.org_name,
    organization.company_name,
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  return ""
}
const CURRENCIES = [
  { _id: "inr", name: "INR" },
  { _id: "usd", name: "USD" },
  { _id: "eur", name: "EUR" },
  { _id: "gbp", name: "GBP" },
]

const COUNTRIES = [
  { _id: "india", name: "India" },
  { _id: "usa", name: "United States" },
  { _id: "uk", name: "United Kingdom" },
  { _id: "uae", name: "United Arab Emirates" },
]

const INDIAN_STATES = [
  { _id: "tn", name: "Tamil Nadu" },
  { _id: "ka", name: "Karnataka" },
  { _id: "kl", name: "Kerala" },
  { _id: "mh", name: "Maharashtra" },
  { _id: "dl", name: "Delhi" },
  { _id: "gj", name: "Gujarat" },
  { _id: "ts", name: "Telangana" },
  { _id: "ap", name: "Andhra Pradesh" },
]

const organizationFormSchema = z.object({
  username: z.string().min(1, {
    message: "User name is required.",
  }),
  orgname: z.string().min(1, {
    message: "Organization name is required.",
  }),
  baseCurrency: z.string().min(1, {
    message: "Please select a base currency.",
  }),
  orgphone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().min(1, {
    message: "Address line 1 is required.",
  }),
  addressLine2: z.string().optional(),
  country: z.string().min(1, {
    message: "Please select a country.",
  }),
  state: z.string().optional(),
  city: z.string().min(1, {
    message: "City is required.",
  }),
  pincode: z.string().min(1, {
    message: "Pincode/ZIP is required.",
  }),
})

export default function OrganizationProfile() {
  const [states, setStates] = useState(INDIAN_STATES)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const router = useRouter()

  const organizationForm = useForm<z.infer<typeof organizationFormSchema>>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      username: "",
      orgname: "",
      baseCurrency: "inr",
      orgphone: "",
      website: "",
      addressLine1: "",
      addressLine2: "",
      country: "India",
      state: "",
      city: "",
      pincode: "",
    },
  })

  useEffect(() => {
    let cancelled = false

    async function loadNames() {
      organizationForm.setValue("orgname", getOrganizationNameFromAuth())

      // Prefer live profile API user name; fall back to auth storage.
      const token = getProfileAuthToken()
      if (token) {
        const profile = await fetchProfile(token)
        const profileName =
          typeof profile?.name === "string" ? profile.name.trim() : ""
        if (!cancelled && profileName) {
          organizationForm.setValue("username", profileName)
          return
        }
      }

      if (!cancelled) {
        organizationForm.setValue("username", getUserNameFromAuth())
      }
    }

    void loadNames()

    return () => {
      cancelled = true
    }
  }, [organizationForm])

  const handleCountryChange = (value: string) => {
    organizationForm.setValue("country", value)
    setStates(value === "India" ? INDIAN_STATES : [])
    organizationForm.setValue("state", "")
  }

  async function onSubmit(values: z.infer<typeof organizationFormSchema>) {
    setSubmitError("")
    setIsSubmitting(true)

    try {
      const token = getProfileAuthToken()
      if (!token) {
        setSubmitError("Your session has expired. Please sign in again.")
        return
      }

      const result = await updateOrganizationProfile(token, {
        userName: values.username,
        organizationName: values.orgname,
      })

      if (!result.success) {
        setSubmitError(result.message || "Failed to save organization profile.")
        return
      }

      const storedUser = getStoredAuthUser()
      if (storedUser) {
        const updatedUser = {
          ...storedUser,
          result: {
            ...storedUser.result,
            name: values.username,
          },
          organization: {
            ...storedUser.organization,
            ...result.organization,
            user_name: values.username,
            organization_name: values.orgname,
          },
        }
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(updatedUser))
      }

      router.push("/setup-complete")
    } catch {
      setSubmitError("Failed to save organization profile. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-y-auto px-4 py-6 sm:py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 overflow-hidden bg-[#f5f7fa]"
      >
        <Image
          src="/sign_in_bk.webp"
          alt=""
          fill
          priority
          className="scale-105 object-cover blur-md"
        />
        <div className="absolute inset-0 bg-[#0f2b4a]/40" />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
        <MapLogo className="mb-8" />

        <div className="relative w-full overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-[0_24px_64px_rgba(15,43,74,0.22)] backdrop-blur-xl sm:rounded-3xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f2b4a] via-[#1a4a7a] to-[#c73e3e]"
          />

          <div className="max-h-[78vh] overflow-y-auto px-6 py-8 sm:max-h-[80vh] sm:px-10 sm:py-10">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[#1a2332]">
                Organization Profile 
              </h1>
              <p className="text-sm text-[#6b7280]">Tell us about your organization</p>
            </div>
            {/* Form */}
            <Form {...organizationForm}>
              <form onSubmit={organizationForm.handleSubmit(onSubmit)} className="space-y-6">
                {submitError ? (
                  <p
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                  >
                    {submitError}
                  </p>
                ) : null}
                {/* User Name */}
                <FormField
                  control={organizationForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-[#1a2332]">
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your name" className="mt-1 h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Organization Name */}
                <FormField
                  control={organizationForm.control}
                  name="orgname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-[#1a2332]">
                        Organization Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organization name" className="mt-1 h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Line 1 */}
                <FormField
                  control={organizationForm.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-[#1a2332]">
                        Address Line 1 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address line 1" className="mt-1 h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Line 2 */}
                <FormField
                  control={organizationForm.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-[#1a2332]">
                        Address Line 2 (Optional)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address line 2" className="mt-1 h-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country and State/Province */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={organizationForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-sm font-medium text-[#1a2332]">
                          Country
                        </FormLabel>
                        <Select onValueChange={handleCountryChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger
                              size="form"
                              className={cn(formSelectTriggerClassName, "mt-1 h-12 w-full")}
                            >
                              <SelectValue placeholder="India" />
                            </SelectTrigger>
                          </FormControl>
                          <FormSelectContent>
                            {COUNTRIES.map((country) => (
                              <FormSelectItem key={country._id} value={country.name}>
                                {country.name}
                              </FormSelectItem>
                            ))}
                          </FormSelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={organizationForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel className="text-sm font-medium text-[#1a2332]">
                          State/Province (Optional)
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger
                              size="form"
                              className={cn(formSelectTriggerClassName, "mt-1 h-12 w-full")}
                            >
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <FormSelectContent>
                            {states.map((state) => (
                              <FormSelectItem key={state._id} value={state.name}>
                                {state.name}
                              </FormSelectItem>
                            ))}
                          </FormSelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* City and Pincode/ZIP */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={organizationForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-[#1a2332]">
                          City <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" className="mt-1 h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={organizationForm.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-[#1a2332]">
                          Pincode/ZIP <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter pincode"
                            className="mt-1 h-12"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                              const numericRegex = /^[0-9]*$/
                              if (numericRegex.test(value) || value === "") {
                                field.onChange(value)
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-w-[96px] rounded-xl border-[#e4e7ec] px-8"
                    onClick={() => router.push("/welcome")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="min-w-[96px] rounded-xl bg-[#0f2b4a] px-8 shadow-[0_4px_14px_rgba(15,43,74,0.35)] hover:bg-[#1a4a7a] hover:shadow-[0_6px_20px_rgba(15,43,74,0.4)]"
                  >
                    {isSubmitting ? "Saving…" : "Continue"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
