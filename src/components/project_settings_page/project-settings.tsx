"use client"

import { useState, useEffect, useCallback, type SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Check, MoreVertical, Pencil, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { GenericItemDialog } from "@/components/project_settings_page/generic-item-dialog"
import { DeleteItemAlert } from "@/components/project_settings_page/delete-item-alert"
import URLS from "@/config/urls"

interface StatusItem {
  id: string
  name: string
  color: string
  createdOn: string
  isDefault: boolean
}

type ProjectSettingType = "rera_status" | "project_status" | "unit_status"

const PROJECT_SETTING_TABS: {
  tabValue: string
  apiType: ProjectSettingType
  label: string
  nameColumnLabel: string
  emptyMessage: string
  addButtonLabel: string
}[] = [
  {
    tabValue: "rera-status",
    apiType: "rera_status",
    label: "RERA Status",
    nameColumnLabel: "RERA Status Name",
    emptyMessage: "No RERA statuses found. Add your first RERA status.",
    addButtonLabel: "Add RERA Status",
  },
  {
    tabValue: "project-status",
    apiType: "project_status",
    label: "Project Status",
    nameColumnLabel: "Project Status Name",
    emptyMessage: "No project statuses found. Add your first project status.",
    addButtonLabel: "Add Project Status",
  },
  {
    tabValue: "unit-status",
    apiType: "unit_status",
    label: "Unit Status",
    nameColumnLabel: "Unit Status Name",
    emptyMessage: "No unit statuses found. Add your first unit status.",
    addButtonLabel: "Add Unit Status",
  },
]

const EMPTY_ITEMS: Record<ProjectSettingType, StatusItem[]> = {
  rera_status: [],
  project_status: [],
  unit_status: [],
}

function resolveSettingId(item: {
  _id?: string | { $oid?: string }
  id?: string | number
}): string {
  if (item._id && typeof item._id === "object" && item._id.$oid) {
    return item._id.$oid
  }

  return String(item._id ?? item.id ?? "")
}

function mapSimpleSettingItems(items: Record<string, unknown>[] | undefined): StatusItem[] {
  return (items || []).map((item) => {
    const id = resolveSettingId(item as { _id?: string; id?: string | number })
    return {
      id,
      name: item.name as string,
      color: (item.color as string) || "#000000",
      isDefault: item.default === 1,
      createdOn: (item.create_date as string) || "",
    }
  })
}

function buildSimpleSettingPayload(
  type: ProjectSettingType,
  data: { name: string; color: string },
  isDefault = 0,
) {
  return {
    name: data.name,
    color: data.color,
    type,
    default: isDefault,
    weightage: "",
    info: "",
    title: "",
  }
}

function getTabConfig(tabValue: string) {
  return PROJECT_SETTING_TABS.find((tab) => tab.tabValue === tabValue) ?? PROJECT_SETTING_TABS[0]
}

export function ProjectSettings() {
  const [itemsByType, setItemsByType] = useState<Record<ProjectSettingType, StatusItem[]>>(EMPTY_ITEMS)
  const [activeTab, setActiveTab] = useState("rera-status")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StatusItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<StatusItem | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const activeConfig = getTabConfig(activeTab)
  const activeType = activeConfig.apiType
  const activeItems = itemsByType[activeType] ?? []

  const setItemsForType = useCallback(
    (type: ProjectSettingType, updater: SetStateAction<StatusItem[]>) => {
      setItemsByType((prev) => ({
        ...EMPTY_ITEMS,
        ...prev,
        [type]: typeof updater === "function" ? updater(prev[type] ?? []) : updater,
      }))
    },
    [],
  )

  const getAuthToken = useCallback(async (): Promise<string | null> => {
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
  }, [router])

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(URLS.PROJECT_SETTINGS_LIST, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        const data = result.data || {}
        setItemsByType({
          ...EMPTY_ITEMS,
          rera_status: mapSimpleSettingItems(data.rera_status),
          project_status: mapSimpleSettingItems(data.project_status),
          unit_status: mapSimpleSettingItems(data.unit_status),
        })
      } else {
        toast({
          title: "Error fetching data",
          description: result.msg || "Failed to fetch project settings.",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error fetching data",
        description: "An unexpected error occurred while fetching project settings.",
        variant: "destructive",
      })
    }
  }, [getAuthToken, toast])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleAdd = async (data: { name: string; color: string }) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(URLS.ADD_PROJECT_SETTINGS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildSimpleSettingPayload(activeType, data)),
      })

      const responseData = await response.json()

      if (response.ok && responseData.code === 200) {
        toast({
          title: "Success",
          description: `${activeConfig.label} created successfully.`,
        })

        const created = responseData.data || {}
        const newItem: StatusItem = {
          id: resolveSettingId(created) || String(activeItems.length + 1),
          name: data.name,
          color: (created.color as string) || data.color,
          isDefault: false,
          createdOn: (created.create_date as string) || new Date().toLocaleDateString("en-GB"),
        }

        setItemsForType(activeType, [...activeItems, newItem])
        setIsAddDialogOpen(false)
      } else {
        throw new Error(responseData.msg || `Failed to add ${activeConfig.label.toLowerCase()}.`)
      }
    } catch (error) {
      console.error(`Error adding ${activeType}:`, error)
      toast({
        title: "Error",
        description: `Failed to add ${activeConfig.label.toLowerCase()}. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const handleUpdate = async (id: string, data: { name: string; color: string }) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const existing = activeItems.find((item) => item.id === id)
      const payload = buildSimpleSettingPayload(
        activeType,
        data,
        existing?.isDefault ? 1 : 0,
      )

      const response = await fetch(`${URLS.UPDATE_PROJECT_SETTINGS}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.ok && result.code === 200) {
        setItemsForType(activeType, (prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, name: data.name, color: data.color } : item,
          ),
        )
        setIsEditDialogOpen(false)
        setEditingItem(null)
        toast({
          title: "Success",
          description: `${activeConfig.label} updated successfully.`,
        })
      } else {
        throw new Error(result.msg || `Failed to update ${activeConfig.label.toLowerCase()}.`)
      }
    } catch (error) {
      console.error(`Error updating ${activeType}:`, error)
      toast({
        title: "Error",
        description: `Failed to update ${activeConfig.label.toLowerCase()}. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const handleDelete = (status: StatusItem) => {
    setDeletingItem(status)
    setIsDeleteAlertOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingItem) return

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${URLS.DELETE_PROJECT_SETTINGS}/${deletingItem.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        setItemsForType(activeType, (prev) => prev.filter((item) => item.id !== deletingItem.id))
        toast({
          title: "Success",
          description: `${activeConfig.label} deleted successfully.`,
        })
      } else {
        throw new Error(data.msg || `Failed to delete ${activeConfig.label.toLowerCase()}.`)
      }
    } catch (error) {
      console.error(`Error deleting ${activeType}:`, error)
      toast({
        title: "Error",
        description: `Failed to delete ${activeConfig.label.toLowerCase()}. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setDeletingItem(null)
      setIsDeleteAlertOpen(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`${URLS.PROJECT_SETTINGS_DEFAULT}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: activeType }),
      })

      const data = await response.json()

      if (response.ok && data.code === 200) {
        setItemsForType(activeType, (prev) =>
          prev.map((item) => ({
            ...item,
            isDefault: item.id === id,
          })),
        )
        toast({
          title: "Success",
          description: `Default ${activeConfig.label.toLowerCase()} updated successfully.`,
        })
      } else {
        throw new Error(data.msg || `Failed to set default ${activeConfig.label.toLowerCase()}.`)
      }
    } catch (error) {
      console.error(`Error setting default ${activeType}:`, error)
      toast({
        title: "Error",
        description: `Failed to set default ${activeConfig.label.toLowerCase()}. Please try again.`,
        variant: "destructive",
      })
    }
  }

  const handleEdit = (status: StatusItem) => {
    setEditingItem(status)
    setIsEditDialogOpen(true)
  }

  const renderStatusTable = (
    statuses: StatusItem[],
    emptyMessage: string,
    nameColumnLabel: string,
  ) => (
    <Table className="w-full">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[300px] text-left">{nameColumnLabel}</TableHead>
          <TableHead className="text-left">Created On</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {statuses.map((status) => (
          <TableRow key={status.id} className="[&>td]:py-2">
            <TableCell className="font-medium text-left">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                <span>{status.name}</span>
                {status.isDefault && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Default
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-left">{status.createdOn}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-gray-100">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(status)}>
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
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handleSetDefault(status.id)}>
                        <Check className="mr-2 h-4 w-4" />
                        <span>Set as Default</span>
                      </DropdownMenuItem>
                    )}

                    {!status.isDefault && (
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        onClick={() => handleDelete(status)}
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
        {statuses.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold text-gray-800">Project</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="rera-status" className="w-full" onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6 gap-4">
            <TabsList className="bg-gray-100">
              {PROJECT_SETTING_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.tabValue}
                  value={tab.tabValue}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              size="sm"
              className="bg-black hover:bg-gray-800 text-sm h-8 px-3 shrink-0"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {activeConfig.addButtonLabel}
            </Button>
          </div>

          {PROJECT_SETTING_TABS.map((tab) => (
            <TabsContent key={tab.tabValue} value={tab.tabValue} className="pt-6">
              {renderStatusTable(
                itemsByType[tab.apiType] ?? [],
                tab.emptyMessage,
                tab.nameColumnLabel,
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <GenericItemDialog
        key={`add-${activeTab}`}
        title={activeConfig.addButtonLabel}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAdd}
        nameLabel={activeConfig.nameColumnLabel}
        saveButtonLabel="Save"
      />

      <GenericItemDialog
        key={`edit-${activeTab}-${editingItem?.id ?? "none"}`}
        title={`Edit ${activeConfig.label}`}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={(data) => handleUpdate(editingItem?.id || "", data)}
        nameLabel={activeConfig.nameColumnLabel}
        saveButtonLabel="Update"
        initialData={editingItem ? { name: editingItem.name, color: editingItem.color } : undefined}
      />

      <DeleteItemAlert
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        itemName={deletingItem?.name || ""}
        itemType={activeConfig.label.toLowerCase()}
        onDelete={confirmDelete}
      />
    </Card>
  )
}
