"use client"

import React, { useState } from "react"
import { Pencil, Trash, Check, MoreVertical, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SimpleStatusTemplateDialog,
  type StatusItem as DialogStatusItem,
  type StatusTemplatePayload,
} from "./simple-status-template-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"

interface StatusItem {
  id?: string
  aging: "new" | "old"
  color: string
  name: string
  type: "active" | "done" | "closed"
  sort_order: number
  weightage: string
  _id?: string
  create_date?: string
}

interface StatusTemplate {
  id: string
  name: string
  active: StatusItem[]
  done: StatusItem[]
  closed: StatusItem[]
  create_date?: string
  default?: string
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function formatDate() {
  return new Date().toLocaleDateString("en-GB")
}

export function ProjectStatusTemplatesPage() {
  const [templates, setTemplates] = useState<StatusTemplate[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StatusTemplate | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAddTemplate = () => {
    setEditingTemplate(undefined)
    setDialogOpen(true)
  }

  const handleEditTemplate = (template: StatusTemplate) => {
    setEditingTemplate(template)
    setDialogOpen(true)
  }

  const handleDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!templateToDelete) return

    setTemplates((prev) => prev.filter((template) => template.id !== templateToDelete))
    toast({
      title: "Success",
      description: "Template deleted successfully",
    })
    setDeleteDialogOpen(false)
    setTemplateToDelete(null)
  }

  const handleSaveTemplate = (payload: StatusTemplatePayload) => {
    const active = payload.data.filter((item) => item.type === "active") as StatusItem[]
    const done = payload.data.filter((item) => item.type === "done") as StatusItem[]
    const closed = payload.data.filter((item) => item.type === "closed") as StatusItem[]
    const isUpdate = Boolean(payload.status_template_id)

    if (isUpdate && payload.status_template_id) {
      setTemplates((prev) =>
        prev.map((template) =>
          template.id === payload.status_template_id
            ? {
                ...template,
                name: payload.template_name,
                active,
                done,
                closed,
              }
            : template,
        ),
      )
      toast({
        title: "Success",
        description: "Template updated successfully!",
      })
    } else {
      const isFirst = templates.length === 0
      setTemplates((prev) => [
        ...prev,
        {
          id: createId(),
          name: payload.template_name,
          active,
          done,
          closed,
          create_date: formatDate(),
          default: isFirst ? "1" : "0",
        },
      ])
      toast({
        title: "Success",
        description: "Template added successfully!",
      })
    }

    setDialogOpen(false)
    setEditingTemplate(undefined)
  }

  const getStatusKey = (item: StatusItem | DialogStatusItem) => {
    const raw = item._id ?? item.id
    if (!raw) return ""
    if (typeof raw === "string") return raw
    if (typeof raw === "object" && "$oid" in raw) {
      return (raw as { $oid: string }).$oid
    }
    return String(raw)
  }

  const handleStatusDeleted = (status: DialogStatusItem, section: "active" | "done" | "closed") => {
    const statusKey = getStatusKey(status)
    if (!statusKey) return

    setEditingTemplate((prev) => {
      if (!prev) return prev

      if (section === "active") {
        return { ...prev, active: prev.active.filter((item) => getStatusKey(item) !== statusKey) }
      }

      if (section === "done") {
        return { ...prev, done: prev.done.filter((item) => getStatusKey(item) !== statusKey) }
      }

      return { ...prev, closed: prev.closed.filter((item) => getStatusKey(item) !== statusKey) }
    })
  }

  const setDefaultTemplate = (templateId: string) => {
    setTemplates((prev) =>
      prev.map((template) => ({
        ...template,
        default: template.id === templateId ? "1" : "0",
      })),
    )
    toast({
      title: "Success",
      description: "Default template updated successfully",
    })
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold text-gray-800">Status Templates</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="status-templates">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-gray-100">
              <TabsTrigger value="source" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Status Templates
              </TabsTrigger>
            </TabsList>

            <Button onClick={handleAddTemplate} className="bg-black hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" /> Add Template
            </Button>
          </div>

          <TabsContent value="status-templates" className="mt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-t border-b">
                  <TableHead className="font-medium text-left">Name</TableHead>
                  <TableHead className="font-medium text-left">Created On</TableHead>
                  <TableHead className="font-medium text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="py-3 text-left">
                      {template.name}
                      {template.default === "1" && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-left">{template.create_date}</TableCell>
                    <TableCell className="text-center py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {template.default !== "1" && (
                            <DropdownMenuItem onClick={() => setDefaultTemplate(template.id)}>
                              <Check className="h-4 w-4 mr-2" /> Set as Default
                            </DropdownMenuItem>
                          )}
                          {template.default !== "1" && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-red-500"
                            >
                              <Trash className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No status templates found. Add your first template.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>

      <SimpleStatusTemplateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingTemplate(undefined)
          }
        }}
        onSave={handleSaveTemplate}
        initialData={
          editingTemplate
            ? {
                id: editingTemplate.id,
                name: editingTemplate.name,
                active: editingTemplate.active,
                done: editingTemplate.done,
                closed: editingTemplate.closed,
              }
            : undefined
        }
        title={editingTemplate ? "Edit Status Template" : "Add Status Template"}
        saveButtonLabel={editingTemplate ? "Update" : "Save"}
        onStatusDelete={handleStatusDeleted}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the status template and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
