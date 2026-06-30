"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { MultiSelect } from "@/components/ui/multi-select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, FormSelectContent, FormSelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User } from "lucide-react"
import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formInputClassName, formSelectTriggerClassName, formTextareaClassName } from "@/lib/form-field-styles"

const footerButtonClass = "h-10 min-w-[88px] rounded-md px-4 py-2"

type LeadSettingItem = {
  _id?: string
  id?: string
  name?: string
}

const leadFormSchema = z
  .object({
    lead_type: z.enum(["individual", "company"]),
    company_name: z.string().optional(),
    lead_name: z.string().optional(),
    designation: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    current_staying: z.string().optional(),
    customer_type: z.string().min(1, "Customer type is required"),
    customer_requirement: z.array(z.string()).min(1, "Select at least one Interested In"),
    phone: z.string().min(1, "Phone number is required"),
    email: z.string().email().optional().or(z.literal("")),
    description: z.string().min(1, "Description is required"),
  })
  .superRefine((data, ctx) => {
    if (data.lead_type === "individual") {
      if (!data.company_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name is required",
          path: ["company_name"],
        })
      }
      return
    }

    if (!data.company_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required",
        path: ["company_name"],
      })
    }

    if (!data.lead_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lead name is required",
        path: ["lead_name"],
      })
    }

    if (!data.designation?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Designation is required",
        path: ["designation"],
      })
    }
  })

type LeadFormValues = z.infer<typeof leadFormSchema>

type SelectOption = {
  value: string
  label: string
}

type AddLeadApiResponse = {
  code: number
  msg: string
  data?: Record<string, unknown>
}

export type AddLeadPayload = {
  name: string
  phone: string
  description: string
  customer_type: string
  customer_requirement: string
  email: string
  location: string
  current_staying?: string
  lead_type: "individual" | "company"
  company_name?: string
  position?: string
}

interface LeadFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (lead: AddLeadApiResponse["data"]) => void
  onLeadAdded?: () => void
}

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel className="text-sm font-medium text-foreground">
      {children} <span className="text-destructive">*</span>
    </FormLabel>
  )
}

function buildLeadPayload(data: LeadFormValues): AddLeadPayload {
  const basePayload = {
    phone: data.phone.trim(),
    description: data.description.trim(),
    customer_type: data.customer_type,
    customer_requirement: data.customer_requirement.join(", "),
    email: data.email?.trim() || "",
    location: data.location.trim(),
    ...(data.current_staying?.trim() ? { current_staying: data.current_staying.trim() } : {}),
    lead_type: data.lead_type,
  }

  if (data.lead_type === "company") {
    return {
      ...basePayload,
      name: data.lead_name?.trim() || "",
      company_name: data.company_name?.trim() || "",
      position: data.designation?.trim() || "",
    }
  }

  return {
    ...basePayload,
    name: data.company_name?.trim() || "",
  }
}

function mapLeadSettingsToOptions(items: LeadSettingItem[]): SelectOption[] {
  return items
    .filter((item) => item.name?.trim() && (item._id || item.id))
    .map((item) => ({
      value: String(item._id || item.id),
      label: item.name!.trim(),
    }))
}

