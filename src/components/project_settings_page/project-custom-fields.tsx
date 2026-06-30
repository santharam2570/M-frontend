"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Check, MoreVertical, Pencil, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CustomFieldDialog } from "./custom-field-dialog"
import { DeleteItemAlert } from "./delete-item-alert"

interface CustomField {
  id: string
  name: string
  type: string
  options?: { id: number; name: string; color: string }[]
  currency?: string
  createdOn: string
  isDefault: boolean
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "Text",
  "dropdown-single": "Choices (Single)",
  "dropdown-multiple": "Choices (Multiple)",
  date: "Date",
  number: "Number",
  checkbox: "Checkbox",
  money: "Money",
  phone: "Phone",
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB")
}

function toCustomFieldData(field: CustomField) {
  return {
    name: field.name,
    type: field.type,
    options: field.options,
    currency: field.currency,
  }
}

export function ProjectCustomFields() {
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const { toast } = useToast()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [deletingField, setDeletingField] = useState<CustomField | null>(null)

  const handleAddCustomField = (data: {
    name: string
    type: string
    options?: { id: number; name: string; color: string }[]
    currency?: string
  }) => {
    const isFirst = customFields.length === 0
    setCustomFields((prev) => [
      ...prev,
      {
        id: createId(),
        name: data.name,
        type: data.type,
        options: data.options,
        currency: data.currency,
        createdOn: formatDate(),
        isDefault: isFirst,
      },
    ])
    setIsAddDialogOpen(false)
    toast({ title: "Success", description: "Custom field created successfully" })
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setIsEditDialogOpen(true)
  }

  const handleUpdateField = (
    id: string,
    data: {
      name: string
      type: string
      options?: { id: number; name: string; color: string }[]
      currency?: string
    },
  ) => {
    setCustomFields((prev) =>
      prev.map((field) =>
        field.id === id
          ? { ...field, name: data.name, type: data.type, options: data.options, currency: data.currency }
          : field,
      ),
    )
    setIsEditDialogOpen(false)
    setEditingField(null)
    toast({ title: "Success", description: "Custom field updated successfully" })
  }

  const handleDeleteField = (field: CustomField) => {
    setDeletingField(field)
    setIsDeleteAlertOpen(true)
  }

  const confirmDeleteField = () => {
    if (!deletingField) return
    setCustomFields((prev) => prev.filter((field) => field.id !== deletingField.id))
    setIsDeleteAlertOpen(false)
    setDeletingField(null)
    toast({ title: "Success", description: "Custom field deleted successfully" })
  }

  const handleSetDefault = (id: string) => {
    setCustomFields((prev) => prev.map((field) => ({ ...field, isDefault: field.id === id })))
    toast({ title: "Success", description: "Default custom field updated successfully" })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Custom Fields</h2>
        <Button
          size="sm"
          className="bg-black hover:bg-gray-800 text-sm h-8 px-3"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Custom Field
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Field Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created On</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customFields.map((field) => (
            <TableRow key={field.id} className="[&>td]:py-2">
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <span>{field.name}</span>
                  {field.isDefault && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Default
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{FIELD_TYPE_LABELS[field.type] ?? field.type}</TableCell>
              <TableCell>{field.createdOn}</TableCell>
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
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditField(field)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      {field.isDefault ? (
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
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleSetDefault(field.id)}>
                          <Check className="mr-2 h-4 w-4" />
                          <span>Set as Default</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:text-red-600"
                        onClick={() => handleDeleteField(field)}
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
          {customFields.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No custom fields found. Add your first custom field.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <CustomFieldDialog
        title="Add Custom Field"
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddCustomField}
      />
      <CustomFieldDialog
        title="Edit Custom Field"
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={(data) => handleUpdateField(editingField?.id || "", data)}
        initialData={editingField ? toCustomFieldData(editingField) : undefined}
      />
      <DeleteItemAlert
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        itemName={deletingField?.name || ""}
        itemType="custom field"
        onDelete={confirmDeleteField}
      />
    </div>
  )
}
