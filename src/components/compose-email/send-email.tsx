"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import dynamic from 'next/dynamic'
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })
import 'react-quill-new/dist/quill.snow.css'
import { URLS } from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"
import { getStoredAuthUser } from "@/lib/auth"
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Mail,
  Menu,
  Paperclip,
  LayoutTemplateIcon as Template,
  X,
  Search,
  Clock,
  User,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, sheetEmailContentClassName } from "@/components/ui/sheet"
import { formInputClassName, formSelectTriggerClassName } from "@/lib/form-field-styles"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
// Type for email history
type EmailHistory = {
  id: string
  subject: string
  to: string
  from: string
  body: string
  sentDate: Date
  sentBy: string
  attachments: {
    id: string
    name: string
    size: string
    type: "local" | "crm"
  }[]
}

type SenderEmailOption = {
  email: string
  name?: string
  default?: number
}

function formatSenderLabel(option: SenderEmailOption): string {
  if (option.name?.trim()) {
    return `${option.name.trim()} (${option.email})`
  }
  return option.email
}

function normalizeSenderEmailEntry(entry: unknown): SenderEmailOption | null {
  if (typeof entry === "string" && entry.includes("@")) {
    return { email: entry.trim() }
  }

  if (!entry || typeof entry !== "object") return null

  const record = entry as Record<string, unknown>
  const rawEmail = record.email ?? record.gmail ?? record.email_id ?? record.address
  if (typeof rawEmail !== "string" || !rawEmail.trim()) return null

  const rawName = record.name ?? record.user_name ?? record.display_name
  const isDefault =
    record.default === 1 ||
    record.default === "1" ||
    record.default === true ||
    record.is_default === 1 ||
    record.is_default === true

  return {
    email: rawEmail.trim(),
    name: typeof rawName === "string" ? rawName.trim() : undefined,
    default: isDefault ? 1 : undefined,
  }
}

function extractSenderEmailList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []

  const record = payload as Record<string, unknown>
  if (Array.isArray(record.data)) return record.data
  if (Array.isArray(record.emails)) return record.emails
  if (Array.isArray(record.gmail_list)) return record.gmail_list

  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>
    if (Array.isArray(nested.emails)) return nested.emails
    if (Array.isArray(nested.list)) return nested.list
    if (Array.isArray(nested.gmail_list)) return nested.gmail_list
  }

  return []
}

function getStoredSenderFallback(): SenderEmailOption[] {
  const stored = getStoredAuthUser()
  if (!stored) return []

  const record = stored as unknown as Record<string, unknown>
  const details = record.user_details as Record<string, unknown> | undefined
  const name =
    (typeof details?.name === "string" ? details.name : undefined) ??
    (typeof stored.result?.name === "string" ? stored.result.name : undefined)
  const email =
    (typeof details?.email === "string" ? details.email : undefined) ??
    (typeof stored.result?.email === "string" ? stored.result.email : undefined) ??
    (typeof stored.organization?.email === "string" ? stored.organization.email : undefined)

  if (!email?.trim()) return []

  return [{ email: email.trim(), name: name?.trim(), default: 1 }]
}

function pickDefaultSenderEmail(options: SenderEmailOption[]): string {
  return options.find((option) => option.default === 1)?.email ?? options[0]?.email ?? ""
}

interface SendEmailProps {
  initialContact?: {
    _id: string;
    contact_name: string;
    email: string;
    associate_to: string;
  } | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEmailSent?: () => void;
  /** Array of predefined email addresses that will be available as clickable suggestions in To, CC, and BCC fields */
  predefinedEmails?: string[];
}

