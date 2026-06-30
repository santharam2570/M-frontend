"use client"

import { useState, useEffect } from "react"
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
  designation: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactFormSchema>

interface EditContactDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (contact: any) => void
  contact: {
    _id: string
    contact_name?: string
    name?: string
    phone: string
    alt_phone?: string
    alternatePhone?: string
    email: string
    alt_email?: string
    alternateEmail?: string
    department?: string
    designation?: string
  } | null
  companyId?: string
  leadId?: string
  partnerId?: string
  associateTo?: "company" | "lead" | "partner" | "opportunity" | "partner_request" | "onboarding_partner"
  associateId?: string
}

export function EditContactDrawer({ 
  open, 
  onOpenChange, 
  onSave, 
  contact,
  companyId,
  leadId,
  partnerId,
  associateTo = "company",
  associateId
}: EditContactDrawerProps) {
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
      designation: "",
    },
  })

  // Update form when contact data changes
  useEffect(() => {
    if (contact && open) {
      form.reset({
        name: contact.contact_name || contact.name || "",
        phone: contact.phone || "",
        alternatePhone: contact.alt_phone || contact.alternatePhone || "",
        email: contact.email || "",
        alternateEmail: contact.alt_email || contact.alternateEmail || "",
        department: contact.department || "",
        designation: contact.designation || "",
      })
      setNameError("")
    }
  }, [contact, open, form])

  // Handle form submission
  async function onSubmit(data: ContactFormValues) {
    if (!contact) {
      toast({
        title: "Error",
        description: "Contact data is missing",
        variant: "destructive",
      })
      return
    }

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
      if (data.designation) {
        payload.designation = data.designation
      }
      if (finalCompanyId) {
        payload.company_id = finalCompanyId
      }

      const response = await fetch(`${URLS.CONTACT}/${contact._id}`, {
        method: 'PUT',
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
            category_name: 'update',
            action: 'update',
            text_info: `Updated contact: ${data.name}`,
            associate_id: associateId,
            associate_to: associateTo
          })
        }

        toast({
          title: "Success!",
          description: "Contact has been updated",
          variant: "default",
        })
        onSave(result.data)
        onOpenChange(false)
        setNameError("")
      } else {
        throw new Error(result.msg || 'Failed to update contact')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update contact. Please try again.",
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
      <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Contact
            </SheetTitle>
            <Separator className="my-3" />
          </SheetHeader>

          <Form {...form}>
            <form id="edit-contact-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="alternateEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alternate Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="Enter alternate email address (optional)" 
                        {...field} 
                        disabled={isSubmitting}
                        className={formInputClassName}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty string or valid email
                          if (value === '' || z.string().email().safeParse(value).success) {
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
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter department (optional)" 
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
          <Button type="submit" form="edit-contact-form" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Update"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
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

