"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Building2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"

import {
  getOrgIdFromAuth,
  getRoleTier,
  getStoredAuthUser,
  getUserBranchId,
  hasAllBranchAccess,
  fetchBranches,
} from "@/lib/auth"
import {
  formInputClassName,
  formSelectTriggerClassName,
  formTextareaClassName,
} from "@/lib/form-field-styles"
import { PROPERTY_TYPE_LABELS } from "@/lib/projects/types"

const footerButtonClass = "h-10 min-w-[88px] rounded-md px-4 py-2"

const propertyTypeOptions = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

type ProjectSettingItem = {
  _id?: string | { $oid?: string }
  id?: string | number
  name?: string
  default?: number
}

type SelectOption = {
  value: string
  label: string
  isDefault?: boolean
}

function resolveSettingId(item: ProjectSettingItem): string {
  if (item._id && typeof item._id === "object" && item._id.$oid) {
    return item._id.$oid
  }

  return String(item._id ?? item.id ?? "")
}

function mapProjectSettingsToOptions(items: ProjectSettingItem[] | undefined): SelectOption[] {
  return (items || [])
    .filter((item) => item.name?.trim() && resolveSettingId(item))
    .map((item) => ({
      value: resolveSettingId(item),
      label: item.name!.trim(),
      isDefault: item.default === 1,
    }))
}

function getDefaultOptionValue(options: SelectOption[]): string {
  return options.find((option) => option.isDefault)?.value ?? options[0]?.value ?? ""
}

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  location: z.string().min(1, "City / district is required"),
  area_locality: z.string().min(1, "Locality is required"),
  price_per_sqft: z.coerce.number().min(1, "Price per sq.ft is required"),
  price_per_cent: z.coerce.number().min(0, "Per cent price must be 0 or greater").optional(),
  price_range_min: z.coerce.number().min(1, "Minimum price is required"),
  price_range_max: z.coerce.number().min(1, "Maximum price is required"),
  rera_status: z.string().min(1, "RERA status is required"),
  rera_number: z.string().optional(),
  dtcp_number: z.string().optional(),
  dtcp_status: z.string().optional(),
  property_types: z.array(z.string()).min(1, "Select at least one property type"),
  budget_min: z.coerce.number().min(1, "Minimum budget is required"),
  budget_max: z.coerce.number().min(1, "Maximum budget is required"),
  status: z.string().min(1, "Project status is required"),
  branch_id: z.string().optional(),
  description: z.string().optional(),
  highlights: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectFormSchema>

