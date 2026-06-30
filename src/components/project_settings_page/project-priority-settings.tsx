"use client"

import { useState } from "react"
import { Check, MoreVertical, Pencil, Plus, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { GenericItemDialog } from "@/components/project_settings_page/generic-item-dialog"
import { ProjectDeleteItemAlert } from "./project-delete-item-alert"

interface Priority {
  id: string
  name: string
  color: string
  createdOn: string
  isDefault: boolean
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB")
}

export function ProjectPrioritySettings() {
  const [priorities, setPriorities] = useState<Priority[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false)
  const [editingPriority, setEditingPriority] = useState<Priority | null>(null)
  const [deletingPriority, setDeletingPriority] = useState<Priority | null>(null)
  const { toast } = useToast()

  const handleAddPriority = (data: { name: string; color: string }) => {
    const isFirst = priorities.length === 0
    setPriorities((prev) => [
      ...prev,
      {
        id: createId(),
        name: data.name,
        color: data.color,
        createdOn: formatDate(),
        isDefault: isFirst,
      },
    ])
    setIsAddDialogOpen(false)
    toast({ title: "Success", description: "Priority created successfully" })
  }

  const handleEditPriority = (priority: Priority) => {
    setEditingPriority(priority)
    setIsEditDialogOpen(true)
  }

  const handleUpdatePriority = (id: string, data: { name: string; color: string }) => {
    setPriorities((prev) =>
      prev.map((priority) => (priority.id === id ? { ...priority, name: data.name, color: data.color } : priority)),
    )
    setIsEditDialogOpen(false)
    setEditingPriority(null)
    toast({ title: "Success", description: "Priority updated successfully" })
  }

  const handleDeletePriority = (priority: Priority) => {
    setDeletingPriority(priority)
    setIsDeleteAlertOpen(true)
  }

  const confirmDeletePriority = () => {
    if (!deletingPriority) return
    setPriorities((prev) => prev.filter((priority) => priority.id !== deletingPriority.id))
    setIsDeleteAlertOpen(false)
    setDeletingPriority(null)
    toast({ title: "Success", description: "Priority deleted successfully" })
  }

  const handleSetDefault = (id: string) => {
    setPriorities((prev) => prev.map((priority) => ({ ...priority, isDefault: priority.id === id })))
    toast({ title: "Success", description: "Default priority updated successfully" })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Priority Settings</h2>
          <Button
            size="sm"
            className="bg-black hover:bg-gray-800 text-sm h-8 px-3"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Priority
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {priorities.map((priority) => (
              <TableRow key={priority.id} className="[&>td]:py-2">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: priority.color }} />
                    <span>{priority.name}</span>
                    {priority.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Default
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{priority.createdOn}</TableCell>
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
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleEditPriority(priority)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        {!priority.isDefault && (
                          <DropdownMenuItem className="cursor-pointer" onClick={() => handleSetDefault(priority.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            <span>Set as Default</span>
                          </DropdownMenuItem>
                        )}
                        {!priority.isDefault && (
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-600"
                            onClick={() => handleDeletePriority(priority)}
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
            {priorities.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No priorities found. Add your first priority.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <GenericItemDialog
          title="Add Priority"
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSave={handleAddPriority}
          nameLabel="Priority Name"
          saveButtonLabel="Save"
        />
        <GenericItemDialog
          title="Edit Priority"
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={(data) => handleUpdatePriority(editingPriority?.id || "", data)}
          nameLabel="Priority Name"
          saveButtonLabel="Update"
          initialData={editingPriority ? { name: editingPriority.name, color: editingPriority.color } : undefined}
        />
        <ProjectDeleteItemAlert
          open={isDeleteAlertOpen}
          onOpenChange={setIsDeleteAlertOpen}
          itemName={deletingPriority?.name || ""}
          itemType="priority"
          onDelete={confirmDeletePriority}
        />
      </CardContent>
    </Card>
  )
}