export default function SendEmail({ initialContact = null, isOpen = false, onOpenChange, onEmailSent, predefinedEmails = [] }: SendEmailProps) {
  const [items, setItems] = useState([
    { id: 1, title: "Project Alpha", status: "Active" },
    { id: 2, title: "Client Meeting Notes", status: "Completed" },
    { id: 3, title: "Product Roadmap", status: "In Progress" },
    { id: 4, title: "Budget Planning", status: "Pending" },
    { id: 5, title: "Team Evaluation", status: "Active" },
    { id: 6, title: "Marketing Strategy", status: "In Progress" },
    { id: 7, title: "Quarterly Report", status: "Completed" },
    { id: 8, title: "User Research", status: "Pending" },
  ])

  const [isEmailSheetOpen, setIsEmailSheetOpen] = useState(isOpen)
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<EmailHistory | null>(null)

  // Update email sheet state when isOpen prop changes
  useEffect(() => {
    setIsEmailSheetOpen(isOpen);
  }, [isOpen]);

  // Notify parent component when sheet state changes
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isEmailSheetOpen);
    }
  }, [isEmailSheetOpen, onOpenChange]);

  // Sample email history data
  const emailHistory: EmailHistory[] = [
    {
      id: "email-1",
      subject: "Project Alpha Update - Q2 Progress",
      to: "client@example.com",
      from: "work@example.com",
      body: "Dear Client,\n\nI'm pleased to share our Q2 progress report for Project Alpha. We've made significant advancements in several key areas as outlined in the attached documents.\n\nHighlights include:\n- Completed milestone 3 ahead of schedule\n- Resolved all pending technical issues\n- Implemented the new feature set as requested\n\nPlease review the attached documents and let me know if you have any questions or feedback.\n\nBest regards,\nYour Project Manager",
      sentDate: new Date(2023, 5, 15, 14, 30),
      sentBy: "John Smith",
      attachments: [
        { id: "att-1-1", name: "Project_Alpha_Q2_Report.pdf", size: "2.4 MB", type: "local" },
        { id: "att-1-2", name: "Feature_Implementation.xlsx", size: "1.1 MB", type: "local" },
      ],
    },
    {
      id: "email-2",
      subject: "Client Meeting Notes - Action Items",
      to: "team@example.com",
      from: "work@example.com",
      body: "Team,\n\nFollowing our client meeting yesterday, here are the key action items we need to address:\n\n1. Update the project timeline by Friday\n2. Schedule a follow-up technical discussion\n3. Prepare the resource allocation plan\n4. Review the client's feedback on the latest deliverable\n\nPlease see the attached meeting notes for details.\n\nRegards,\nProject Coordinator",
      sentDate: new Date(2023, 5, 10, 9, 15),
      sentBy: "Sarah Johnson",
      attachments: [{ id: "att-2-1", name: "Meeting_Notes_June10.docx", size: "450 KB", type: "local" }],
    },
  ]

  const handleItemClick = (itemId: number) => {
    // Find a matching email for the clicked item
    // In a real app, you would fetch the actual email history for this item
    const email = emailHistory.find((e, index) => index === itemId - 1) || emailHistory[0]
    setSelectedEmail(email)
    setIsEmailPreviewOpen(true)
  }

  // If component is used as a standalone page
  if (!initialContact) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen">
          <main className="flex-1">
            <ListPage items={items} onSendEmail={() => setIsEmailSheetOpen(true)} onItemClick={handleItemClick} />
            <EmailSheet open={isEmailSheetOpen} onOpenChange={setIsEmailSheetOpen} onEmailSent={onEmailSent} predefinedEmails={predefinedEmails} />
            <EmailPreviewSheet open={isEmailPreviewOpen} onOpenChange={setIsEmailPreviewOpen} email={selectedEmail} />
          </main>
        </div>
      </SidebarProvider>
    )
  }

  // If component is used for sending email to a specific contact
  return (
    <EmailSheet
      open={isEmailSheetOpen}
      onOpenChange={(open) => {
        setIsEmailSheetOpen(open);
        if (onOpenChange) onOpenChange(open);
      }}
      contact={initialContact}
      onEmailSent={onEmailSent}
      predefinedEmails={predefinedEmails}
    />
  )
}

function AppSidebar() {
  const { toggleSidebar } = useSidebar()


}

function ListPage({
  items,
  onSendEmail,
  onItemClick,
}: {
  items: { id: number; title: string; status: string }[]
  onSendEmail: () => void
  onItemClick: (id: number) => void
}) {
  return (
    <div className="p-6">
      {/* <div className="flex justify-between items-center mb-6">

        <Button className="gap-2" onClick={onSendEmail}>
          <Mail className="h-4 w-4" />
          Send Email
        </Button>
      </div> */}


    </div>
  )
}

// Email Preview Sheet Component
function EmailPreviewSheet({
  open,
  onOpenChange,
  email,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: EmailHistory | null
}) {
  if (!email) return null

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }


}

// Type for attached files
type AttachedFile = {
  url: any
  id: string
  name: string
  size: string
  type: "local" | "crm"
}

// Type for CRM document
type CRMDocument = {
  id: string
  name: string
  type: "folder" | "file"
  children?: CRMDocument[]
  size?: string
  url?: string
}

// Type for email template
type EmailTemplate = {
  id: string
  name: string
  template: string
  subject: string
  default: number
  org_id: number
  count: number
  create_date?: Date
}

// Type for template history
type TemplateHistory = {
  id: string
  template_id: string
  name: string
  template: string
  subject: string
  create_date: Date
  user_id: string
}