interface ProjectFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ProjectFormDrawer({ open, onOpenChange, onSuccess }: ProjectFormDrawerProps) {
  const { toast } = useToast()
  const [reraStatusOptions, setReraStatusOptions] = useState<SelectOption[]>([])
  const [projectStatusOptions, setProjectStatusOptions] = useState<SelectOption[]>([])
  const [isLoadingStatusOptions, setIsLoadingStatusOptions] = useState(false)
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [showBranchPicker, setShowBranchPicker] = useState(false)

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      location: "Coimbatore",
      area_locality: "",
      price_per_sqft: 0,
      price_per_cent: 0,
      price_range_min: 0,
      price_range_max: 0,
      rera_status: "",
      rera_number: "",
      dtcp_number: "",
      dtcp_status: "",
      property_types: [],
      budget_min: 0,
      budget_max: 0,
      status: "",
      branch_id: "",
      description: "",
      highlights: "",
    },
  })

  useEffect(() => {
    if (!open) {
      form.reset()
      return
    }

    const fetchProjectSettings = async () => {
      setIsLoadingStatusOptions(true)

      try {
        const authUser = getStoredAuthUser()
        const token = authUser?.access_token

        if (!token) {
          throw new Error("You are not logged in. Please sign in again.")
        }

        const orgId = getOrgIdFromAuth(authUser)
        const tier = getRoleTier(authUser)
        const userBranchId = getUserBranchId(authUser)
        const branches = (await fetchBranches(orgId, token)).filter((b) => b.status === "active")
        const branchOpts = branches.map((b) => ({ value: b.id, label: b.name }))
        setBranchOptions(branchOpts)
        setShowBranchPicker(hasAllBranchAccess(tier) && branchOpts.length > 0)

        if (userBranchId) {
          form.setValue("branch_id", userBranchId)
        } else if (branchOpts[0]) {
          form.setValue("branch_id", branchOpts[0].value)
        }

        const response = await fetch(URLS.PROJECT_SETTINGS_LIST, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await parseJsonResponse<{
          code?: number
          msg?: string
          data?: Record<string, ProjectSettingItem[]>
        }>(response)

        if (!response.ok || result.code !== 200) {
          throw new Error(result.msg || "Failed to load project settings.")
        }

        const data = result.data || {}
        const reraOptions = mapProjectSettingsToOptions(data.rera_status)
        const statusOptions = mapProjectSettingsToOptions(data.project_status)

        setReraStatusOptions(reraOptions)
        setProjectStatusOptions(statusOptions)

        form.setValue("rera_status", getDefaultOptionValue(reraOptions))
        form.setValue("status", getDefaultOptionValue(statusOptions))
      } catch (error) {
        setReraStatusOptions([])
        setProjectStatusOptions([])
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load status options.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingStatusOptions(false)
      }
    }

    fetchProjectSettings()
  }, [open, form, toast])

  const onSubmit = async (values: ProjectFormValues) => {
    try {
      const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
      const token = userData.access_token

      if (!token) {
        throw new Error("You are not logged in. Please sign in again.")
      }

      await createProjectApi(
        {
          name: values.name.trim().toUpperCase(),
          location: values.location.trim(),
          area_locality: values.area_locality.trim(),
          price_per_sqft: values.price_per_sqft,
          ...(values.price_per_cent != null && values.price_per_cent > 0
            ? { price_per_cent: values.price_per_cent }
            : {}),
          price_range_min: values.price_range_min,
          price_range_max: values.price_range_max,
          rera_status: values.rera_status,
          rera_number: values.rera_number?.trim() || undefined,
          dtcp_number: values.dtcp_number?.trim() || undefined,
          dtcp_status: values.dtcp_status?.trim() || undefined,
          property_types: values.property_types,
          budget_min: values.budget_min,
          budget_max: values.budget_max,
          status: values.status,
          branch_id: values.branch_id || getUserBranchId(getStoredAuthUser()) || undefined,
          description: values.description?.trim() || undefined,
          highlights: values.highlights
            ? values.highlights.split("\n").map((line) => line.trim()).filter(Boolean)
            : [],
        },
        token,
      )

      toast({
        title: "Project created",
        description: `${values.name} has been added to inventory.`,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to create project."),
        variant: "destructive",
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-3xl p-0 flex flex-col h-full gap-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 py-6">
          <SheetHeader className="p-0 pb-6 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <Building2 className="h-5 w-5 shrink-0 text-primary" />
              Add Project 
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Create a new real-estate project in your inventory database.
            </SheetDescription>
            <Separator className="mt-4" />
          </SheetHeader>

          <Form {...form}>
            <form id="project-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input className={formInputClassName} placeholder="e.g. AMMAN NAGAR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showBranchPicker && (
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                      </FormControl>
                      <FormSelectContent>
                        {branchOptions.map((opt) => (
                          <FormSelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </FormSelectItem>
                        ))}
                      </FormSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (City)</FormLabel>
                    <FormControl>
                      <Input className={formInputClassName} placeholder="Coimbatore" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="area_locality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Locality</FormLabel>
                    <FormControl>
                      <Input className={formInputClassName} placeholder="Ganapathy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="price_per_sqft"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price / sq.ft (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" className={formInputClassName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_range_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" className={formInputClassName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_range_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" className={formInputClassName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="price_per_cent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Per Cent Price (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" className={formInputClassName} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="property_types"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Types</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={propertyTypeOptions}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select property types"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="budget_min"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Budget Min (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" className={formInputClassName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="budget_max"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Budget Max (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" className={formInputClassName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="rera_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RERA Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingStatusOptions || reraStatusOptions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue
                            placeholder={
                              isLoadingStatusOptions ? "Loading RERA statuses..." : "Select RERA status"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <FormSelectContent>
                        {reraStatusOptions.map((option) => (
                          <FormSelectItem key={option.value} value={option.value}>
                            {option.label}
                          </FormSelectItem>
                        ))}
                      </FormSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingStatusOptions || projectStatusOptions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className={formSelectTriggerClassName}>
                          <SelectValue
                            placeholder={
                              isLoadingStatusOptions ? "Loading project statuses..." : "Select status"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <FormSelectContent>
                        {projectStatusOptions.map((option) => (
                          <FormSelectItem key={option.value} value={option.value}>
                            {option.label}
                          </FormSelectItem>
                        ))}
                      </FormSelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dtcp_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DTCP Number</FormLabel>
                    <FormControl>
                      <Input className={formInputClassName} placeholder="L.P.No. 112/2023" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rera_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RERA Number</FormLabel>
                    <FormControl>
                      <Input className={formInputClassName} placeholder="TN/29/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dtcp_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DTCP Status</FormLabel>
                  <FormControl>
                    <Input className={formInputClassName} placeholder="DTCP Approved" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="highlights"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Highlights (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      className={formTextareaClassName}
                      rows={4}
                      placeholder={"1.5 km from Sathy Road\nHigh appreciation area"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className={formTextareaClassName} rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              <div className="pb-4" />
            </form>
          </Form>
        </div>

        <div className="shrink-0 border-t bg-background px-8 py-4 flex flex-row-reverse gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <Button
            type="submit"
            form="project-form"
            className={footerButtonClass}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Create Project"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={footerButtonClass}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
