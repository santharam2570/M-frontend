"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  User,
} from "lucide-react"
import { URLS } from "@/config/urls"
import { getApiErrorMessage, parseJsonResponse } from "@/lib/api"
import { getStoredAuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  sheetEmailContentClassName,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"

export type EmailHistory = {
  id: string
  subject: string
  to: string
  from: string
  body: string
  sentDate: Date
  sentBy: string
  thread_id?: string
  create_date?: string
  create_time?: string
  createBy?: string
  fromEmail?: string
  content?: string
  content_full?: string
  cc?: string
  attachment?: string[]
  attachments?: {
    id: string
    name: string
    size: string
    type: "local" | "crm"
  }[]
}

type EmailCommunication = {
  id: string
  subject: string
  to: string
  from: string
  content: string
  content_full?: string
  create_date: string
  create_time: string
  createBy: string
  fromEmail: string
  thread_id: string
  cc?: string
  attachment?: string[]
  attachments?: {
    id: string
    name: string
    size: string
    type: "local" | "crm"
  }[]
}

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function coerceEmailValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value.trim()
  if (typeof value === "number") return String(value)
  if (Array.isArray(value)) {
    return parseRecipients(value).join(", ")
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    const email = record.email ?? record.address ?? record.value ?? record.name
    if (typeof email === "string") return email.trim()
  }
  return ""
}

function parseRecipients(value: unknown): string[] {
  if (value == null) return []

  if (Array.isArray(value)) {
    return value.flatMap((entry) => parseRecipients(entry))
  }

  if (typeof value === "object") {
    const coerced = coerceEmailValue(value)
    return coerced ? [coerced] : []
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return []
    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === "number") {
    return [String(value)]
  }

  return []
}

function normalizeThreadEmail(email: EmailCommunication): EmailCommunication {
  return {
    ...email,
    to: coerceEmailValue(email.to),
    from: coerceEmailValue(email.from),
    fromEmail: coerceEmailValue(email.fromEmail) || coerceEmailValue(email.from),
    cc: coerceEmailValue(email.cc),
  }
}

function toEmailCommunication(email: EmailHistory): EmailCommunication {
  return normalizeThreadEmail({
    id: email.id,
    subject: email.subject,
    to: email.to as string,
    from: email.from,
    content: email.content || email.body || "",
    content_full: email.content_full,
    create_date: email.create_date || "",
    create_time: email.create_time || "",
    createBy: email.createBy || email.sentBy || "Unknown",
    fromEmail: email.fromEmail || email.from || "",
    thread_id: email.thread_id || "",
    cc: email.cc as string | undefined,
    attachment: email.attachment,
    attachments: email.attachments,
  })
}