function EmailSheet({
  open,
  onOpenChange,
  contact = null,
  onEmailSent,
  predefinedEmails = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: {
    _id: string;
    contact_name: string;
    email: string;
    associate_to: string;
  } | null
  onEmailSent?: () => void
  predefinedEmails?: string[]
}) {
  const footerButtonClass = "h-10 min-w-[88px] rounded-md px-4 py-2"

  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [userEmails, setUserEmails] = useState<SenderEmailOption[]>([])
  const [isLoadingEmails, setIsLoadingEmails] = useState(false)
  const [emailSignature, setEmailSignature] = useState<string>('')
  const [isLoadingSignature, setIsLoadingSignature] = useState(false)

  // Seed sender options from stored auth immediately, then refresh from API
  useEffect(() => {
    if (!open) return

    const fallbackOptions = getStoredSenderFallback()
    if (fallbackOptions.length > 0) {
      setUserEmails(fallbackOptions)
    }

    const fetchUserEmails = async () => {
      try {
        setIsLoadingEmails(true)
        const stored = getStoredAuthUser()
        const token = stored?.access_token
        if (!token) {
          throw new Error("User not authenticated")
        }

        const response = await fetch(URLS.USERS_EMAIL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        const data = await parseJsonResponse<{ code?: number; data?: unknown; msg?: string }>(response)
        if (data.code === 200) {
          const parsed = extractSenderEmailList(data.data ?? data)
            .map(normalizeSenderEmailEntry)
            .filter((entry): entry is SenderEmailOption => entry !== null)

          if (parsed.length > 0) {
            setUserEmails(parsed)
          } else if (fallbackOptions.length === 0) {
            throw new Error("No sender email addresses found")
          }
        } else if (fallbackOptions.length === 0) {
          throw new Error(data.msg || "Failed to fetch user emails")
        }
      } catch (error: unknown) {
        if (fallbackOptions.length === 0) {
          toast({
            title: "Error",
            description: getApiErrorMessage(error, "Failed to fetch user emails"),
            variant: "destructive",
          })
        }
      } finally {
        setIsLoadingEmails(false)
      }
    }

    void fetchUserEmails()
  }, [open, toast])

  useEffect(() => {
    if (!open) return

    try {
      const storedData = localStorage.getItem('map_user') ?? '{}'
      const parsedData = JSON.parse(storedData)
      setUserData(parsedData)

      // Fetch email signature
      const fetchSignature = async () => {
        try {
          setIsLoadingSignature(true)
          
          // Get token from localStorage
          const userData = localStorage.getItem('map_user')
          if (!userData) {
            throw new Error('User not authenticated')
          }
          
          const parsedUserData = JSON.parse(userData)
          const token = parsedUserData.access_token
          
          if (!token) {
            throw new Error('Authentication token not found')
          }
          
          const response = await fetch(URLS.EMAIL_SIGNATURE, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error('Failed to fetch email signature')
          }

          const data = await response.json();
          if (data.code === 200 && Array.isArray(data.data) && data.data.length > 0) {
            const signature = data.data[0].mail_signature;
            setEmailSignature(signature);
            // Set the initial message value with the signature
            // setValue('message', `\n\n${signature}`);
          }
        } catch (error: any) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to fetch email signature',
            variant: 'destructive'
          })
        } finally {
          setIsLoadingSignature(false)
        }
      }

      fetchSignature()
    } catch (error) {
      console.error('Error parsing user data:', error)
    }
  }, [open, toast])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isCRMDocumentsOpen, setIsCRMDocumentsOpen] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const [templateSearchQuery, setTemplateSearchQuery] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Email chip states
  const [toEmails, setToEmails] = useState<string[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [bccEmails, setBccEmails] = useState<string[]>([])

  // Helper function to validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Sample email templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([])  // Initialize as empty array
  const [filteredTemplates, setFilteredTemplates] = useState<EmailTemplate[]>([])  // Initialize filtered templates state
  const [templateHistory, setTemplateHistory] = useState<TemplateHistory[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // Fetch email templates only when the sheet is open
  useEffect(() => {
    if (!open) return

    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true)
        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token

        const response = await fetch(URLS.EMAIL_TEMPLATES, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch email templates')
        }

        const data = await response.json()
        // console.log('Fetched templates:', data)
        if (data.code === 200 && data.data && data.data.template) {
          // Ensure templates is always an array and process the nested template array
          const templatesData = Array.isArray(data.data.template) ? data.data.template.map((t: { _id: any; name: any; template: any; subject: any; default: any; org_id: any; create_date: string | number | Date }) => ({
            id: t._id,
            name: t.name,
            template: t.template,
            subject: t.subject,
            default: t.default,
            org_id: t.org_id,
            count: 0,
            create_date: new Date(t.create_date)
          })) : []
          setTemplates(templatesData)
          // Initialize filtered templates with all templates
          setFilteredTemplates(templatesData)
        } else {
          throw new Error(data.msg || 'Failed to fetch email templates')
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch email templates',
          variant: 'destructive'
        })
        // Set empty arrays on error
        setTemplates([])
        setFilteredTemplates([])
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [open, toast])

  // Update filtered templates whenever search query changes
  useEffect(() => {
    const filtered = templateSearchQuery
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(templateSearchQuery.toLowerCase())
        )
      : templates
    setFilteredTemplates(filtered)
  }, [templateSearchQuery, templates])

  // Fetch template history only when the sheet is open
  useEffect(() => {
    if (!open) return

    const fetchTemplateHistory = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token

        const response = await fetch(`${URLS.EMAIL_TEMPLATE_HISTORY}?sort=create_date&order=desc`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch template history')
        }

        const data = await response.json()
        if (data.code === 200) {
          setTemplateHistory(data.data || [])
        } else {
          // throw new Error(data.msg || 'Failed to fetch template history')
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch template history',
          variant: 'destructive'
        })
      }
    }

    fetchTemplateHistory()
  }, [open, toast])

  // Get recently used templates from history, showing only the latest for each unique name
  const recentlyUsedTemplates = templateHistory
    .reduce((unique, history) => {
      const existingIndex = unique.findIndex(item => item.name === history.name);
      if (existingIndex >= 0) {
        // If template with same name exists, update it only if current one is newer
        if (new Date(history.create_date) > new Date(unique[existingIndex].create_date)) {
          unique[existingIndex] = {
            id: history.template_id,
            name: history.name,
            subject: history.subject,
            template: history.template,
            create_date: new Date(history.create_date)
          };
        }
      } else {
        // Add new template if name doesn't exist
        unique.push({
          id: history.template_id,
          name: history.name,
          subject: history.subject,
          template: history.template,
          create_date: new Date(history.create_date)
        });
      }
      return unique;
    }, [] as Array<{
      id: string;
      name: string;
      subject: string;
      template: string;
      create_date: Date;
    }>)
    .sort((a, b) => b.create_date.getTime() - a.create_date.getTime())
    .slice(0, 3)

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      // Populate form fields with template data
      setValue('subject', template.subject)
      // Set message with template content only (signature will be shown separately)
      setValue('message', template.template)
      setSelectedTemplate(templateId)
      setIsTemplatesOpen(false)
    }
  }

  // Update filtered templates whenever search query or templates change
  useEffect(() => {
    const filtered = templateSearchQuery
      ? templates.filter(
          (t) =>
            t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(templateSearchQuery.toLowerCase())
        )
      : templates
    setFilteredTemplates(filtered)
  }, [templateSearchQuery, templates])


  const handleBrowseFiles = async () => {
    if (!fileInputRef.current) return
    fileInputRef.current.click()

    fileInputRef.current.onchange = async (e: any) => {
      if (!e.target.files?.length) return

      try {
        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token

        // Keep track of original files and their sizes
        const originalFiles = Array.from(e.target.files) as File[]

        const formData = new FormData()
        originalFiles.forEach((file: File) => {
          formData.append('document[]', file)
        })

        const response = await fetch(URLS.EMAIL_DOCUMENTS, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        console.log("response", response)
        if (!response.ok) {
          throw new Error('Failed to upload files')
        }

        const data = await response.json()
        console.log("data", data)
        
        if (data.code === 200) {
          // Map the response files with their original file sizes
          const newFiles = data.filelist.map((file: any, index: number) => {
            // Try to match by name or use index, and use the original file size
            const originalFile = originalFiles.find(f => f.name === file.name) || originalFiles[index]
            const fileSize = file.size || (originalFile ? originalFile.size : 0)
            
            return {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name,
              size: formatFileSize(fileSize),
              type: 'local' as const,
              url: file.url
            }
          })

          console.log("newFiles to attach", newFiles)
          setAttachedFiles(prev => [...prev, ...newFiles])
          toast({
            title: 'Success',
            description: 'Files uploaded successfully',
          })
        } else {
          throw new Error(data.msg || 'Failed to upload files')
        }
      } catch (error: any) {
        console.error("Error uploading files:", error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to upload files',
          variant: 'destructive',
        })
      }

      // Reset the input
      e.target.value = ''
    }
  }

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }

  // Email form validation schema
