"use client"

import { useState, useEffect, type Dispatch, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { Check, MoreVertical, Pencil, Plus, Trash, Move, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AddStatusDialog } from "./add-status-dialog"
import { EditStatusDialog } from "./edit-status-dialog"
import { DeleteStatusAlert } from "./delete-status-alert"
import { GenericItemDialog } from "./generic-item-dialog"
import { DeleteItemAlert } from "./delete-item-alert"
import { CustomFieldDialog } from "./custom-field-dialog"
import {
  CustomerRequirementDialog,
  type CustomerRequirementData,
} from "./customer-requirement-dialog"
import { CustomerTypeDialog, type CustomerTypeData } from "./customer-type-dialog"
import URLS from "@/config/urls"
import { THEME_PRIMARY_COLOR } from "@/lib/form-field-styles"

// Status badge component for NOT QUALIFIED status
function StatusBadge({ name, isNotQualified, showFullDisplay = true }: { name: string; isNotQualified: boolean; showFullDisplay?: boolean }) {
  if (isNotQualified) {
    const baseClasses = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
    const colorClasses = "bg-orange-50 border-orange-200 text-orange-800"
    const badgeText = "NOT QUALIFIED"
    
    if (showFullDisplay) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{name}</span>
          <span className={`${baseClasses} ${colorClasses}`}>
            {badgeText}
          </span>
        </div>
      )
    } else {
      // For reorder sheet - just show the badge styling
      return (
        <span className={`${baseClasses} ${colorClasses}`}>
          {badgeText}
        </span>
      )
    }
  }
  
  return <span className="text-sm font-medium text-gray-900">{name}</span>
}

interface Item {
  id: string | number
  name: string
  color: string
  createdOn: string
  isDefault: boolean
  weightage?: number
  sort_order?: number
  not_qualified?: number
  fieldType?: string
  options?: { id: number; name: string; color: string }[]
  currency?: string
}

const STATUS_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  "dropdown-single": "Dropdown",
  "dropdown-multiple": "Multi-select",
  number: "Number",
  date: "Date",
}

const REQUIREMENT_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  "dropdown-single": "Dropdown",
  "dropdown-multiple": "Multiselect",
  date: "Date",
  number: "Number",
  checkbox: "Checkbox",
  money: "Money",
}

interface CustomField {
  id: number
  name: string
  type: string
  options?: { id: number; name: string; color: string }[]
  currency?: string
  createdOn: string
}

function resolveSettingId(item: {
  _id?: string | { $oid?: string }
  id?: string | number
}): string | number {
  if (item._id && typeof item._id === "object" && item._id.$oid) {
    return item._id.$oid
  }

  return (item._id ?? item.id ?? "") as string | number
}

function parseSettingInfo(info: unknown): Record<string, unknown> {
  if (!info) return {}
  if (typeof info === "object") return info as Record<string, unknown>
  if (typeof info !== "string" || !info.trim()) return {}

  try {
    const parsed = JSON.parse(info)
    return typeof parsed === "object" && parsed ? (parsed as Record<string, unknown>) : {}
  } catch {
    return { field_type: info }
  }
}

function buildLeadSettingsInfo(
  fieldType?: string,
  options?: { name: string; color: string }[],
  currency?: string,
) {
  const meta: Record<string, unknown> = {}
  if (fieldType) meta.field_type = fieldType
  if (options?.length) meta.options = options
  if (currency) meta.currency = currency
  return Object.keys(meta).length ? JSON.stringify(meta) : ""
}

function mapSettingOptions(
  item: Record<string, unknown>,
  info: Record<string, unknown>,
) {
  const rawOptions = (item.options ?? info.options) as
    | Array<{ _id?: string; id?: string | number; name: string; color?: string }>
    | undefined

  if (!Array.isArray(rawOptions)) return undefined

  return rawOptions.map((option, index) => ({
    id: option._id || option.id || index + 1,
    name: option.name,
    color: option.color || THEME_PRIMARY_COLOR,
  }))
}

function mapSimpleSettingItems(
  items: Record<string, unknown>[] | undefined,
  userDefaultId?: string,
): Item[] {
  return (items || []).map((item) => {
    const id = resolveSettingId(item as { _id?: string; id?: string | number })
    return {
      id,
      name: item.name as string,
      color: (item.color as string) || "#000000",
      isDefault: item.default === 1 || userDefaultId === String(id),
      createdOn: item.create_date as string,
    }
  })
}

function buildSimpleSettingPayload(
  type: string,
  data: { name: string; color: string },
  isDefault = 0,
) {
  return {
    name: data.name,
    color: data.color,
    type,
    default: isDefault,
    weightage: 0,
  }
}

// Sortable item component for the reorder sheet
function SortableStatusItem({
  id,
  name,
  color,
  isDefault,
  fieldType,
  not_qualified,
}: {
  id: string
  name: string
  color: string
  isDefault?: boolean
  fieldType?: string
  not_qualified?: number
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : 1,
    backgroundColor: isDragging ? "var(--slate-100)" : undefined,
    boxShadow: isDragging ? "0 2px 10px rgba(0, 0, 0, 0.1)" : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 border rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2 flex-1">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <StatusBadge 
          name={name} 
          isNotQualified={not_qualified === 1}
          showFullDisplay={false}
        />
        {isDefault && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">
            Default
          </span>
        )}
      </div>
      <span className="ml-3 text-xs text-muted-foreground">
        {STATUS_TYPE_LABELS[fieldType || "text"] ?? fieldType ?? "Text"}
      </span>
    </div>
  )
}

