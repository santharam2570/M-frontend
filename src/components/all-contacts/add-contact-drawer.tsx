"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Loader2, User } from "lucide-react"
import URLS from "@/config/urls"
import { useTimeline } from "@/hooks/use-timeline"
import { cn } from "@/lib/utils"
import { formInputClassName } from "@/lib/form-field-styles"

// Define the form schema for contacts with all required fields
const contactFormSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  phone: z.string().min(1, "Phone number is required"),
  alternatePhone: z.string().optional(),
  email: z.string().email("Invalid email format").min(1, "Email is required"),
  alternateEmail: z.string().email("Invalid email format").optional().or(z.literal("")),
  department: z.string().optional(),
  dob: z.string().optional(),
  designation: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

interface AddContactDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (contact: any) => void
  companyId?: string
  leadId?: string
  partnerId?: string
  associateTo?: "company" | "lead" | "partner" | "opportunity" | "partner_request" | "onboarding_partner"
  associateId?: string
}

export function AddContactDrawer({ 
  open, 
  onOpenChange, 
  onSave, 
  companyId,
  leadId,
  partnerId,
  associateTo = "company",
  associateId
}: AddContactDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameError, setNameError] = useState("")
  const { toast } = useToast()
  const { addTimelineActivity } = useTimeline()

  // Validation function for name
  const validateName = (value: string): boolean => {
    // Allow alphanumeric characters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-\']*$/
    return nameRegex.test(value)
  }

  // Initialize the form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      alternateEmail: "",
      department: "",
      dob: "",
      designation: "",
    },
  })

  // Handle form submission
  async function onSubmit(data: ContactFormValues) {
    // Check for validation errors before submitting
    if (nameError) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before submitting.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      // Determine the company_id to use
      const finalCompanyId = companyId || leadId || partnerId || associateId

      // Prepare the payload
      const payload: any = {
        contact_name: data.name,
        phone: data.phone,
        email: data.email,
      }

      // Add optional fields only if they have values
      if (data.alternatePhone) {
        payload.alt_phone = data.alternatePhone
      }
      if (data.alternateEmail) {
        payload.alt_email = data.alternateEmail
      }
      if (data.department) {
        payload.department = data.department
      }
      if (data.dob) {
        payload.dob = data.dob
      }
      if (data.designation) {
        payload.designation = data.designation
      }
      if (finalCompanyId) {
        payload.company_id = finalCompanyId
      }

      const response = await fetch(`${URLS.CONTACT}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      
      if (result.code === 200) {
        // Add timeline activity
        if (associateId && associateTo) {
          addTimelineActivity({
            category_name: 'create',
            action: 'create',
            text_info: `Created contact: ${data.name}`,
            associate_id: associateId,
            associate_to: associateTo
          })
        }

        toast({
          title: "Success!",
          description: "Contact has been added",
          variant: "default",
        })
        onSave(result.data)
        onOpenChange(false)
        form.reset()
        setNameError("")
      } else {
        throw new Error(result.msg || 'Failed to add contact')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add contact. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
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
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md p-0 flex flex-col h-full gap-0">
        <div className="shrink-0 px-6 pr-12 pt-3 pb-4">
          <SheetHeader className="p-0 space-y-0 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold">
              <User className="h-5 w-5 shrink-0 text-primary" />
              Add Contact
            </SheetTitle>
          </SheetHeader>
          <Separator className="mt-4" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <Form {...form}>
            <form id="contact-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter contact name"
                        {...field}
                        disabled={isSubmitting}
                        className={cn(formInputClassName, nameError && "border-red-500 focus:border-red-500")}
                        onChange={(e) => {
                          const value = e.target.value
                          if (validateName(value) || value === '') {
                            field.onChange(value)
                            setNameError("")
                          } else {
                            setNameError("Only letters, spaces, hyphens, and apostrophes are allowed")
                          }
                        }}
                      />
                    </FormControl>
                    {nameError && (
                      <p className="text-sm text-red-500 mt-1">{nameError}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter phone number"
                        {...field}
                        disabled={isSubmitting}
                        className={formInputClassName}
                        onChange={(e) => {
                          const value = e.target.value
                          // Only allow numeric characters, spaces, hyphens, parentheses, and plus sign
                          const phoneRegex = /^[0-9\s\-\(\)\+]*$/
                          if (phoneRegex.test(value) || value === '') {
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
                name="alternatePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter alternate phone number (optional)"
                        {...field}
                        disabled={isSubmitting}
                        className={formInputClassName}
                        onChange={(e) => {
                          const value = e.target.value
                          // Only allow numeric characters, spaces, hyphens, parentheses, and plus sign
                          const phoneRegex = /^[0-9\s\-\(\)\+]*$/
                          if (phoneRegex.test(value) || value === '') {
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
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter relationship (optional)" 
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
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter email address" 
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
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter designation (optional)" 
                        {...field} 
                        disabled={isSubmitting}
                        className={formInputClassName}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Add extra padding at the bottom to ensure content isn't hidden behind fixed buttons */}
              <div className="pb-16"></div>
            </form>
          </Form>
        </div>

        {/* Fixed footer with buttons */}
        <div className="border-t bg-background p-4 flex flex-row-reverse gap-2 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
          <Button type="submit" form="contact-form" disabled={isSubmitting}>
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
            onClick={() => {
              onOpenChange(false)
              form.reset()
              setNameError("")
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