const emailSchema = z.object({
  from: z.string().min(1, "From is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required")
})

const {
  register,
  handleSubmit,
  reset: emailFormReset,
  setValue,
  watch,
  getValues,
  formState: { errors, isSubmitting }
} = useForm<z.infer<typeof emailSchema>>({
  resolver: zodResolver(emailSchema),
  defaultValues: {
    message: '',
    from: pickDefaultSenderEmail(userEmails),
    subject: ''
  }
})

  // Keep the From field in sync when sender options load or change
  useEffect(() => {
    if (userEmails.length === 0) return

    const currentFrom = getValues("from")
    const hasValidSelection = userEmails.some((option) => option.email === currentFrom)
    if (!currentFrom || !hasValidSelection) {
      setValue("from", pickDefaultSenderEmail(userEmails))
    }
  }, [userEmails, getValues, setValue])

  // Initialize email chips with contact email when sheet opens
  useEffect(() => {
    if (open && contact?.email) {
      setToEmails([contact.email])
      setCcEmails([])
      setBccEmails([])
    }
  }, [open, contact?._id, contact?.email])

  // Helper functions for email chip management
  const addEmail = (email: string, field: 'to' | 'cc' | 'bcc') => {
    if (!isValidEmail(email)) return
    
    const trimmedEmail = email.trim()
    
    switch (field) {
      case 'to':
        if (!toEmails.includes(trimmedEmail)) {
          setToEmails([...toEmails, trimmedEmail])
        }
        break
      case 'cc':
        if (!ccEmails.includes(trimmedEmail)) {
          setCcEmails([...ccEmails, trimmedEmail])
        }
        break
      case 'bcc':
        if (!bccEmails.includes(trimmedEmail)) {
          setBccEmails([...bccEmails, trimmedEmail])
        }
        break
    }
  }

  const removeEmail = (email: string, field: 'to' | 'cc' | 'bcc') => {
    switch (field) {
      case 'to':
        setToEmails(toEmails.filter(e => e !== email))
        break
      case 'cc':
        setCcEmails(ccEmails.filter(e => e !== email))
        break
      case 'bcc':
        setBccEmails(bccEmails.filter(e => e !== email))
        break
    }
  }