export function CustomerSettings() {
  const [activeTab, setActiveTab] = useState("statuses")
  const [statuses, setStatuses] = useState<Item[]>([])
  const [sources, setSources] = useState<Item[]>([])
  const [paymentTerms, setPaymentTerms] = useState<Item[]>([])
  const [customerTypes, setCustomerTypes] = useState<Item[]>([])
  const [customerRequirements, setCustomerRequirements] = useState<Item[]>([])
  const [notQualifiedReasons, setNotQualifiedReasons] = useState<Item[]>([])
  const [userDefaultSettings, setUserDefaultSettings] = useState<{
    statusId?: string;
    sourceId?: string;
    paymentTermsId?: string;
    customerTypeId?: string;
    customerRequirementId?: string;
    notQualifiedReasonId?: string;
    userId?: string;
  }>({});

  const { toast } = useToast()
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);


  useEffect(() => {
    const storedData = localStorage.getItem('map_user');
    if (storedData) {
      const userData = JSON.parse(storedData);
      console.log("userData1:", userData);
      if (userData) {
        setUserData(userData);
        
        // Load user-specific default settings
        const userId = userData?.id || userData?._id;
        const userDefaultSettingsStr = localStorage.getItem(`map_user_defaults_${userId}`);
        if (userDefaultSettingsStr) {
          try {
            const userDefaults = JSON.parse(userDefaultSettingsStr);
            setUserDefaultSettings(userDefaults);
          } catch (e) {
            console.error("Failed to parse user default settings", e);
          }
        }
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
  }, [router]);
  
  // Move fetchSettings outside of useEffect so it's accessible to handler functions
  const fetchSettings = async () => {
      const fetchDefaultStatus = async () => {
        const storedData = localStorage.getItem("map_user");
        if (!storedData) {
          console.error("No user data found in localStorage");
          router.push("/login");
          return null;
        }

        const userData = JSON.parse(storedData);
        const token = userData?.access_token;

        if (!token) {
          console.error("Access token is missing");
          router.push("/login");
          return null;
        }

        return token;
      };

      const token = await fetchDefaultStatus();
      if (!token) return; // Stop execution if token is invalid

      try {
        const response = await fetch(URLS.LEAD_SETTINGS_LIST, {
          headers: {
            Authorization: `Bearer ${token}`, // Include token in request if required
          },
        });

        const result = await response.json()

        if (response.ok && result.code === 200) {
          const data = result.data || {}

          const formattedStatuses = (data.lead_status || []).map((status: Record<string, unknown>) => {
            const info = parseSettingInfo(status.info)
            const statusId = resolveSettingId(status as { _id?: string; id?: string | number })
            let isDefault = false
            if (userDefaultSettings?.statusId) {
              isDefault = userDefaultSettings.statusId === String(statusId)
            } else {
              isDefault = status.default === 1
            }
            return {
              id: statusId,
              name: status.name as string,
              color: (status.color as string) || "#000000",
              fieldType:
                (status.field_type as string) ||
                (status.fieldType as string) ||
                (info.field_type as string) ||
                "text",
              options: mapSettingOptions(status, info),
              isDefault,
              createdOn: status.create_date as string,
              sort_order: (status.sort_order as number) || 0,
              not_qualified: (status.not_qualified as number) || 0,
            }
          })
          // Sort by sort_order
          const sortedStatuses = formattedStatuses.sort((a: Item, b: Item) => (a.sort_order || 0) - (b.sort_order || 0));
          setStatuses(sortedStatuses);

          setSources(mapSimpleSettingItems(data.source, userDefaultSettings?.sourceId))

          setPaymentTerms(
            mapSimpleSettingItems(
              data.payment_terms || data.payment_term,
              userDefaultSettings?.paymentTermsId,
            ),
          )

          setCustomerTypes(
            (data.customer_type || []).map((customerType: Record<string, unknown>) => {
              const info = parseSettingInfo(customerType.info)
              return {
                id: resolveSettingId(customerType as { _id?: string; id?: string | number }),
                name: customerType.name as string,
                color: (customerType.color as string) || "#000000",
                fieldType:
                  (customerType.field_type as string) ||
                  (customerType.fieldType as string) ||
                  (info.field_type as string) ||
                  "dropdown-single",
                options: mapSettingOptions(customerType, info),
                currency: (customerType.currency as string) || (info.currency as string),
                isDefault:
                  customerType.default === 1 ||
                  userDefaultSettings?.customerTypeId === customerType._id,
                createdOn: customerType.create_date as string,
              }
            }),
          )

          setCustomerRequirements(
            (data.customer_requirement || []).map((item: Record<string, unknown>) => {
              const info = parseSettingInfo(item.info)
              return {
                id: resolveSettingId(item as { _id?: string; id?: string | number }),
                name: item.name as string,
                color: (item.color as string) || "#000000",
                fieldType:
                  (item.field_type as string) ||
                  (item.fieldType as string) ||
                  (info.field_type as string) ||
                  "text",
                options: mapSettingOptions(item, info),
                currency: (item.currency as string) || (info.currency as string),
                isDefault:
                  item.default === 1 || userDefaultSettings?.customerRequirementId === item._id,
                createdOn: item.create_date as string,
              }
            }),
          )
          
          // Not Qualified Reasons
          const nqrArray =
            data?.not_qualified_reasons ||
            data?.not_qualified_reason ||
            (Array.isArray(data?.settings)
              ? data.settings.filter((s: any) => s.type === "not_qualified_reason")
              : []);
          const mappedNqr = Array.isArray(nqrArray)
            ? nqrArray.map((item: any) => ({
                id: item?._id?.$oid || item?._id,
                name: item?.name,
                color: item?.color || "#000000",
                isDefault: false, // Not Qualified Reasons do not have a default option concept
                createdOn: item?.create_date,
              }))
            : [];
          setNotQualifiedReasons(mappedNqr);
        } else {
          toast({
            title: "Error fetching data",
            description: result.msg || "Failed to fetch settings data.",
          })
        }
      } catch (error) {
        toast({
          title: "Error fetching data",
          description: "An unexpected error occurred while fetching settings data.",
        });
      }
    };

  // Call fetchSettings when component mounts or dependencies change
  useEffect(() => {
    fetchSettings();
  }, [router, toast]);



  const getAuthToken = async (): Promise<string | null> => {
    const storedData = localStorage.getItem("map_user")
    if (!storedData) {
      router.push("/login")
      return null
    }

    const parsed = JSON.parse(storedData)
    const token = parsed?.access_token

    if (!token) {
      router.push("/login")
      return null
    }

    return token
  }

  const handleAddSimpleSetting = async (
    type: string,
    data: { name: string; color: string },
    setItems: Dispatch<SetStateAction<Item[]>>,
    items: Item[],
    labels: { added: string; failed: string },
  ) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(URLS.ADD_LEAD_SETTINGS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildSimpleSettingPayload(type, data)),
      })

      const responseData = await response.json()

      if (response.ok && responseData.code === 200) {
        toast({
          title: labels.added,
          description: `"${data.name}" has been added successfully.`,
        })

        const created = responseData.data || {}
        const newItem: Item = {
          id: resolveSettingId(created) || items.length + 1,
          name: data.name,
          color: (created.color as string) || data.color,
          isDefault: false,
          createdOn: (created.create_date as string) || new Date().toLocaleDateString("en-GB"),
        }

        setItems([...items, newItem])
      } else {
        throw new Error(responseData.msg || labels.failed)
      }
    } catch (error) {
      console.error(`Error adding ${type}:`, error)
      toast({
        title: "Error",
        description: labels.failed,
        variant: "destructive",
      })
    }
  }

  const handleAddSource = async (data: { name: string; color: string }) => {
    await handleAddSimpleSetting("source", data, setSources, sources, {
      added: "Source added",
      failed: "Failed to add source. Please try again.",
    })
  }

  const handleAddPaymentTerm = async (data: { name: string; color: string }) => {
    await handleAddSimpleSetting("payment_terms", data, setPaymentTerms, paymentTerms, {
      added: "Payment term added",
      failed: "Failed to add payment term. Please try again.",
    })
  }

  // Not Qualified Reasons - Add
  const handleAddNotQualifiedReason = async (data: { name: string; color: string }) => {
    await handleAddSimpleSetting(
      "not_qualified_reason",
      { name: data.name, color: data.color || "#000000" },
      setNotQualifiedReasons,
      notQualifiedReasons,
      {
        added: "Reason added",
        failed: "Failed to add reason. Please try again.",
      },
    )
  }

  const handleEditNotQualifiedReason = (reason: Item) => {
    setEditingNqr(reason);
    setIsEditNqrDialogOpen(true);
  };

  const handleUpdateNotQualifiedReason = async (id: number | string, data: { name: string; color: string }) => {
    await handleUpdateSimpleSetting(
      "not_qualified_reason",
      String(id),
      { name: data.name, color: data.color || "#000000" },
      notQualifiedReasons,
      setNotQualifiedReasons,
      {
        updated: "Reason updated",
        failed: "Failed to update reason. Please try again.",
      },
    )
    setIsEditNqrDialogOpen(false)
  }

  const handleDeleteNotQualifiedReason = (reason: Item) => {
    setDeletingNqr(reason);
    setIsDeleteNqrAlertOpen(true);
  };

  const confirmDeleteNotQualifiedReason = async () => {
    await confirmDeleteSimpleSetting(
      deletingNqr,
      setNotQualifiedReasons,
      notQualifiedReasons,
      setDeletingNqr,
      setIsDeleteNqrAlertOpen,
      {
        deleted: "Reason deleted",
        failed: "Failed to delete reason. Please try again.",
      },
    )
  }

  const handleSetDefaultNotQualifiedReason = async (id: string) => {
    await handleSetDefaultSimpleSetting("not_qualified_reason", id, "notQualifiedReason", {
      success: "Default reason updated",
      failed: "Failed to set default reason. Please try again.",
    })
  }

  const buildCustomerTypePayload = (data: CustomerTypeData, isDefault = 0) => {
    const optionSource =
      data.options ||
      data.multiselectValues?.map((option, index) => ({
        id: index + 1,
        name: option.name,
        color: option.color,
      }))

    return {
      name: data.name,
      color: data.color || "#E2E8F0",
      type: "customer_type",
      default: isDefault,
      weightage: 0,
      info: buildLeadSettingsInfo(
        data.type,
        optionSource?.map((option) => ({
          name: option.name,
          color: option.color,
        })),
      ),
    }
  }

  const toCustomerTypeDialogData = (item: Item): CustomerTypeData => ({
    name: item.name,
    color: item.color || "#E2E8F0",
    type: item.fieldType || "text",
    options: item.options?.map((option) => ({
      id: typeof option.id === "number" ? option.id : Number(option.id) || Date.now(),
      name: option.name,
      color: option.color,
    })),
  });

  const handleAddCustomerType = async (data: CustomerTypeData) => {
    const storedData = localStorage.getItem("map_user");
    if (!storedData) {
      console.error("No user data found in localStorage");
      router.push("/login");
      return;
    }

    const userData = JSON.parse(storedData);
    const token = userData?.access_token;

    if (!token) {
      console.error("Access token is missing");
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(URLS.ADD_LEAD_SETTINGS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildCustomerTypePayload(data)),
      })

      const responseData = await response.json()

      if (response.ok && responseData.code === 200) {
        toast({
          title: "Customer Type Added",
          description: `The customer type "${data.name}" has been added successfully.`,
        })

        const created = responseData.data || {}
        const newCustomerType: Item = {
          id: resolveSettingId(created) || customerTypes.length + 1,
          name: data.name,
          color: (created.color as string) || data.color,
          fieldType: data.type,
          options: data.options?.map((option) => ({
            id: option.id,
            name: option.name,
            color: option.color,
          })),
          isDefault: false,
          createdOn: (created.create_date as string) || new Date().toLocaleDateString("en-GB"),
        }

        setCustomerTypes([...customerTypes, newCustomerType])
      } else {
        throw new Error(responseData.msg || "Failed to add customer type")
      }
    } catch (error) {
      console.error("Error adding customer type:", error);
      toast({
        title: "Error",
        description: "Failed to add customer type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const buildCustomerRequirementPayload = (data: CustomerRequirementData, isDefault = 0) => ({
    name: data.name,
    color: data.color || "#E2E8F0",
    type: "customer_requirement",
    default: isDefault,
    weightage: 0,
    info: buildLeadSettingsInfo(data.type || "text"),
  })

  const handleAddCustomerRequirement = async (data: CustomerRequirementData) => {
    const storedData = localStorage.getItem("map_user");
    if (!storedData) {
      console.error("No user data found in localStorage");
      router.push("/login");
      return;
    }

    const userData = JSON.parse(storedData);
    const token = userData?.access_token;

    if (!token) {
      console.error("Access token is missing");
      router.push("/login");
      return;
    }

    try {
      const response = await fetch(URLS.ADD_LEAD_SETTINGS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildCustomerRequirementPayload(data)),
      })

      const responseData = await response.json()

      if (response.ok && responseData.code === 200) {
        toast({
          title: "Interested In Added",
          description: `The Interested In "${data.name}" has been added successfully.`,
        })

        const created = responseData.data || {}
        const newCustomerRequirement: Item = {
          id: resolveSettingId(created) || customerRequirements.length + 1,
          name: data.name,
          color: (created.color as string) || data.color,
          fieldType: data.type || "text",
          isDefault: false,
          createdOn: (created.create_date as string) || new Date().toLocaleDateString("en-GB"),
        }

        setCustomerRequirements([...customerRequirements, newCustomerRequirement])
      } else {
        throw new Error(responseData.msg || "Failed to Add Interested In")
      }
    } catch (error) {
      console.error("Error adding Interested In:", error);
      toast({
        title: "Error",
        description: "Failed to Add Interested In. Please try again.",
        variant: "destructive",
      });
    }
  };

  // EDIT

  const handleUpdateSimpleSetting = async (
    type: string,
    id: string,
    data: { name: string; color: string },
    items: Item[],
    setItems: Dispatch<SetStateAction<Item[]>>,
    labels: { updated: string; failed: string },
  ) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const payload = buildSimpleSettingPayload(
        type,
        data,
        items.find((item) => String(item.id) === id)?.isDefault ? 1 : 0,
      )

      const response = await fetch(`${URLS.UPDATE_LEAD_SETTINGS}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        setItems((prev) =>
          prev.map((item) =>
            String(item.id) === id ? { ...item, name: data.name, color: data.color } : item,
          ),
        )

        toast({
          title: labels.updated,
          description: `"${data.name}" has been updated successfully.`,
        })
      } else {
        throw new Error(result.msg || labels.failed)
      }
    } catch (error) {
      console.error(`Error updating ${type}:`, error)
      toast({
        title: "Error",
        description: labels.failed,
        variant: "destructive",
      })
    }
  }

  const handleUpdateSource = async (id: string, data: { name: string; color: string }) => {
    await handleUpdateSimpleSetting("source", id, data, sources, setSources, {
      updated: "Source updated",
      failed: "Failed to update source. Please try again.",
    })
  }

  const handleUpdatePaymentTerm = async (id: string, data: { name: string; color: string }) => {
    await handleUpdateSimpleSetting("payment_terms", id, data, paymentTerms, setPaymentTerms, {
      updated: "Payment term updated",
      failed: "Failed to update payment term. Please try again.",
    })
  }

  // Status state
  const [editingStatus, setEditingStatus] = useState<Item | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deletingStatus, setDeletingStatus] = useState<Item | null>(null)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)

  // Source state
  const [isAddSourceDialogOpen, setIsAddSourceDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<Item | null>(null)
  const [isEditSourceDialogOpen, setIsEditSourceDialogOpen] = useState(false)
  const [deletingSource, setDeletingSource] = useState<Item | null>(null)
  const [isDeleteSourceAlertOpen, setIsDeleteSourceAlertOpen] = useState(false)

  // Payment Terms state
  const [isAddPaymentTermDialogOpen, setIsAddPaymentTermDialogOpen] = useState(false)
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<Item | null>(null)
  const [isEditPaymentTermDialogOpen, setIsEditPaymentTermDialogOpen] = useState(false)
  const [deletingPaymentTerm, setDeletingPaymentTerm] = useState<Item | null>(null)
  const [isDeletePaymentTermAlertOpen, setIsDeletePaymentTermAlertOpen] = useState(false)

  // Customer Type state
  const [isAddCustomerTypeDialogOpen, setIsAddCustomerTypeDialogOpen] = useState(false)
  const [editingCustomerType, setEditingCustomerType] = useState<Item | null>(null)
  const [isEditCustomerTypeDialogOpen, setIsEditCustomerTypeDialogOpen] = useState(false)
  const [deletingCustomerType, setDeletingCustomerType] = useState<Item | null>(null)
  const [isDeleteCustomerTypeAlertOpen, setIsDeleteCustomerTypeAlertOpen] = useState(false)

  // Interested In state
  const [isAddCustomerRequirementDialogOpen, setIsAddCustomerRequirementDialogOpen] = useState(false)
  const [editingCustomerRequirement, setEditingCustomerRequirement] = useState<Item | null>(null)
  const [isEditCustomerRequirementDialogOpen, setIsEditCustomerRequirementDialogOpen] = useState(false)
  const [deletingCustomerRequirement, setDeletingCustomerRequirement] = useState<Item | null>(null)
  const [isDeleteCustomerRequirementAlertOpen, setIsDeleteCustomerRequirementAlertOpen] = useState(false)
  
  // Not Qualified Reasons state
  const [isAddNqrDialogOpen, setIsAddNqrDialogOpen] = useState(false)
  const [editingNqr, setEditingNqr] = useState<Item | null>(null)
  const [isEditNqrDialogOpen, setIsEditNqrDialogOpen] = useState(false)
  const [deletingNqr, setDeletingNqr] = useState<Item | null>(null)
  const [isDeleteNqrAlertOpen, setIsDeleteNqrAlertOpen] = useState(false)

  // Reorder state for statuses
  const [isReorderSheetOpen, setIsReorderSheetOpen] = useState(false)
  const [reorderStatuses, setReorderStatuses] = useState<Item[]>([])

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  

  // Helper function to update user default settings
  const updateUserDefaultSetting = (
    type: 'status' | 'source' | 'paymentTerms' | 'customerType' | 'customerRequirement' | 'notQualifiedReason',
    id: string,
  ) => {
    if (!userData) return;
    
    // Safely access the user ID
    const userId = userData?.id || userData?._id;
    if (!userId) return;
    
    const newDefaults = {
      ...userDefaultSettings,
      userId,
    };
    
    if (type === 'status') {
      newDefaults.statusId = id;
    } else if (type === 'source') {
      newDefaults.sourceId = id;
    } else if (type === 'paymentTerms') {
      newDefaults.paymentTermsId = id;
    } else if (type === 'customerType') {
      newDefaults.customerTypeId = id;
    } else if (type === 'customerRequirement') {
      newDefaults.customerRequirementId = id;
    } else if (type === 'notQualifiedReason') {
      newDefaults.notQualifiedReasonId = id;
    }
    
    localStorage.setItem(`map_user_defaults_${userId}`, JSON.stringify(newDefaults));
    setUserDefaultSettings(newDefaults);
  };

  // Status handlers
  const handleSetDefault = async (id: string) => {
    try {
      const storedData = localStorage.getItem("map_user");
      if (!storedData) {
        console.error("No user data found in localStorage");
        router.push("/login");
        return;
      }

      const userData = JSON.parse(storedData);
      const token = userData?.access_token;

      if (!token) {
        console.error("Access token is missing");
        router.push("/login");
        return;
      }

      const response = await fetch(`${URLS.LEAD_SETTINGS_DEFAULT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "lead_status",
        }),
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        // Update user's personal default setting
        updateUserDefaultSetting('status', id);
        
        // Immediately update the UI without waiting for fetchSettings
        setStatuses(prevStatuses => 
          prevStatuses.map(status => ({
            ...status,
            isDefault: String(status.id) === id
          }))
        );
        
        // Still call fetchSettings to ensure everything is in sync
        fetchSettings();

        toast({
          title: "Default status updated",
          description: "The default status has been updated successfully.",
        });
      } else {
        throw new Error(data.msg || "Failed to set default status");
      }
    } catch (error) {
      console.error("Error setting default status:", error);
      toast({
        title: "Error",
        description: "Failed to set default status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetDefaultSimpleSetting = async (
    type: string,
    id: string,
    defaultKey: 'source' | 'paymentTerms' | 'notQualifiedReason',
    labels: { success: string; failed: string },
  ) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${URLS.LEAD_SETTINGS_DEFAULT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        updateUserDefaultSetting(defaultKey, id)
        fetchSettings()

        toast({
          title: labels.success,
          description: "The default has been updated successfully.",
        })
      } else {
        throw new Error(data.msg || labels.failed)
      }
    } catch (error) {
      console.error(`Error setting default ${type}:`, error)
      toast({
        title: "Error",
        description: labels.failed,
        variant: "destructive",
      })
    }
  }

  const handleSetDefaultSource = async (id: string) => {
    await handleSetDefaultSimpleSetting("source", id, "source", {
      success: "Default source updated",
      failed: "Failed to set default source. Please try again.",
    })
  }

  const handleSetDefaultPaymentTerm = async (id: string) => {
    await handleSetDefaultSimpleSetting("payment_terms", id, "paymentTerms", {
      success: "Default payment term updated",
      failed: "Failed to set default payment term. Please try again.",
    })
  }

  // Customer Type handlers
  const handleSetDefaultCustomerType = async (id: string) => {
    try {
      const storedData = localStorage.getItem("map_user");
      if (!storedData) {
        console.error("No user data found in localStorage");
        router.push("/login");
        return;
      }

      const userData = JSON.parse(storedData);
      const token = userData?.access_token;

      if (!token) {
        console.error("Access token is missing");
        router.push("/login");  
        return;
      }

      const response = await fetch(`${URLS.LEAD_SETTINGS_DEFAULT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "customer_type",
        }),
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        // Update user's personal default setting for customer type
        updateUserDefaultSetting('customerType', id);
        fetchSettings(); // Refresh data from the API

        toast({
          title: "Default customer type updated",
          description: "The customer type has been set as default successfully.",
        });
      } else {
        throw new Error(data.msg || "Failed to set default customer type");
      }
    } catch (error) {
      console.error("Error setting default customer type:", error);
      toast({
        title: "Error",
        description: "Failed to set default customer type. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetDefaultCustomerRequirement = async (id: string) => {
    try {
      const storedData = localStorage.getItem("map_user");
      if (!storedData) {
        console.error("No user data found in localStorage");
        router.push("/login");
        return;
      }

      const userData = JSON.parse(storedData);
      const token = userData?.access_token;

      if (!token) {
        console.error("Access token is missing");
        router.push("/login");
        return;
      }

      const response = await fetch(`${URLS.LEAD_SETTINGS_DEFAULT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "customer_requirement",
        }),
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        updateUserDefaultSetting("customerRequirement", id);
        fetchSettings();

        toast({
          title: "Default Interested In updated",
          description: "The Interested In has been set as default successfully.",
        });
      } else {
        throw new Error(data.msg || "Failed to set default Interested In");
      }
    } catch (error) {
      console.error("Error setting default Interested In:", error);
      toast({
        title: "Error",
        description: "Failed to set default Interested In. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStatus = (status: Item) => {
    // Prevent opening delete dialog for NOT QUALIFIED statuses
    if (status.not_qualified === 1) {
      toast({
        title: "Cannot delete status",
        description: "NOT QUALIFIED statuses cannot be deleted.",
        variant: "destructive",
      });
      return;
    }
    
    setDeletingStatus(status)
    setIsDeleteAlertOpen(true)
  }

  const confirmDeleteStatus = async () => {
    if (!deletingStatus) return;

    // Prevent deletion of NOT QUALIFIED statuses
    if (deletingStatus.not_qualified === 1) {
      toast({
        title: "Cannot delete status",
        description: "NOT QUALIFIED statuses cannot be deleted.",
        variant: "destructive",
      });
      setDeletingStatus(null);
      setIsDeleteAlertOpen(false);
      return;
    }

    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        console.error("No user data found in localStorage")
        router.push("/login")
        return
      }
  
      const userData = JSON.parse(storedData)
      const token = userData?.access_token
  
      if (!token) {
        console.error("Access token is missing")
        router.push("/login")
        return
      }
  
      const response = await fetch(`${URLS.DELETE_LEAD_SETTINGS}/${deletingStatus.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        setStatuses(statuses.filter((status) => status.id !== deletingStatus.id))
        toast({
          title: "Status deleted",
          description: `The status "${deletingStatus.name}" has been deleted successfully.`,
        })
      } else {
        throw new Error(data.msg || "Failed to delete status")
      }
    } catch (error) {
      console.error("Error deleting status:", error)
    } finally {
      setDeletingStatus(null)
      setIsDeleteAlertOpen(false)
    }
  }

  const handleEditStatus = (status: Item) => {
    setEditingStatus(status)
    setIsEditDialogOpen(true)
  }

  const handleUpdateStatus = (
    id: string | number,
    data: {
      name: string
      color: string
      fieldType?: string
      options?: { name: string; color: string }[]
    },
  ) => {
    setStatuses(
      statuses.map((status) =>
        status.id === id
          ? {
              ...status,
              name: data.name,
              color: data.color,
              ...(data.fieldType ? { fieldType: data.fieldType } : {}),
              ...(data.options
                ? {
                    options: data.options.map((option, index) => ({
                      id: Date.now() + index,
                      name: option.name,
                      color: option.color,
                    })),
                  }
                : {}),
            }
          : status,
      ),
    )
  }

  const handleAddStatus = (data: {
    id: string | number
    name: string
    color: string
    fieldType: string
  }) => {
    setStatuses((prevStatuses) => [
      ...prevStatuses,
      {
        id: typeof data.id === "number" ? data.id : Number(data.id),
        name: data.name,
        color: data.color,
        fieldType: data.fieldType,
        isDefault: false,
        createdOn: new Date().toLocaleDateString("en-GB"),
        sort_order: prevStatuses.length + 1,
        not_qualified: 0,
      },
    ])
  }

  // Source handlers
  // Removed duplicate handleAddSource function to avoid redeclaration error

  const handleEditSource = (source: Item) => {
    setEditingSource(source)
    setIsEditSourceDialogOpen(true)
  }

  // const handleUpdateSource = async (id: number, data: { name: string; color: string }) => {
  //   try {
  //     const storedData = localStorage.getItem("map_user")
  //     if (!storedData) {
  //       console.error("No user data found in localStorage")
  //       router.push("/login")
  //       return
  //     }
  
  //     const userData = JSON.parse(storedData)
  //     const token = userData?.access_token
  
  //     if (!token) {
  //       console.error("Access token is missing")
  //       router.push("/login")
  //       return
  //     }
  
  //     const payload = {
  //       name: data.name,
  //       color: data.color,
  //       type: "source", // Add the type parameter
  //     }
  
  //     const response = await fetch(`${URLS.SALES_MODULE_ALL_SETTINGS_UPDATE}/${id}`, {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify(payload),
  //     })
  
  //     if (response.ok) {
  //       setSources(
  //         sources.map((source) => (source.id === id ? { ...source, name: data.name, color: data.color } : source)),
  //       )
  
  //       toast({
  //         title: "Source updated",
  //         description: `The source has been updated to "${data.name}" successfully.`,
  //       })
  //     } else {
  //       const errorData = await response.json()
  //       console.error("Failed to update source:", errorData)
  //     }
  //   } catch (error) {
  //     console.error("Error updating source:", error)
  //   }
  // }

  const confirmDeleteSimpleSetting = async (
    item: Item | null,
    setItems: Dispatch<SetStateAction<Item[]>>,
    items: Item[],
    setDeleting: (item: Item | null) => void,
    setAlertOpen: (open: boolean) => void,
    labels: { deleted: string; failed: string },
  ) => {
    if (!item) return

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${URLS.DELETE_LEAD_SETTINGS}/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        setItems(items.filter((entry) => entry.id !== item.id))
        toast({
          title: labels.deleted,
          description: `"${item.name}" has been deleted successfully.`,
        })
      } else {
        throw new Error(data.msg || labels.failed)
      }
    } catch (error) {
      console.error("Error deleting setting:", error)
      toast({
        title: "Error",
        description: labels.failed,
        variant: "destructive",
      })
    } finally {
      setDeleting(null)
      setAlertOpen(false)
    }
  }

  const handleDeleteSource = (source: Item) => {
    setDeletingSource(source)
    setIsDeleteSourceAlertOpen(true)
  }

  const confirmDeleteSource = async () => {
    await confirmDeleteSimpleSetting(
      deletingSource,
      setSources,
      sources,
      setDeletingSource,
      setIsDeleteSourceAlertOpen,
      {
        deleted: "Source deleted",
        failed: "Failed to delete source. Please try again.",
      },
    )
  }

  const handleDeletePaymentTerm = (paymentTerm: Item) => {
    setDeletingPaymentTerm(paymentTerm)
    setIsDeletePaymentTermAlertOpen(true)
  }

  const confirmDeletePaymentTerm = async () => {
    await confirmDeleteSimpleSetting(
      deletingPaymentTerm,
      setPaymentTerms,
      paymentTerms,
      setDeletingPaymentTerm,
      setIsDeletePaymentTermAlertOpen,
      {
        deleted: "Payment term deleted",
        failed: "Failed to delete payment term. Please try again.",
      },
    )
  }


  const handleEditPaymentTerm = (paymentTerm: Item) => {
    setEditingPaymentTerm(paymentTerm)
    setIsEditPaymentTermDialogOpen(true)
  }

  const handleEditCustomerType = (customerType: Item) => {
    setEditingCustomerType(customerType)
    setIsEditCustomerTypeDialogOpen(true)
  }

  const handleUpdateCustomerType = async (id: string | number, data: CustomerTypeData) => {
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        console.error("No user data found in localStorage")
        router.push("/login")
        return
      }

      const userData = JSON.parse(storedData)
      const token = userData?.access_token

      if (!token) {
        console.error("Access token is missing")
        router.push("/login")
        return
      }

      const payload = buildCustomerTypePayload(
        data,
        customerTypes.find((item) => item.id === id)?.isDefault ? 1 : 0,
      )

      const response = await fetch(`${URLS.UPDATE_LEAD_SETTINGS}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        setCustomerTypes(
          customerTypes.map((customerType) =>
            customerType.id === id
              ? {
                  ...customerType,
                  name: data.name,
                  color: data.color,
                  fieldType: data.type,
                  options: data.options?.map((option) => ({
                    id: option.id,
                    name: option.name,
                    color: option.color,
                  })),
                }
              : customerType,
          ),
        )

        toast({
          title: "Customer Type updated",
          description: `The customer type has been updated to "${data.name}" successfully.`,
        })
      } else {
        throw new Error(result.msg || "Failed to update customer type")
      }
    } catch (error) {
      console.error("Error updating customer type:", error)
      toast({
        title: "Error",
        description: "Failed to update customer type. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCustomerType = (customerType: Item) => {
    setDeletingCustomerType(customerType)
    setIsDeleteCustomerTypeAlertOpen(true)
  }

  const confirmDeleteCustomerType = async () => {
    if (deletingCustomerType) {
      try {
        const storedData = localStorage.getItem("map_user")
        if (!storedData) {
          console.error("No user data found in localStorage")
          router.push("/login")
          return
        }

        const userData = JSON.parse(storedData)
        const token = userData?.access_token

        if (!token) {
          console.error("Access token is missing")
          router.push("/login")
          return
        }

        const response = await fetch(`${URLS.DELETE_LEAD_SETTINGS}/${deletingCustomerType.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()

        if (response.ok && data.code === 200) {
          setCustomerTypes(customerTypes.filter((customerType) => customerType.id !== deletingCustomerType.id))
          toast({
            title: "Customer Type deleted",
            description: `The customer type "${deletingCustomerType.name}" has been deleted successfully.`,
          })
        } else {
          throw new Error(data.msg || "Failed to delete customer type")
        }
      } catch (error) {
        console.error("Error deleting customer type:", error)
        toast({
          title: "Error",
          description: "Failed to delete customer type. Please try again.",
          variant: "destructive",
        })
      } finally {
        setDeletingCustomerType(null)
        setIsDeleteCustomerTypeAlertOpen(false)
      }
    }
  }

  const handleEditCustomerRequirement = (customerRequirement: Item) => {
    setEditingCustomerRequirement(customerRequirement)
    setIsEditCustomerRequirementDialogOpen(true)
  }

  const handleUpdateCustomerRequirement = async (id: string | number, data: CustomerRequirementData) => {
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        console.error("No user data found in localStorage")
        router.push("/login")
        return
      }

      const userData = JSON.parse(storedData)
      const token = userData?.access_token

      if (!token) {
        console.error("Access token is missing")
        router.push("/login")
        return
      }

      const payload = buildCustomerRequirementPayload(
        data,
        customerRequirements.find((item) => item.id === id)?.isDefault ? 1 : 0,
      )

      const response = await fetch(`${URLS.UPDATE_LEAD_SETTINGS}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        setCustomerRequirements(
          customerRequirements.map((customerRequirement) =>
            customerRequirement.id === id
              ? {
                  ...customerRequirement,
                  name: data.name,
                  color: data.color,
                  fieldType: data.type || "text",
                }
              : customerRequirement,
          ),
        )

        toast({
          title: "Interested In updated",
          description: `The Interested In has been updated to "${data.name}" successfully.`,
        })
      } else {
        throw new Error(result.msg || "Failed to update Interested In")
      }
    } catch (error) {
      console.error("Error updating Interested In:", error)
      toast({
        title: "Error",
        description: "Failed to update Interested In. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCustomerRequirement = (customerRequirement: Item) => {
    setDeletingCustomerRequirement(customerRequirement)
    setIsDeleteCustomerRequirementAlertOpen(true)
  }

  const confirmDeleteCustomerRequirement = async () => {
    if (deletingCustomerRequirement) {
      try {
        const storedData = localStorage.getItem("map_user")
        if (!storedData) {
          console.error("No user data found in localStorage")
          router.push("/login")
          return
        }

        const userData = JSON.parse(storedData)
        const token = userData?.access_token

        if (!token) {
          console.error("Access token is missing")
          router.push("/login")
          return
        }

        const response = await fetch(`${URLS.DELETE_LEAD_SETTINGS}/${deletingCustomerRequirement.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        const data = await response.json()

        if (response.ok && data.code === 200) {
          setCustomerRequirements(
            customerRequirements.filter(
              (customerRequirement) => customerRequirement.id !== deletingCustomerRequirement.id,
            ),
          )
          toast({
            title: "Interested In deleted",
            description: `The Interested In "${deletingCustomerRequirement.name}" has been deleted successfully.`,
          })
        } else {
          throw new Error(data.msg || "Failed to delete Interested In")
        }
      } catch (error) {
        console.error("Error deleting Interested In:", error)
        toast({
          title: "Error",
          description: "Failed to delete Interested In. Please try again.",
          variant: "destructive",
        })
      } finally {
        setDeletingCustomerRequirement(null)
        setIsDeleteCustomerRequirementAlertOpen(false)
      }
    }
  }

  // Reorder functions
  const handleOpenReorderSheet = () => {
    setReorderStatuses([...statuses])
    setIsReorderSheetOpen(true)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = reorderStatuses.findIndex((item) => String(item.id) === active.id)
      const newIndex = reorderStatuses.findIndex((item) => String(item.id) === over.id)
      const newOrder = arrayMove(reorderStatuses, oldIndex, newIndex)
      setReorderStatuses(newOrder)
    }
  }

  const handleSaveReorder = async () => {
    try {
      const storedData = localStorage.getItem("map_user")
      if (!storedData) {
        console.error("No user data found in localStorage")
        router.push("/login")
        return
      }

      const userData = JSON.parse(storedData)
      const token = userData?.access_token

      if (!token) {
        console.error("Access token is missing")
        router.push("/login")
        return
      }

      // Prepare status_items array with id and sort_order
      const status_items = reorderStatuses.map((item, index) => ({
        id: String(item.id),
        sort_order: index + 1,
      }))

      // Send batch update request
      const response = await fetch(URLS.REORDER_STATUS_SETTINGS, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status_items: status_items,
          type: "status",
        }),
      })

      const result = await response.json()

      if (result.code === 200) {
        // Update local state with new order
        const updatedStatuses = reorderStatuses.map((item, index) => ({
          ...item,
          sort_order: index + 1,
        }))
        setStatuses(updatedStatuses)

        toast({
          title: "Order updated",
          description: "The status order has been updated successfully.",
        })

        setIsReorderSheetOpen(false)
      } else {
        throw new Error(result.msg || "Failed to update status order")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      toast({
        title: "Error",
        description: "Failed to update status order. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <h1 className="text-xl font-semibold text-gray-800">Lead</h1>
      <Card className="border-none shadow-sm">
        <CardContent>
        <Tabs defaultValue="statuses" className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="statuses" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Statuses
              </TabsTrigger>
              <TabsTrigger value="source" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Source
              </TabsTrigger>
              <TabsTrigger value="payment-terms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Payment Terms
              </TabsTrigger>
              <TabsTrigger value="customer-type" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Customer Type
              </TabsTrigger>
              <TabsTrigger value="customer-requirement" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Interested In
              </TabsTrigger>
              {/* <TabsTrigger value="not-qualified-reasons" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Not Qualified Reasons
              </TabsTrigger> */}
            </TabsList>

            {/* Conditional Add Button based on active tab */}
            {activeTab === "statuses" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-sm h-8 px-3"
                  onClick={handleOpenReorderSheet}
                >
                  <Move className="mr-1.5 h-3.5 w-3.5" /> Reorder
                </Button>
                <AddStatusDialog onSave={handleAddStatus} />
              </div>
            )}

            {activeTab === "source" && (
              <Button
                size="sm"
                className="text-sm h-8 px-3"
                onClick={() => setIsAddSourceDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Source
              </Button>
            )}

            {activeTab === "payment-terms" && (
              <Button
                size="sm"
                className="text-sm h-8 px-3"
                onClick={() => setIsAddPaymentTermDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Payment Term
              </Button>
            )}

            {activeTab === "customer-type" && (
              <Button
                size="sm"
                className="text-sm h-8 px-3"
                onClick={() => setIsAddCustomerTypeDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Customer Type
              </Button>
            )}

            {activeTab === "customer-requirement" && (
              <Button
                size="sm"
                className="text-sm h-8 px-3"
                onClick={() => setIsAddCustomerRequirementDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Interested In
              </Button>
            )}

            {activeTab === "not-qualified-reasons" && (
              <Button
                size="sm"
                className="text-sm h-8 px-3"
                onClick={() => setIsAddNqrDialogOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Not Qualified Reason
              </Button>
            )}
 
            
          </div>

          {/* Statuses Tab Content */}
          <TabsContent value="statuses" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] text-left">Name</TableHead>
                  <TableHead className="w-[200px] text-left">Type</TableHead>
                  <TableHead className="w-[200px] text-left">Created On</TableHead>
                  <TableHead className="w-[100px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id} className="[&>td]:py-2">

                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <StatusBadge 
                          name={status.name} 
                          isNotQualified={status.not_qualified === 1} 
                        />
                        {(status.isDefault || userDefaultSettings.statusId === status.id.toString()) && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {STATUS_TYPE_LABELS[status.fieldType || "text"] ?? status.fieldType ?? "Text"}
                    </TableCell>

                    <TableCell>{status.createdOn}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditStatus(status)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>

                            {status.isDefault ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="px-2 py-1.5 text-sm opacity-50 flex items-center">
                                      <Check className="mr-2 h-4 w-4" />
                                      <span>Set as Default</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Already set as default</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleSetDefault(String(status.id))}>
                                <Check className="mr-2 h-4 w-4" />
                                <span>Set as Default</span>
                              </DropdownMenuItem>
                            )}

                            {status.isDefault || status.not_qualified === 1 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="px-2 py-1.5 text-sm opacity-50 flex items-center text-red-400">
                                      <Trash className="mr-2 h-4 w-4" />
                                      <span>Delete</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {status.isDefault 
                                        ? "Cannot delete default status" 
                                        : status.not_qualified === 1 
                                        ? "Cannot delete NOT QUALIFIED status" 
                                        : "Cannot delete this status"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteStatus(status)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Source Tab Content */}
          <TabsContent value="source" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] text-left">Name</TableHead>
                  <TableHead className="w-[200px] text-left">Created On</TableHead>
                  <TableHead className="w-[100px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.map((source) => (
                  <TableRow key={source.id} className="[&>td]:py-2">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }} />
                        <span>{source.name}</span>
                        {(source.isDefault || userDefaultSettings.sourceId === String(source.id)) && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{source.createdOn}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditSource(source)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>

                            {source.isDefault ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="px-2 py-1.5 text-sm opacity-50 flex items-center">
                                      <Check className="mr-2 h-4 w-4" />
                                      <span>Set as Default</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Already set as default</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleSetDefaultSource(String(source.id))}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                <span>Set as Default</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteSource(source)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Payment Terms Tab Content */}
          <TabsContent value="payment-terms" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] text-left">Name</TableHead>
                  <TableHead className="w-[200px] text-left">Created On</TableHead>
                  <TableHead className="w-[100px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No payment terms found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentTerms.map((paymentTerm) => (
                    <TableRow key={paymentTerm.id} className="[&>td]:py-2">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: paymentTerm.color }} />
                          <span>{paymentTerm.name}</span>
                          {(paymentTerm.isDefault || userDefaultSettings.paymentTermsId === String(paymentTerm.id)) && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{paymentTerm.createdOn}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditPaymentTerm(paymentTerm)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>

                              {paymentTerm.isDefault ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="px-2 py-1.5 text-sm opacity-50 flex items-center">
                                        <Check className="mr-2 h-4 w-4" />
                                        <span>Set as Default</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Already set as default</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => handleSetDefaultPaymentTerm(String(paymentTerm.id))}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  <span>Set as Default</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() => handleDeletePaymentTerm(paymentTerm)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Customer Type Tab Content */}
          <TabsContent value="customer-type" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] text-left">Name</TableHead>
                  <TableHead className="w-[200px] text-left">Type</TableHead>
                  <TableHead className="w-[200px] text-left">Created On</TableHead>
                  <TableHead className="w-[100px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No customer types found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                customerTypes.map((customerType) => (
                  <TableRow key={customerType.id} className="[&>td]:py-2">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customerType.color }} />
                        <span>{customerType.name}</span>
                        {(customerType.isDefault || userDefaultSettings.customerTypeId === String(customerType.id)) && (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Default
                          </span>
                        )}
                      </div>
                      {customerType.options && customerType.options.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {customerType.options.length} option{customerType.options.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {STATUS_TYPE_LABELS[customerType.fieldType || "text"] ??
                        REQUIREMENT_TYPE_LABELS[customerType.fieldType || "text"] ??
                        customerType.fieldType ??
                        "Text"}
                    </TableCell>
                    <TableCell>{customerType.createdOn}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleEditCustomerType(customerType)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>

                            {customerType.isDefault ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="px-2 py-1.5 text-sm opacity-50 flex items-center">
                                      <Check className="mr-2 h-4 w-4" />
                                      <span>Set as Default</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Already set as default</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleSetDefaultCustomerType(String(customerType.id))}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                <span>Set as Default</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteCustomerType(customerType)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Interested In Tab Content */}
          <TabsContent value="customer-requirement" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] text-left">Name</TableHead>
                  <TableHead className="w-[200px] text-left">Created On</TableHead>
                  <TableHead className="w-[100px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerRequirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No Interested Ins found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  customerRequirements.map((customerRequirement) => (
                    <TableRow key={customerRequirement.id} className="[&>td]:py-2">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: customerRequirement.color }}
                          />
                          <span>{customerRequirement.name}</span>
                          {(customerRequirement.isDefault ||
                            userDefaultSettings.customerRequirementId ===
                              String(customerRequirement.id)) && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              Default
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customerRequirement.createdOn}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleEditCustomerRequirement(customerRequirement)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>

                              {customerRequirement.isDefault ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="px-2 py-1.5 text-sm opacity-50 flex items-center">
                                        <Check className="mr-2 h-4 w-4" />
                                        <span>Set as Default</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Already set as default</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() =>
                                    handleSetDefaultCustomerRequirement(String(customerRequirement.id))
                                  }
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  <span>Set as Default</span>
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteCustomerRequirement(customerRequirement)}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Not Qualified Reasons Tab Content */}
          <TabsContent value="not-qualified-reasons" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px] text-left">Name</TableHead>
                  <TableHead className="w-[200px] text-left">Created On</TableHead>
                  <TableHead className="w-[100px] text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notQualifiedReasons.map((reason) => (
                  <TableRow key={reason.id} className="[&>td]:py-2">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{reason.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{reason.createdOn}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleEditNotQualifiedReason(reason)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteNotQualifiedReason(reason)}
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          
        </Tabs>
        </CardContent>
      </Card>

      {/* Status Dialogs */}
      {/* <EditStatusDialog
        status={editingStatus}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdate={handleUpdateStatus}
      /> */}

      <EditStatusDialog
        status={editingStatus}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdate={handleUpdateStatus} // Now this will call the API instead of just updating the state
      />
      <DeleteStatusAlert
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onDelete={confirmDeleteStatus} // Pass the updated confirmDeleteStatus function
        statusName={deletingStatus?.name || ""}
        statusId={String(deletingStatus?.id || "")} // Convert ID to string to match the expected type
      />

      {/* Source Dialogs */}
      <GenericItemDialog
        title="Add Source"
        open={isAddSourceDialogOpen}
        onOpenChange={setIsAddSourceDialogOpen}
        onSave={handleAddSource}
        nameLabel="Source Name"
        saveButtonLabel="Save"
      />
      <GenericItemDialog
        title="Edit Source"
        open={isEditSourceDialogOpen}
        onOpenChange={setIsEditSourceDialogOpen}
        onSave={(data) => handleUpdateSource(String(editingSource?.id || 0), data)}
        nameLabel="Source Name"
        saveButtonLabel="Update"
        initialData={editingSource ? { name: editingSource.name, color: editingSource.color } : undefined}
      />
      <DeleteItemAlert
        open={isDeleteSourceAlertOpen}
        onOpenChange={setIsDeleteSourceAlertOpen}
        itemName={deletingSource?.name || ""}
        itemType="Source"
        onDelete={confirmDeleteSource}
      />

      {/* Payment Terms Dialogs */}
      <GenericItemDialog
        title="Add Payment Term"
        open={isAddPaymentTermDialogOpen}
        onOpenChange={setIsAddPaymentTermDialogOpen}
        onSave={handleAddPaymentTerm}
        nameLabel="Payment Term"
        saveButtonLabel="Save"
      />
      <GenericItemDialog
        title="Edit Payment Term"
        open={isEditPaymentTermDialogOpen}
        onOpenChange={setIsEditPaymentTermDialogOpen}
        onSave={(data) => handleUpdatePaymentTerm(String(editingPaymentTerm?.id || 0), data)}
        nameLabel="Payment Term"
        saveButtonLabel="Update"
        initialData={
          editingPaymentTerm ? { name: editingPaymentTerm.name, color: editingPaymentTerm.color } : undefined
        }
      />
      <DeleteItemAlert
        open={isDeletePaymentTermAlertOpen}
        onOpenChange={setIsDeletePaymentTermAlertOpen}
        itemName={deletingPaymentTerm?.name || ""}
        itemType="Payment Term"
        onDelete={confirmDeletePaymentTerm}
      />

      {/* Customer Type Dialogs */}
      <CustomerTypeDialog
        title="Add Customer Type"
        open={isAddCustomerTypeDialogOpen}
        onOpenChange={setIsAddCustomerTypeDialogOpen}
        onSave={handleAddCustomerType}
      />
      <CustomerTypeDialog
        title="Edit Customer Type"
        open={isEditCustomerTypeDialogOpen}
        onOpenChange={setIsEditCustomerTypeDialogOpen}
        onSave={(data) => handleUpdateCustomerType(editingCustomerType?.id || 0, data)}
        initialData={editingCustomerType ? toCustomerTypeDialogData(editingCustomerType) : undefined}
      />
      <DeleteItemAlert
        open={isDeleteCustomerTypeAlertOpen}
        onOpenChange={setIsDeleteCustomerTypeAlertOpen}
        itemName={deletingCustomerType?.name || ""}
        itemType="Customer Type"
        onDelete={confirmDeleteCustomerType}
      />

      {/* Interested In Dialogs */}
      <CustomerRequirementDialog
        title="Add Interested In"
        open={isAddCustomerRequirementDialogOpen}
        onOpenChange={setIsAddCustomerRequirementDialogOpen}
        onSave={handleAddCustomerRequirement}
      />
      <CustomerRequirementDialog
        title="Edit Interested In"
        open={isEditCustomerRequirementDialogOpen}
        onOpenChange={setIsEditCustomerRequirementDialogOpen}
        onSave={(data) => handleUpdateCustomerRequirement(editingCustomerRequirement?.id || 0, data)}
        initialData={
          editingCustomerRequirement
            ? {
                name: editingCustomerRequirement.name,
                color: editingCustomerRequirement.color,
              }
            : undefined
        }
      />
      <DeleteItemAlert
        open={isDeleteCustomerRequirementAlertOpen}
        onOpenChange={setIsDeleteCustomerRequirementAlertOpen}
        itemName={deletingCustomerRequirement?.name || ""}
        itemType="Interested In"
        onDelete={confirmDeleteCustomerRequirement}
      />

      {/* Not Qualified Reasons Dialogs */}
      <GenericItemDialog
        title="Add Not Qualified Reason"
        open={isAddNqrDialogOpen}
        onOpenChange={setIsAddNqrDialogOpen}
        onSave={handleAddNotQualifiedReason}
        nameLabel="Reason"
        saveButtonLabel="Save"
        showColorPicker={false}
      />
      <GenericItemDialog
        title="Edit Not Qualified Reason"
        open={isEditNqrDialogOpen}
        onOpenChange={setIsEditNqrDialogOpen}
        onSave={(data) => handleUpdateNotQualifiedReason(editingNqr?.id || 0, data)}
        nameLabel="Reason"
        saveButtonLabel="Update"
        showColorPicker={false}
        initialData={
          editingNqr ? { name: editingNqr.name, color: "#E2E8F0" } : undefined
        }
      />
      <DeleteItemAlert
        open={isDeleteNqrAlertOpen}
        onOpenChange={setIsDeleteNqrAlertOpen}
        itemName={deletingNqr?.name || ""}
        itemType="Not Qualified Reason"
        onDelete={confirmDeleteNotQualifiedReason}
      />

      {/* Reorder Sheet */}
      <Sheet open={isReorderSheetOpen} onOpenChange={setIsReorderSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] [&>button]:hidden">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
            <SheetTitle>Reorder Status cccc</SheetTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReorderSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveReorder}>
                Save
              </Button>
            </div>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <p className="text-sm text-gray-600">
              Drag and drop to reorder the status list.
            </p>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={reorderStatuses.map((status) => String(status.id))} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {reorderStatuses.map((status) => (
                      <SortableStatusItem
                        key={status.id}
                        id={String(status.id)}
                        name={status.name}
                        color={status.color}
                        isDefault={status.isDefault}
                        fieldType={status.fieldType}
                        not_qualified={status.not_qualified}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

