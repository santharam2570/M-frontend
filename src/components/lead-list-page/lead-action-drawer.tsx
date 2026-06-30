"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import React from "react"

import AddNoteDrawer from "@/components/all-notes/add-note-drawer"
import { ShowNotesDrawer } from "@/components/all-notes/show-notes-drawer"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formInputClassName, formTextareaClassName } from "@/lib/form-field-styles"
import URLS from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"

const emailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
})

interface Lead {
  _id: string
  name: string
  companyName: string
  email: string
}

interface LeadActionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  actionType: "note" | "email" | "viewNotes" | null
  lead: Lead | null
  onNoteSaved?: () => void
}

export function LeadActionDrawer({ open, onOpenChange, actionType, lead, onNoteSaved }: LeadActionDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  })

  async function onEmailSubmit(data: z.infer<typeof emailSchema>) {
    if (!lead) return

    setIsSubmitting(true)
    try {
      const userData = JSON.parse(localStorage.getItem("map_user") || "{}")
      const token = userData.access_token

      const formData = new FormData()
      formData.append("fromEmail", userData.user_details.email)
      formData.append("subject", data.subject)
      formData.append("content", data.message)
      formData.append("to", lead.email)
      formData.append("cc", "")
      formData.append("bcc", "")
      formData.append("associate_id", lead._id)
      formData.append("associate_to", "lead")
      formData.append("attachment_list", "")
      formData.append("thread_id", "None")

      const response = await fetch(`${URLS.SINGLE_EMAIL}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await parseJsonResponse<{ msg?: string }>(response)
        throw new Error(errorData.msg || "Network response was not ok")
      }

      toast({
        title: "Email Sent",
        description: `Email has been sent to ${lead.name}`,
      })

      emailForm.reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to send email. Please try again."),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTitle = () => {
    if (!lead) return ""

    switch (actionType) {
      case "note":
        return `Add Note for ${lead.name}`
      case "email":
        return `Send Email to ${lead.name}`
      case "viewNotes":
        return `Notes for ${lead.name}`
      default:
        return ""
    }
  }

  if (actionType === "note" && lead) {
    return (
      <AddNoteDrawer
        open={open}
        onOpenChange={onOpenChange}
        onSave={() => {
          onNoteSaved?.()
          onOpenChange(false)
        }}
        entityName={lead.name}
        associateId={lead._id}
        associateTo="lead"
      />
    )
  }

  if (actionType === "viewNotes" && lead) {
    return (
      <ShowNotesDrawer
        open={open}
        onOpenChange={onOpenChange}
        entityName={lead.name}
        associateId={lead._id}
        associateTo="lead"
      />
    )
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(newOpen) => {
        if (!isSubmitting) {
          onOpenChange(newOpen)
        }
      }}
    >
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6">
          <SheetHeader className="pb-4">
            <SheetTitle>{getTitle()}</SheetTitle>
            <Separator className="my-3" />
          </SheetHeader>

          {actionType === "email" && lead && (
            <Form {...emailForm}>
              <form id="email-form" onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                <div className="bg-muted/50 p-3 rounded-md mb-4">
                  <p className="text-sm font-medium">To: {lead.email}</p>
                </div>

                <FormField
                  control={emailForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email subject" {...field} disabled={isSubmitting} className={formInputClassName} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter your message"
                          className={cn(formTextareaClassName, "min-h-[200px]")}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          )}
        </div>

        {actionType === "email" && (
          <div className="border-t bg-background p-4 flex flex-row-reverse gap-2 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
            <Button type="submit" form="email-form" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Email"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
