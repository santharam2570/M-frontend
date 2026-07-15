"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  sheetFormContentClassName,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage } from "@/lib/api"
import {
  fetchBranches,
  getOrgIdFromAuth,
  getStoredAuthUser,
} from "@/lib/auth"
import {
  formInputClassName,
  formModalFooterButtonClassName,
  formModalFooterClassName,
  formSelectTriggerClassName,
  formTextareaClassName,
} from "@/lib/form-field-styles"
import { updateAgentApi } from "@/lib/agents/agent-api"
import { fetchProjectList } from "@/lib/projects/project-api"
import { EMPTY_PROJECT_FILTERS } from "@/lib/projects/types"
import {
  AGENT_TYPE_LABELS,
  type Agent,
  type AgentFormPayload,
  type AgentType,
} from "@/lib/agents/types"

const agentFormSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long"),
  agent_type: z.enum(["internal", "external", "channel_partner"]),
  rera_number: z.string().optional(),
  commission_rate: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  branch_id: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  pan_number: z.string().optional(),
  agency_name: z.string().optional(),
  assigned_project_ids: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <FormLabel className="text-sm font-medium text-foreground">
      {children} <span className="text-destructive">*</span>
    </FormLabel>
  )
}

interface AgentFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent?: Agent | null
  onSuccess?: () => void
}

export function AgentFormDrawer({
  open,
  onOpenChange,
  agent,
  onSuccess,
}: AgentFormDrawerProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])
  const [projectOptions, setProjectOptions] = useState<Array<{ value: string; label: string }>>([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      agent_type: "internal",
      rera_number: "",
      commission_rate: "",
      branch_id: "",
      status: "active",
      address: "",
      city: "",
      state: "",
      pincode: "",
      pan_number: "",
      agency_name: "",
      assigned_project_ids: [],
      notes: "",
    },
  })

  useEffect(() => {
    if (!open) return

    const loadOptions = async () => {
      setIsLoadingOptions(true)
      try {
        const orgId = getOrgIdFromAuth(getStoredAuthUser())
        const stored = getStoredAuthUser()
        const token = stored?.access_token as string | undefined

        const [branches, projectResult] = await Promise.all([
          orgId ? fetchBranches(orgId, token).catch(() => []) : Promise.resolve([]),
          fetchProjectList({ search: "", filters: EMPTY_PROJECT_FILTERS }).catch(
            () => ({ projects: [], total: 0 }),
          ),
        ])

        setBranchOptions(
          branches
            .filter((branch) => branch.status === "active")
            .map((branch) => ({ value: branch.id, label: branch.name })),
        )
        setProjectOptions(
          projectResult.projects.map((project) => ({
            value: project._id,
            label: project.name,
          })),
        )
      } catch {
        setBranchOptions([])
        setProjectOptions([])
      } finally {
        setIsLoadingOptions(false)
      }
    }

    void loadOptions()
  }, [open])

  useEffect(() => {
    if (!open) return

    if (agent) {
      form.reset({
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agent_type: agent.agent_type,
        rera_number: agent.rera_number ?? "",
        commission_rate: agent.commission_rate ?? "",
        branch_id: agent.branch_id ?? "",
        status: agent.status,
        address: agent.address ?? "",
        city: agent.city ?? "",
        state: agent.state ?? "",
        pincode: agent.pincode ?? "",
        pan_number: agent.pan_number ?? "",
        agency_name: agent.agency_name ?? "",
        assigned_project_ids: agent.assigned_project_ids ?? [],
        notes: agent.notes ?? "",
      })
      return
    }

    form.reset({
      name: "",
      email: "",
      phone: "",
      agent_type: "internal",
      rera_number: "",
      commission_rate: "",
      branch_id: "",
      status: "active",
      address: "",
      city: "",
      state: "",
      pincode: "",
      pan_number: "",
      agency_name: "",
      assigned_project_ids: [],
      notes: "",
    })
  }, [open, agent, form])

  const buildPayload = (values: AgentFormValues): AgentFormPayload => ({
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    agent_type: values.agent_type as AgentType,
    rera_number: values.rera_number?.trim() || undefined,
    commission_rate:
      values.commission_rate === "" || values.commission_rate == null
        ? undefined
        : Number(values.commission_rate),
    branch_id: values.branch_id || undefined,
    status: values.status,
    address: values.address?.trim() || undefined,
    city: values.city?.trim() || undefined,
    state: values.state?.trim() || undefined,
    pincode: values.pincode?.trim() || undefined,
    pan_number: values.pan_number?.trim() || undefined,
    agency_name: values.agency_name?.trim() || undefined,
    assigned_project_ids: values.assigned_project_ids ?? [],
    notes: values.notes?.trim() || undefined,
  })

  const handleSubmit = async (values: AgentFormValues) => {
    if (!agent) return

    setIsSaving(true)
    try {
      const payload = buildPayload(values)
      await updateAgentApi(agent._id, payload)
      toast({ title: "Agent updated", description: "Agent details saved successfully." })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to save agent."),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const agentType = useWatch({ control: form.control, name: "agent_type" })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={sheetFormContentClassName}>
        <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-12 text-left">
          <SheetTitle className="text-lg font-semibold">Edit Agent</SheetTitle>
          <SheetDescription>
            Update agent profile, commission, and assignment details.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <RequiredLabel>Full Name</RequiredLabel>
                      <FormControl>
                        <Input className={formInputClassName} placeholder="Enter agent name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>Email</RequiredLabel>
                        <FormControl>
                          <Input
                            className={formInputClassName}
                            type="email"
                            placeholder="agent@example.com"
                            {...field}
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
                      <FormItem>
                        <RequiredLabel>Phone</RequiredLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="+91 98765 43210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="agent_type"
                    render={({ field }) => (
                      <FormItem>
                        <RequiredLabel>Agent Type</RequiredLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={formSelectTriggerClassName}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <FormSelectContent>
                            {Object.entries(AGENT_TYPE_LABELS).map(([value, label]) => (
                              <FormSelectItem key={value} value={value}>
                                {label}
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
                        <RequiredLabel>Status</RequiredLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={formSelectTriggerClassName}>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <FormSelectContent>
                            <FormSelectItem value="active">Active</FormSelectItem>
                            <FormSelectItem value="inactive">Inactive</FormSelectItem>
                          </FormSelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {agentType !== "internal" ? (
                  <FormField
                    control={form.control}
                    name="agency_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agency / Firm Name</FormLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="Agency name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Professional Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="rera_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RERA Registration No.</FormLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="RERA number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="commission_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            className={formInputClassName}
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            placeholder="e.g. 2.5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="pan_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="ABCDE1234F" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="branch_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                          disabled={isLoadingOptions}
                        >
                          <FormControl>
                            <SelectTrigger className={formSelectTriggerClassName}>
                              <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                          </FormControl>
                          <FormSelectContent>
                            <FormSelectItem value="none">No branch</FormSelectItem>
                            {branchOptions.map((option) => (
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
                <FormField
                  control={form.control}
                  name="assigned_project_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Projects</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={projectOptions}
                          selected={field.value ?? []}
                          onChange={field.onChange}
                          placeholder={isLoadingOptions ? "Loading projects..." : "Select projects"}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Address</h3>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input className={formInputClassName} placeholder="Address line" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input className={formInputClassName} placeholder="600001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          className={formTextareaClassName}
                          placeholder="Additional notes about this agent..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className={formModalFooterClassName}>
              <Button
                type="submit"
                disabled={isSaving}
                className={formModalFooterButtonClassName}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className={formModalFooterButtonClassName}
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