function getMessageTimestamp(email: EmailCommunication): number {
  const parsed = new Date(`${email.create_date} ${email.create_time}`).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function cleanAttachmentUrl(url: string): string {
  try {
    if (!url || typeof url !== "string") return ""

    if (url.includes("https://") && url.includes("http://localhost")) {
      const httpsIndex = url.indexOf("https://")
      if (httpsIndex >= 0) return url.substring(httpsIndex)
    }

    if (url.includes("http://") && url.includes("http://localhost") && !url.includes("https://")) {
      const parts = url.split("http://")
      if (parts.length > 2) return `http://${parts[2]}`
      const httpIndex = url.lastIndexOf("http://")
      if (httpIndex > 0) return url.substring(httpIndex)
    }

    return url.trim()
  } catch {
    return url || ""
  }
}

function getFileNameFromUrl(url: string): string {
  try {
    if (!url || typeof url !== "string") return "attachment"

    const cleanUrl = cleanAttachmentUrl(url)
    if (!cleanUrl) return "attachment"

    const urlPath = cleanUrl.split("/").pop() || ""
    if (!urlPath) return "attachment"

    try {
      return decodeURIComponent(urlPath) || "attachment"
    } catch {
      return urlPath || "attachment"
    }
  } catch {
    return "attachment"
  }
}

function RecipientBadges({ recipients }: { recipients: string[] }) {
  if (recipients.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {recipients.map((recipient) => (
        <Badge
          key={recipient}
          variant="secondary"
          className="max-w-full truncate rounded-md px-2 py-0.5 font-normal"
        >
          {recipient}
        </Badge>
      ))}
    </div>
  )
}

function MetaField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[72px_1fr] items-start gap-3">
      <span className="pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function EmailMessageBody({ html }: { html: string }) {
  const content = html?.trim() || "<p class='text-muted-foreground'>No message content.</p>"

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4 text-sm leading-relaxed text-foreground",
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-headings:font-medium prose-headings:text-foreground",
        "prose-p:my-2 prose-p:text-foreground/90",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-pre:rounded-md prose-pre:border prose-pre:bg-muted/50"
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

function AttachmentRow({
  fileName,
  subtitle,
  onOpen,
  onDownload,
}: {
  fileName: string
  subtitle?: string
  onOpen?: () => void
  onDownload?: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{fileName}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpen}
            title={`Open ${fileName}`}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : null}
        {onDownload ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDownload}
            title={`Download ${fileName}`}
          >
            <Download className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function EmailAttachments({
  attachmentUrls = [],
  legacyAttachments = [],
  onViewUrl,
  onDownloadLegacy,
}: {
  attachmentUrls?: string[]
  legacyAttachments?: EmailCommunication["attachments"]
  onViewUrl: (url: string, fileName: string) => void
  onDownloadLegacy: (id: string, fileName: string) => void
}) {
  const totalCount = attachmentUrls.length + (legacyAttachments?.length ?? 0)
  if (totalCount === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span>
          {totalCount} attachment{totalCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-2">
        {attachmentUrls
          .filter((url) => url && typeof url === "string")
          .map((attachmentUrl, index) => {
            const fileName = getFileNameFromUrl(attachmentUrl)
            return (
              <AttachmentRow
                key={`${attachmentUrl}-${index}`}
                fileName={fileName}
                subtitle="Click to open"
                onOpen={() => onViewUrl(attachmentUrl, fileName)}
              />
            )
          })}
        {legacyAttachments?.map((file) => (
          <AttachmentRow
            key={file.id}
            fileName={file.name}
            subtitle={file.size}
            onDownload={() => onDownloadLegacy(file.id, file.name)}
          />
        ))}
      </div>
    </div>
  )
}

function ThreadMessageCard({
  message,
  isActive,
  onViewUrl,
  onDownloadLegacy,
}: {
  message: EmailCommunication
  isActive: boolean
  onViewUrl: (url: string, fileName: string) => void
  onDownloadLegacy: (id: string, fileName: string) => void
}) {
  const sender = message.createBy || coerceEmailValue(message.fromEmail) || "Unknown sender"
  const body = message.content_full || message.content || ""
  const fromDisplay =
    coerceEmailValue(message.fromEmail) || coerceEmailValue(message.from) || "—"
  const toDisplay = parseRecipients(message.to).join(", ") || "—"

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 shadow-xs transition-shadow",
        isActive && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {getInitials(sender)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{sender}</span>
            {isActive ? (
              <Badge variant="secondary" className="rounded-md bg-primary/10 text-primary">
                Selected
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {message.create_date || "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {message.create_time || "—"}
            </span>
          </div>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {fromDisplay} → {toDisplay}
          </p>
        </div>
      </div>

      {message.subject ? (
        <p className="mb-3 text-sm font-medium text-foreground">{message.subject}</p>
      ) : null}

      <EmailMessageBody html={body.replace(/\n/g, "<br />")} />

      <div className="mt-4">
        <EmailAttachments
          attachmentUrls={message.attachment}
          legacyAttachments={message.attachments}
          onViewUrl={onViewUrl}
          onDownloadLegacy={onDownloadLegacy}
        />
      </div>
    </article>
  )
}

function EmailPreviewSheet({
  open,
  onOpenChange,
  email,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: EmailHistory | null
}) {
  const [emailThread, setEmailThread] = useState<EmailCommunication[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleAttachmentViewInNewTab = async (attachmentUrl: string) => {
    try {
      if (!attachmentUrl || typeof attachmentUrl !== "string") {
        throw new Error("Invalid attachment URL")
      }

      const stored = getStoredAuthUser()
      const token = stored?.access_token
      if (!token) throw new Error("User not authenticated")

      const cleanUrl = cleanAttachmentUrl(attachmentUrl)
      if (!cleanUrl) throw new Error("Invalid attachment URL")

      try {
        const response = await fetch(cleanUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          window.open(cleanUrl, "_blank", "noopener,noreferrer")
          return
        }

        const blob = await response.blob()
        if (!blob || blob.size === 0) {
          window.open(cleanUrl, "_blank", "noopener,noreferrer")
          return
        }

        const blobUrl = window.URL.createObjectURL(blob)
        const newTab = window.open(blobUrl, "_blank", "noopener,noreferrer")

        if (newTab) {
          setTimeout(() => {
            try {
              window.URL.revokeObjectURL(blobUrl)
            } catch {
              // ignore cleanup errors
            }
          }, 1000)
        } else {
          window.URL.revokeObjectURL(blobUrl)
        }
      } catch {
        window.open(cleanUrl, "_blank", "noopener,noreferrer")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to open attachment"),
        variant: "destructive",
      })
    }
  }

  const handleAttachmentDownload = async (attachmentId: string, fileName: string) => {
    try {
      const stored = getStoredAuthUser()
      const token = stored?.access_token
      if (!token) throw new Error("User not authenticated")

      const response = await fetch(`${URLS.EMAIL_ATTACHMENT_DOWNLOAD}/${attachmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error("Failed to download attachment")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(anchor)

      toast({
        title: "Downloaded",
        description: `${fileName} saved successfully.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to download attachment"),
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (!open) {
      setEmailThread([])
      setThreadError(null)
      return
    }

    if (!email?.thread_id) return

    const fetchEmailThread = async () => {
      setIsLoadingThread(true)
      setThreadError(null)

      try {
        const stored = getStoredAuthUser()
        const token = stored?.access_token
        if (!token) throw new Error("Authentication token not found")

        const response = await fetch(
          `${URLS.EMAIL_COMMUNICATION_STREAMLINED}?thread_id=${email.thread_id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        )

        const result = await parseJsonResponse<{
          code?: number
          msg?: string
          data?: { emails?: EmailCommunication[] }
        }>(response)

        if (result.code === 200 && Array.isArray(result.data?.emails)) {
          setEmailThread(result.data.emails.map(normalizeThreadEmail))
        } else {
          throw new Error(result.msg || "Failed to fetch email thread")
        }
      } catch (error) {
        setThreadError(getApiErrorMessage(error, "Failed to fetch email thread"))
      } finally {
        setIsLoadingThread(false)
      }
    }

    void fetchEmailThread()
  }, [open, email?.thread_id])

  const primaryEmail = useMemo(
    () => (email ? toEmailCommunication(email) : null),
    [email]
  )

  const conversation = useMemo(() => {
    if (!primaryEmail) return []

    if (emailThread.length > 0) {
      return [...emailThread].sort(
        (a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
      )
    }

    return [primaryEmail]
  }, [emailThread, primaryEmail])

  if (!email || !primaryEmail) return null

  const headerSubject = primaryEmail.subject || "No subject"
  const sentBy = primaryEmail.createBy || email.sentBy || "Unknown"
  const fromAddress =
    coerceEmailValue(primaryEmail.fromEmail) || coerceEmailValue(primaryEmail.from)
  const toRecipients = parseRecipients(primaryEmail.to)
  const ccRecipients = parseRecipients(primaryEmail.cc)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(sheetEmailContentClassName, "data-[side=right]:sm:max-w-2xl")}
      >
        <SheetHeader className="shrink-0 space-y-0 border-b px-6 pb-4 pt-6">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Email Details
                </span>
              </div>
              <SheetTitle className="text-left text-xl font-semibold leading-snug">
                {headerSubject}
              </SheetTitle>
              <SheetDescription className="text-left text-sm text-muted-foreground">
                Review the message, recipients, and full conversation thread.
              </SheetDescription>
            </div>
            <Badge className="shrink-0 border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              Sent
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {primaryEmail.create_date || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {primaryEmail.create_time || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {sentBy}
            </span>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 px-6 py-6">
            <section className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Recipients</h3>
              <div className="space-y-3">
                <MetaField label="From">
                  <RecipientBadges recipients={fromAddress ? [fromAddress] : []} />
                </MetaField>
                <MetaField label="To">
                  <RecipientBadges recipients={toRecipients} />
                </MetaField>
                {ccRecipients.length > 0 ? (
                  <MetaField label="Cc">
                    <RecipientBadges recipients={ccRecipients} />
                  </MetaField>
                ) : null}
              </div>
            </section>

            {email.thread_id ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Conversation</h3>
                    <Badge variant="secondary" className="rounded-md">
                      {conversation.length} message{conversation.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {isLoadingThread ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading thread
                    </span>
                  ) : null}
                </div>

                {threadError ? (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {threadError}
                  </div>
                ) : null}

                {isLoadingThread && conversation.length <= 1 ? (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversation.map((message, index) => (
                      <div key={message.id || `${message.create_date}-${index}`} className="relative">
                        {index > 0 ? (
                          <div className="mb-3 flex justify-center">
                            <div className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] text-muted-foreground">
                              <ArrowDown className="h-3 w-3" />
                              Earlier message
                            </div>
                          </div>
                        ) : null}
                        <ThreadMessageCard
                          message={message}
                          isActive={message.id === email.id}
                          onViewUrl={handleAttachmentViewInNewTab}
                          onDownloadLegacy={handleAttachmentDownload}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Message</h3>
                <ThreadMessageCard
                  message={primaryEmail}
                  isActive
                  onViewUrl={handleAttachmentViewInNewTab}
                  onDownloadLegacy={handleAttachmentDownload}
                />
              </section>
            )}
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center justify-end border-t px-6 py-4">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default EmailPreviewSheet