export function LeadFormDrawer({ open, onOpenChange, onSave, onLeadAdded }: LeadFormDrawerProps) {
  const [companyNameError, setCompanyNameError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerTypeOptions, setCustomerTypeOptions] = useState<SelectOption[]>([])
  const [customerRequirementOptions, setCustomerRequirementOptions] = useState<SelectOption[]>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const { toast } = useToast()

  const validateCompanyName = (value: string): boolean => {
    const companyNameRegex = /^[a-zA-Z0-9\s\.\,\-\'&]*$/
    return companyNameRegex.test(value)
  }

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      lead_type: "individual",
      company_name: "",
      lead_name: "",
      designation: "",
      location: "",
      current_staying: "",
      customer_type: "",
      customer_requirement: [],
      phone: "",
      email: "",
      description: "",
    },
  })

  const selectedLeadType = form.watch("lead_type")
  const nameLabel = selectedLeadType === "company" ? "Company Name" : "Name"
  const namePlaceholder =
    selectedLeadType === "company" ? "Enter company name" : "Enter name"

  useEffect(() => {
    if (!open) return

    const fetchLeadSettings = async () => {
      setIsLoadingOptions(true)

      try {
        const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
        const token = userData.access_token

        if (!token) {
          throw new Error("You are not logged in. Please sign in again.")
        }

        const response = await fetch(URLS.LEAD_SETTINGS_LIST, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await parseJsonResponse<{ code?: number; msg?: string; data?: Record<string, LeadSettingItem[]> }>(response)

        if (!response.ok || result.code !== 200) {
          throw new Error(result.msg || "Failed to load lead settings.")
        }

        const data = result.data || {}

        setCustomerTypeOptions(mapLeadSettingsToOptions(data.customer_type || []))
        setCustomerRequirementOptions(mapLeadSettingsToOptions(data.customer_requirement || []))
      } catch (error) {
        setCustomerTypeOptions([])
        setCustomerRequirementOptions([])
        toast({
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to load dropdown options.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingOptions(false)
      }
    }

    fetchLeadSettings()
  }, [open, toast])

  async function onSubmit(data: LeadFormValues) {
    if (companyNameError) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
      const token = userData.access_token

      if (!token) {
        throw new Error("You are not logged in. Please sign in again.")
      }

      const payload = buildLeadPayload(data)

      const response = await fetch(URLS.ADD_LEAD, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result: AddLeadApiResponse = await parseJsonResponse(response)

      if (!response.ok || result.code !== 200) {
        throw new Error(result.msg || "Failed to create lead.")
      }

      toast({
        title: "Success!",
        description: result.msg || "Lead has been created",
      })

      onSave?.(result.data)
      onLeadAdded?.()

      onOpenChange(false)
      form.reset()
      setCompanyNameError("")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save lead. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    if (isSubmitting) return
    onOpenChange(false)
    form.reset()
    setCompanyNameError("")
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(newOpen) => {
        if (isSubmitting) return
        onOpenChange(newOpen)
        if (!newOpen) {
          setCompanyNameError("")
        }
      }}
    >
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md p-0 flex flex-col h-full gap-0">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
          <SheetHeader className="p-0 pb-5">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5 text-primary" />
              Add Lead
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              Fill in the details below to create a new lead.
            </SheetDescription>
            <Separator className="mt-4" />
          </SheetHeader>

          <Form {...form}>
            <form id="lead-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="lead_type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value: "individual" | "company") => {
                          field.onChange(value)
                          if (value === "individual") {
                            form.setValue("lead_name", "")
                            form.setValue("designation", "")
                            form.clearErrors(["lead_name", "designation"])
                          }
                        }}
                        className="flex items-center gap-6"
                        disabled={isSubmitting}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="individual" id="lead-type-individual" />
                          <Label htmlFor="lead-type-individual" className="cursor-pointer font-normal">
                            Individual
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="company" id="lead-type-company" />
                          <Label htmlFor="lead-type-company" className="cursor-pointer font-normal">
                            Company
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <RequiredLabel>{nameLabel}</RequiredLabel>
                    <FormControl>
                      <Input
                        placeholder={namePlaceholder}
                        {...field}
                        disabled={isSubmitting}
                        className={cn(
                          formInputClassName,
                          companyNameError && "border-destructive focus-visible:ring-destructive/30"
                        )}
                        onChange={(e) => {
                          const value = e.target.value
                          if (validateCompanyName(value) || value === "") {
                            field.onChange(value)
                            setCompanyNameError("")
                          } else {
                            setCompanyNameError("Only letters, digits, spaces, and common punctuation (. , - ' &) are allowed")
                          }
                        }}
                      />
                    </FormControl>
                    {companyNameError && (
                      <p className="text-sm text-destructive">{companyNameError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedLeadType === "company" && (
                <>
                  <FormField
                    control={form.control}
                    name="lead_name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <RequiredLabel>Lead Name</RequiredLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter lead name"
                            {...field}
                            disabled={isSubmitting}
                            className={formInputClassName}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <RequiredLabel>Designation</RequiredLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter designation"
                            {...field}
                            disabled={isSubmitting}
                            className={formInputClassName}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="current_staying"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">Current Staying</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter current staying"
                        {...field}
                        disabled={isSubmitting}
                        className={formInputClassName}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />              

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <RequiredLabel>Prepared Location</RequiredLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Prepared Location"
                        {...field}
                        disabled={isSubmitting}
                        className={formInputClassName}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem className="w-full space-y-2">
                    <RequiredLabel>Customer Type</RequiredLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting || isLoadingOptions}
                    >
                      <FormControl>
                        <SelectTrigger size="form" className={formSelectTriggerClassName}>
                          <SelectValue
                            placeholder={
                              isLoadingOptions ? "Loading customer types..." : "Select customer type"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <FormSelectContent>
                        {customerTypeOptions.map((option) => (
                          <FormSelectItem
                            key={option.value}
                            value={option.value}
                            className="whitespace-normal leading-snug"
                          >
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
                name="customer_requirement"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <RequiredLabel>Interested In</RequiredLabel>
                    <FormControl>
                      <MultiSelect
                        options={customerRequirementOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder={
                          isLoadingOptions
                            ? "Loading interested in..."
                            : "Select interested in"
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <RequiredLabel>Phone No</RequiredLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number"
                        {...field}
                        disabled={isSubmitting}
                        className={formInputClassName}
                        onChange={(e) => {
                          const value = e.target.value
                          const phoneRegex = /^[0-9\s\-\(\)\+]*$/
                          if (phoneRegex.test(value) || value === "") {
                            field.onChange(value)
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter email"
                        {...field}
                        disabled={isSubmitting}
                        className={formInputClassName}
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
                  <FormItem className="space-y-2">
                    <RequiredLabel>Description</RequiredLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Specify Interested In"
                        disabled={isSubmitting}
                        className={formTextareaClassName}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pb-4" />
            </form>
          </Form>
        </div>

        <div className="shrink-0 border-t bg-background p-4 flex flex-row-reverse gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <Button type="submit" form="lead-form" className={footerButtonClass} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={footerButtonClass}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