// Function to clear all form inputs and state
const clearAllInputs = () => {
  // Reset form fields to default values
  emailFormReset({
    subject: '',
    message: ''
  })

  // Clear additional state
  setAttachedFiles([])
  setSelectedTemplate(null)
  setShowCcBcc(false)
  setTemplateSearchQuery('')
  setToEmails(contact?.email ? [contact.email] : [])
  setCcEmails([])
  setBccEmails([])
}

// Function to check if form has content
const hasFormContent = () => {
  const formValues = watch()
  return (
    (formValues.subject && formValues.subject.trim() !== '') ||
    (formValues.message && formValues.message.trim() !== '') ||
    attachedFiles.length > 0 ||
    toEmails.length > (contact?.email ? 1 : 0) ||
    ccEmails.length > 0 ||
    bccEmails.length > 0
  )
}

// Function to clear inputs with confirmation if there's content
const clearInputsWithConfirmation = () => {
  if (hasFormContent()) {
    const confirmed = window.confirm('Are you sure you want to discard your email? All content will be lost.')
    if (confirmed) {
      clearAllInputs()
      return true
    }
    return false
  } else {
    clearAllInputs()
    return true
  }
}

const handleSendEmail = async (data: z.infer<typeof emailSchema>) => {
  if (!contact) return

  // Validate that we have at least one email in the to field
  if (toEmails.length === 0) {
    toast({
      title: "Error",
      description: "Please add at least one recipient email address.",
      variant: "destructive",
    })
    return
  }

  try {
    const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
    const token = userData.access_token

    // Prepare attachment list from attached files
    console.log("attachedFiles", attachedFiles)
    const attachmentList = attachedFiles.map(file => file.url).join(',')

    const formData = new FormData()
    formData.append('fromEmail', data.from)
    formData.append('subject', data.subject)
    formData.append('content', `${data.message}\n\n${emailSignature}`)
    formData.append('to', toEmails.join(','))
    formData.append('cc', ccEmails.join(','))
    formData.append('bcc', bccEmails.join(','))
    formData.append('associate_id', contact._id)
    formData.append('associate_to', contact.associate_to || 'company')
    formData.append('attachment_list', attachmentList)
    formData.append('thread_id', 'None')

    const response = await fetch(`${URLS.SINGLE_EMAIL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.msg || 'Network response was not ok');
    }

    // console.log("Email sent:", body)
    const result = await response.json()
    if (result.code !== 200) {
      throw new Error(result.msg || 'Failed to send email')
    }

    toast({
      title: "Email Sent",
      description: `Email has been sent successfully`,
      variant: "default",
    })

    try {
      if (typeof onEmailSent === 'function') {
        onEmailSent()
      }
    } catch (callbackError) {
      console.error('Error in onEmailSent callback:', callbackError)
    }

    clearAllInputs()
    if (typeof onOpenChange === 'function') {
      onOpenChange(false)
    }
  } catch (error: any) {
    toast({
      title: "Error",
      description: "Failed to send email. Please try again.",
      variant: "destructive",
    })
  }
  }

  // Handle sheet close with clearing inputs
  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const shouldClose = clearInputsWithConfirmation()
      if (shouldClose) {
        onOpenChange(isOpen)
      }
    } else {
      onOpenChange(isOpen)
    }
  }

  // Clear inputs when component unmounts or page is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearAllInputs()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        const shouldClose = clearInputsWithConfirmation()
        if (shouldClose) {
          onOpenChange(false)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])

  // Separate effect to clear inputs only when component unmounts
  useEffect(() => {
    return () => {
      clearAllInputs()
    }
  }, [])

  // Email chip input component
  const EmailChipInput = ({ 
    label, 
    emails, 
    field, 
    placeholder 
  }: { 
    label: string
    emails: string[]
    field: 'to' | 'cc' | 'bcc'
    placeholder: string
  }) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [inputValue, setInputValue] = useState('')

    return (
      <div className="space-y-2">
        <Label htmlFor={field} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <div
          className={cn(
            "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 shadow-xs transition-colors",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          )}
        >
          {emails.map((email) => (
            <Badge key={email} variant="secondary" className="gap-1 rounded-md px-2 py-0.5 font-normal">
              {email}
              <button
                type="button"
                className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    removeEmail(email, field)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => removeEmail(email, field)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            id={field}
            type="email"
            placeholder={emails.length === 0 ? placeholder : "Add another..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-7 min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                if (inputValue.trim()) {
                  addEmail(inputValue.trim(), field)
                  setInputValue('')
                }
              }
            }}
            onBlur={() => {
              if (inputValue.trim() && isValidEmail(inputValue.trim())) {
                addEmail(inputValue.trim(), field)
                setInputValue('')
              }
            }}
          />
        </div>
        {predefinedEmails.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {predefinedEmails
              .filter(email => 
                !emails.includes(email) && 
                (inputValue === '' || 
                 email.toLowerCase().includes(inputValue.toLowerCase()))
              )
              .slice(0, 5)
              .map((email) => (
                <Button
                  key={email}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    addEmail(email, field)
                    setInputValue('')
                    if (inputRef.current) {
                      inputRef.current.value = ''
                      inputRef.current.blur()
                    }
                  }}
                >
                  {email}
                </Button>
              ))
            }
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="right" className={sheetEmailContentClassName}>
          <form id="compose-email-form" className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit(handleSendEmail)}>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
              <SheetHeader className="p-0 pb-5">
                <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="h-5 w-5 text-primary" />
                  Compose Email
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  {contact?.contact_name
                    ? `Sending to ${contact.contact_name}`
                    : "Write and send an email to your contact."}
                </SheetDescription>
                <Separator className="mt-4" />
              </SheetHeader>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="from" className="text-sm font-medium text-foreground">
                    From
                  </Label>
                  <Select
                    value={watch("from") || undefined}
                    onValueChange={(value) => {
                      setValue("from", value)
                    }}
                  >
                    <SelectTrigger id="from" size="form" className={formSelectTriggerClassName}>
                      <SelectValue
                        placeholder={
                          isLoadingEmails && userEmails.length === 0
                            ? "Loading emails..."
                            : "Select your email"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {userEmails.map((item) => (
                        <SelectItem key={item.email} value={item.email}>
                          {formatSenderLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.from && (
                    <p className="text-sm text-destructive">{errors.from.message}</p>
                  )}
                </div>

                <div className="space-y-4">
                  <EmailChipInput
                    label="To"
                    emails={toEmails}
                    field="to"
                    placeholder="Add recipient email"
                  />

                  {!showCcBcc ? (
                    <button
                      type="button"
                      onClick={() => setShowCcBcc(true)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Add Cc / Bcc
                    </button>
                  ) : (
                    <>
                      <EmailChipInput
                        label="Cc"
                        emails={ccEmails}
                        field="cc"
                        placeholder="Add cc email"
                      />
                      <EmailChipInput
                        label="Bcc"
                        emails={bccEmails}
                        field="bcc"
                        placeholder="Add bcc email"
                      />
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="subject" className="text-sm font-medium text-foreground">
                      Subject
                    </Label>
                    <DropdownMenu open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                          <Template className="h-3.5 w-3.5" />
                          Templates
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[300px] max-h-[300px] overflow-y-auto">
                        <div className="p-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search templates..."
                              className="pl-8"
                              value={templateSearchQuery}
                              onChange={(e) => setTemplateSearchQuery(e.target.value)}
                            />
                          </div>
                        </div>

                        {recentlyUsedTemplates.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Recently Used</div>
                            {recentlyUsedTemplates.map((template) => (
                              <DropdownMenuItem key={template.id} onClick={() => handleTemplateSelect(template.id)}>
                                <span>{template.name}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {templateSearchQuery && filteredTemplates.length === 0 ? (
                          <div className="px-2 py-4 text-center text-sm text-muted-foreground">No templates found</div>
                        ) : (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">All Templates</div>
                            {filteredTemplates.length === 0 ? (
                              <div className="px-2 py-4 text-center text-sm text-muted-foreground">No templates found</div>
                            ) : (
                              filteredTemplates.map((template) => (
                                <DropdownMenuItem key={template.id} onClick={() => handleTemplateSelect(template.id)}>
                                  <span>{template.name}</span>
                                </DropdownMenuItem>
                              ))
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Input
                    id="subject"
                    placeholder="Enter email subject"
                    className={formInputClassName}
                    {...register('subject')}
                  />
                  {errors.subject && (
                    <p className="text-sm text-destructive">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium text-foreground">
                    Message
                  </Label>
                  <div className="email-quill-editor">
                    <ReactQuill
                      theme="snow"
                      className="min-h-[220px]"
                      value={watch('message')}
                      onChange={(content) => setValue('message', content)}
                      modules={{
                        toolbar: [
                          [{ header: [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline'],
                          [{ list: 'ordered' }, { list: 'bullet' }],
                          [{ align: [] }],
                          ['clean'],
                        ],
                      }}
                    />
                  </div>
                  {emailSignature && (
                    <div className="rounded-md border border-border bg-muted/30 p-3">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">
                        Email signature (added automatically)
                      </div>
                      <div
                        className="text-sm text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: emailSignature }}
                      />
                    </div>
                  )}
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message.message}</p>
                  )}
                </div>

                {attachedFiles.length > 0 && (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    <div className="text-sm font-medium text-foreground">Attachments</div>
                    <div className="space-y-2">
                      {attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="max-w-[240px] truncate">{file.name}</span>
                            {file.size && file.size !== "0 KB" && (
                              <span className="text-xs text-muted-foreground">({file.size})</span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => handleRemoveFile(file.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pb-4" />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
              <input type="file" ref={fileInputRef} className="hidden" multiple />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className={cn(footerButtonClass, "gap-1.5")}>
                    <Paperclip className="h-4 w-4" />
                    Attach
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem className="gap-2" onClick={handleBrowseFiles}>
                    <File className="h-4 w-4" />
                    Browse Files
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={() => setIsCRMDocumentsOpen(true)}>
                    <File className="h-4 w-4" />
                    CRM Documents
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex flex-row-reverse gap-3">
                <Button
                  type="submit"
                  className={footerButtonClass}
                  disabled={isSubmitting || toEmails.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={footerButtonClass}
                  onClick={() => {
                    const shouldClose = clearInputsWithConfirmation()
                    if (shouldClose) {
                      onOpenChange(false)
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* CRM Documents Drawer */}
      <CRMDocumentsSheet
        open={isCRMDocumentsOpen}
        onOpenChange={setIsCRMDocumentsOpen}
        onSelectDocuments={(docs) => {
          setAttachedFiles((prev) => [
            ...prev,
            ...docs.map((doc) => ({
              id: doc.id,
              name: doc.name,
              size: doc.size && doc.size !== "0 KB" ? doc.size : "",
              type: "crm" as const,
              url: doc.url || "",
            })),
          ])
        }}
      />
    </>
  )
}

function CRMDocumentsSheet({
  open,
  onOpenChange,
  onSelectDocuments,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectDocuments: (docsToAttach: CRMDocument[]) => void
}) {
  // Real CRM documents from Documents module
  const [folders, setFolders] = useState<Array<{ id: string; name: string; org_id?: string }>>([])
  const [folderFiles, setFolderFiles] = useState<Record<string, CRMDocument[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Helpers
  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return "0 B"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  // Fetch folders when the sheet opens
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        setLoading(true)
        setError(null)
        // Reset selections when opening
        setSelectedFiles(new Set())
        setExpandedFolders(new Set())
        setFolderFiles({})

        const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
        const token = userData.access_token
        const response = await fetch(`${URLS.folderList}?page=1&length=50&sort=folder_name&order=1`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`Failed to load folders (${response.status})`)
        }
        const result = await response.json()
        const items = Array.isArray(result.items) ? result.items : []
        const mapped = items
          .filter((it: any) => it.associate_to === 'folder')
          .map((it: any) => ({
            id: it._id,
            name: it.folder_name || 'Unnamed Folder',
            org_id: it.org_id
          }))
        setFolders(mapped)
      } catch (err: any) {
        setError(err.message || 'Failed to load folders')
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      fetchFolders()
    }
  }, [open])

  // Fetch files for a folder (lazy)
  const fetchFilesForFolder = async (folderId: string) => {
    try {
      setLoading(true)
      setError(null)
      const userData = JSON.parse(localStorage.getItem('map_user') || '{}')
      const token = userData.access_token
      const response = await fetch(`${URLS.folderList}?folder_id=${folderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error(`Failed to load folder files (${response.status})`)
      }
      const result = await response.json()
      const folderData = Array.isArray(result.items)
        ? result.items.find((it: any) => it._id === folderId)
        : null
      if (!folderData || !Array.isArray(folderData.files)) {
        setFolderFiles(prev => ({ ...prev, [folderId]: [] }))
        return
      }

      const orgId = folderData.org_id || localStorage.getItem('org_id') || "103"
      const folderName = folderData.folder_name || "Unnamed"
      const base = URLS.DOCUMENT_BASE_URL

      const files: CRMDocument[] = folderData.files.map((file: any) => {
        const size = typeof file.size === 'number' && file.size > 0 ? formatFileSize(file.size) : undefined
        const url = `${base}//uploads/commonDocs//${orgId}/${encodeURIComponent(folderName)}/${file.document}`
        return {
          id: (file._id && (file._id.$oid || file._id)) || Math.random().toString(36).slice(2),
          name: file.user_file_name,
          type: "file",
          size,
          url
        } as CRMDocument
      })
      setFolderFiles(prev => ({ ...prev, [folderId]: files }))
    } catch (err: any) {
      setError(err.message || 'Failed to load folder files')
      setFolderFiles(prev => ({ ...prev, [folderId]: [] }))
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
      // Lazy-load files when expanding a folder for the first time
      if (!folderFiles[folderId]) {
        fetchFilesForFolder(folderId)
      }
    }
    setExpandedFolders(newExpanded)
  }

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleConfirmSelection = () => {
    // Find all selected documents
    const findSelectedDocuments = (docs: CRMDocument[]): CRMDocument[] => {
      let selected: CRMDocument[] = []

      for (const doc of docs) {
        if (doc.type === "file" && selectedFiles.has(doc.id)) {
          selected.push(doc)
        } else if (doc.type === "folder" && doc.children) {
          selected = [...selected, ...findSelectedDocuments(doc.children)]
        }
      }

      return selected
    }

    const selectedDocs = findSelectedDocuments(computedDocs)
    onSelectDocuments(selectedDocs)
    onOpenChange(false)
  }

  // Build a document tree from folders and folderFiles for rendering
  const computedDocs: CRMDocument[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    type: "folder",
    children: (folderFiles[f.id] || []).map(doc => ({
      ...doc,
      type: "file"
    }))
  }))

  const renderDocuments = (docs: CRMDocument[], level = 0) => {
    return docs.map((doc) => (
      <div key={doc.id} style={{ paddingLeft: `${level * 16}px` }}>
        {doc.type === "folder" ? (
          <div className="py-1">
            <div
              className="flex items-center gap-2 hover:bg-muted rounded-md p-1.5 cursor-pointer"
              onClick={() => toggleFolder(doc.id)}
            >
              {expandedFolders.has(doc.id) ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{doc.name}</span>
            </div>
            {expandedFolders.has(doc.id) && doc.children && (
              <div className="mt-1">{renderDocuments(doc.children, level + 1)}</div>
            )}
          </div>
        ) : (
          <div
            className="flex items-center gap-2 hover:bg-muted rounded-md p-1.5 cursor-pointer ml-6"
            onClick={() => toggleFileSelection(doc.id)}
          >
            <Checkbox
              id={doc.id}
              checked={selectedFiles.has(doc.id)}
              onCheckedChange={() => toggleFileSelection(doc.id)}
            />
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1">{doc.name}</span>
            {doc.size && doc.size !== "0 KB" && (
              <span className="text-xs text-muted-foreground">{doc.size}</span>
            )}
          </div>
        )}
      </div>
    ))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-xl">CRM Documents</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="border rounded-md p-2 overflow-y-auto max-h-[calc(100vh-200px)]">
            {error ? (
              <div className="text-sm text-red-600 p-2">{error}</div>
            ) : loading && folders.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">Loading...</div>
            ) : folders.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2">No folders found</div>
            ) : (
              renderDocuments(computedDocs)
            )}
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmSelection} disabled={selectedFiles.size === 0}>
                Attach Selected
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

