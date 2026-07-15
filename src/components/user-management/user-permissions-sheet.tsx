"use client"

import * as React from "react"
import { ChevronRight, ExternalLink, FileText, Loader2 } from "lucide-react"

import { DocumentUploadCard } from "@/components/document-upload-card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  sheetFormContentClassName,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { permissionModules as staticPermissionModules } from "@/config/permissions-modules"
import URLS from "@/config/urls"
import { type RoleTier } from "@/lib/auth"
import {
  formInputClassName,
  formModalHeaderClassName,
  formModalLabelClassName,
  formModalRequiredClassName,
  leadDetailFieldValueClassName,
  themeActiveTabTriggerClassName,
  themePrimaryButtonSmClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

export interface PermissionModuleOption {
  id: string
  name: string
  color: string
  functions: Array<{
    id: string
    name: string
    description: string
  }>
}

export interface UserPermissionsUser {
  id: string
  name: string
  email: string
  role_tier: RoleTier
  branch_id?: string
  status: "Active" | "Inactive"
  aadhaar_number?: string
  aadhaar_document?: string
  pan_number?: string
  pan_document?: string
  address?: string
  source?: string
  referred_by?: string
  reference_contact_number?: string
  passport_number?: string
}

export interface UserDetailsSavePayload {
  aadhaar_number: string
  pan_number: string
  address: string
  source: string
  referred_by: string
  reference_contact_number: string
  passport_number: string
}

type UserDetailsFieldErrors = Partial<Record<keyof UserDetailsSavePayload, string>>

type UserDocumentFieldErrors = {
  aadhaar_document?: string
  pan_document?: string
}

interface UserPermissionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserPermissionsUser | null
  permissions: Record<string, boolean>
  permissionModules?: PermissionModuleOption[]
  isLoading: boolean
  canEdit: boolean
  canEditPermissions?: boolean
  currentTier: RoleTier
  currentUserPermissions: Record<string, boolean>
  onTogglePermission: (functionId: string) => void
  onSaveDetails?: (details: UserDetailsSavePayload) => Promise<boolean>
  onUploadAadhaarDocument?: (file: File) => Promise<string | null>
  onUploadPanDocument?: (file: File) => Promise<string | null>
}

const IDENTITY_DOCUMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024
const IDENTITY_DOCUMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf"
const IDENTITY_DOCUMENT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

function resolveDocumentUrl(document?: string | null): string {
  if (!document) return ""
  if (document.startsWith("http")) return document

  const baseUrl = URLS.DOCUMENT_BASE_URL || ""
  if (!baseUrl) return document
  if (document.startsWith("/")) return `${baseUrl}${document}`
  return `${baseUrl}/uploads/${document}`
}

function PermissionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

function DetailInputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  maxLength,
  error,
  required = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  error?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={formModalLabelClassName}>
        {label}
        {required ? <span className={formModalRequiredClassName}> *</span> : null}
      </Label>
      <Input
        id={id}
        className={cn(formInputClassName, error && "border-destructive focus-visible:ring-destructive/30")}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function buildUserDetailsFormState(user: UserPermissionsUser): UserDetailsSavePayload {
  return {
    aadhaar_number: user.aadhaar_number ?? "",
    pan_number: user.pan_number ?? "",
    address: user.address ?? "",
    source: user.source ?? "",
    referred_by: user.referred_by ?? "",
    reference_contact_number: user.reference_contact_number ?? "",
    passport_number: user.passport_number ?? "",
  }
}

function validateUserDetailsForm(details: UserDetailsSavePayload): UserDetailsFieldErrors {
  const errors: UserDetailsFieldErrors = {}
  const aadhaar = details.aadhaar_number.trim()
  const pan = details.pan_number.trim().toUpperCase()
  const address = details.address.trim()
  const source = details.source.trim()
  const referredBy = details.referred_by.trim()
  const referenceContact = details.reference_contact_number.trim()
  const passport = details.passport_number.trim().toUpperCase()

  if (!aadhaar) {
    errors.aadhaar_number = "Aadhaar number is required."
  } else if (!/^\d{12}$/.test(aadhaar)) {
    errors.aadhaar_number = "Aadhaar number must be exactly 12 digits."
  }

  if (!pan) {
    errors.pan_number = "PAN number is required."
  } else if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) {
    errors.pan_number = "Enter a valid PAN number (e.g. ABCDE1234F)."
  }

  if (!address) {
    errors.address = "Address is required."
  }

  if (!source) {
    errors.source = "Source is required."
  }

  if (!referredBy) {
    errors.referred_by = "Referred by is required."
  }

  if (!referenceContact) {
    errors.reference_contact_number = "Reference contact number is required."
  } else if (!/^\d{10,15}$/.test(referenceContact)) {
    errors.reference_contact_number = "Enter a valid contact number (10-15 digits)."
  }

  if (passport && !/^[A-Z0-9]{6,12}$/.test(passport)) {
    errors.passport_number = "Passport number must be 6-12 letters or numbers."
  }

  return errors
}

function validateUserDocuments(
  aadhaarDocument?: string,
  panDocument?: string
): UserDocumentFieldErrors {
  const errors: UserDocumentFieldErrors = {}

  if (!aadhaarDocument?.trim()) {
    errors.aadhaar_document = "Aadhaar document is required."
  }

  if (!panDocument?.trim()) {
    errors.pan_document = "PAN document is required."
  }

  return errors
}

function normalizeUserDetailsForm(details: UserDetailsSavePayload): UserDetailsSavePayload {
  return {
    aadhaar_number: details.aadhaar_number.trim(),
    pan_number: details.pan_number.trim().toUpperCase(),
    address: details.address.trim(),
    source: details.source.trim(),
    referred_by: details.referred_by.trim(),
    reference_contact_number: details.reference_contact_number.trim(),
    passport_number: details.passport_number.trim().toUpperCase(),
  }
}

function hasUserDetailsChanges(current: UserDetailsSavePayload, saved: UserDetailsSavePayload) {
  const normalizedCurrent = normalizeUserDetailsForm(current)
  const normalizedSaved = normalizeUserDetailsForm(saved)

  return (Object.keys(normalizedCurrent) as Array<keyof UserDetailsSavePayload>).some(
    (key) => normalizedCurrent[key] !== normalizedSaved[key]
  )
}

function IdentityDocumentUploadField({
  label,
  documentUrl,
  defaultFileName,
  uploadDescription,
  canEdit,
  disabled,
  isUploading,
  onUpload,
  required = false,
  error,
}: {
  label: string
  documentUrl?: string | null
  defaultFileName: string
  uploadDescription: string
  canEdit: boolean
  disabled?: boolean
  isUploading?: boolean
  onUpload?: (file: File) => Promise<void>
  required?: boolean
  error?: string
}) {
  const resolvedUrl = resolveDocumentUrl(documentUrl)
  const fileName = resolvedUrl
    ? decodeURIComponent(resolvedUrl.split("/").pop() || defaultFileName)
    : null

  return (
    <div className="space-y-2">
      <Label className={formModalLabelClassName}>
        {label}
        {required ? <span className={formModalRequiredClassName}> *</span> : null}
      </Label>

      {resolvedUrl ? (
        <a
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{fileName}</p>
            <p className="text-xs text-primary">View uploaded document</p>
          </div>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </a>
      ) : null}

      {canEdit && onUpload ? (
        <div className="relative">
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading document...
            </div>
          ) : (
            <DocumentUploadCard
              accept={IDENTITY_DOCUMENT_ACCEPT}
              disabled={disabled}
              description={uploadDescription}
              className={cn(
                "border-border shadow-none",
                error && "border-destructive ring-1 ring-destructive/30"
              )}
              onFileSelect={onUpload}
            />
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Supported formats: JPG, PNG, WEBP, PDF. Max size 5 MB.
          </p>
        </div>
      ) : !resolvedUrl ? (
        <p className={leadDetailFieldValueClassName}>—</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function UserDetailsContent({
  user,
  canEdit,
  onSaveDetails,
  onUploadAadhaarDocument,
  onUploadPanDocument,
}: {
  user: UserPermissionsUser
  canEdit: boolean
  onSaveDetails?: (details: UserDetailsSavePayload) => Promise<boolean>
  onUploadAadhaarDocument?: (file: File) => Promise<string | null>
  onUploadPanDocument?: (file: File) => Promise<string | null>
}) {
  const { toast } = useToast()
  const savedDetails = React.useMemo(() => buildUserDetailsFormState(user), [user])
  const [formDetails, setFormDetails] = React.useState<UserDetailsSavePayload>(savedDetails)
  const [fieldErrors, setFieldErrors] = React.useState<UserDetailsFieldErrors>({})
  const [documentErrors, setDocumentErrors] = React.useState<UserDocumentFieldErrors>({})
  const [aadhaarDocument, setAadhaarDocument] = React.useState(user.aadhaar_document ?? "")
  const [panDocument, setPanDocument] = React.useState(user.pan_document ?? "")
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploadingAadhaar, setIsUploadingAadhaar] = React.useState(false)
  const [isUploadingPan, setIsUploadingPan] = React.useState(false)

  React.useEffect(() => {
    const nextDetails = buildUserDetailsFormState(user)
    setFormDetails(nextDetails)
    setFieldErrors({})
    setDocumentErrors({})
    setAadhaarDocument(user.aadhaar_document ?? "")
    setPanDocument(user.pan_document ?? "")
  }, [user])

  const hasChanges = hasUserDetailsChanges(formDetails, savedDetails)

  const updateFormField = <K extends keyof UserDetailsSavePayload>(
    key: K,
    value: UserDetailsSavePayload[K]
  ) => {
    setFormDetails((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validateIdentityDocument = (file: File, documentLabel: string) => {
    if (!IDENTITY_DOCUMENT_ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WEBP, or PDF file.",
        variant: "destructive",
      })
      return false
    }

    if (file.size > IDENTITY_DOCUMENT_MAX_SIZE_BYTES) {
      toast({
        title: "File too large",
        description: `${documentLabel} must be under 5 MB.`,
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleAadhaarUpload = async (file: File) => {
    if (!onUploadAadhaarDocument || !validateIdentityDocument(file, "Aadhaar document")) return

    setIsUploadingAadhaar(true)
    try {
      const uploadedDocument = await onUploadAadhaarDocument(file)
      if (uploadedDocument) {
        setAadhaarDocument(uploadedDocument)
        setDocumentErrors((prev) => ({ ...prev, aadhaar_document: undefined }))
      }
    } finally {
      setIsUploadingAadhaar(false)
    }
  }

  const handlePanUpload = async (file: File) => {
    if (!onUploadPanDocument || !validateIdentityDocument(file, "PAN document")) return

    setIsUploadingPan(true)
    try {
      const uploadedDocument = await onUploadPanDocument(file)
      if (uploadedDocument) {
        setPanDocument(uploadedDocument)
        setDocumentErrors((prev) => ({ ...prev, pan_document: undefined }))
      }
    } finally {
      setIsUploadingPan(false)
    }
  }

  const handleSave = async () => {
    if (!onSaveDetails) return

    const normalizedDetails = normalizeUserDetailsForm(formDetails)
    const errors = validateUserDetailsForm(normalizedDetails)
    const docErrors = validateUserDocuments(aadhaarDocument, panDocument)
    const hasValidationErrors =
      Object.keys(errors).length > 0 || Object.keys(docErrors).length > 0

    if (hasValidationErrors) {
      setFieldErrors(errors)
      setDocumentErrors(docErrors)
      toast({
        title: "Validation error",
        description: "Please complete all required fields and upload both documents before saving.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const success = await onSaveDetails(normalizedDetails)
      if (success) {
        setFormDetails(normalizedDetails)
        setFieldErrors({})
        setDocumentErrors({})
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Aadhaar</h3>
        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
          <DetailInputField
            id={`aadhaar-number-${user.id}`}
            label="Aadhaar Number"
            value={formDetails.aadhaar_number}
            onChange={(value) =>
              updateFormField("aadhaar_number", value.replace(/\D/g, "").slice(0, 12))
            }
            placeholder="Enter 12-digit Aadhaar number"
            disabled={!canEdit || isSaving}
            maxLength={12}
            required
            error={fieldErrors.aadhaar_number}
          />
          <IdentityDocumentUploadField
            label="Aadhaar Document"
            documentUrl={aadhaarDocument}
            defaultFileName="Aadhaar document"
            uploadDescription="Drag and drop Aadhaar document here or"
            canEdit={canEdit}
            disabled={isSaving}
            isUploading={isUploadingAadhaar}
            onUpload={onUploadAadhaarDocument ? handleAadhaarUpload : undefined}
            required
            error={documentErrors.aadhaar_document}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">PAN</h3>
        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
          <DetailInputField
            id={`pan-number-${user.id}`}
            label="PAN Number"
            value={formDetails.pan_number}
            onChange={(value) =>
              updateFormField(
                "pan_number",
                value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
              )
            }
            placeholder="ABCDE1234F"
            disabled={!canEdit || isSaving}
            maxLength={10}
            required
            error={fieldErrors.pan_number}
          />
          <IdentityDocumentUploadField
            label="PAN Document"
            documentUrl={panDocument}
            defaultFileName="PAN document"
            uploadDescription="Drag and drop PAN document here or"
            canEdit={canEdit}
            disabled={isSaving}
            isUploading={isUploadingPan}
            onUpload={onUploadPanDocument ? handlePanUpload : undefined}
            required
            error={documentErrors.pan_document}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Additional Details</h3>
        <div className="grid gap-4 rounded-lg border bg-muted/20 p-4">
          <DetailInputField
            id={`address-${user.id}`}
            label="Address"
            value={formDetails.address}
            onChange={(value) => updateFormField("address", value)}
            placeholder="Enter full address"
            disabled={!canEdit || isSaving}
            maxLength={500}
            required
            error={fieldErrors.address}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailInputField
              id={`source-${user.id}`}
              label="Source"
              value={formDetails.source}
              onChange={(value) => updateFormField("source", value)}
              placeholder="e.g. Website, Referral, Walk-in"
              disabled={!canEdit || isSaving}
              maxLength={100}
              required
              error={fieldErrors.source}
            />
            <DetailInputField
              id={`referred-by-${user.id}`}
              label="Referred By"
              value={formDetails.referred_by}
              onChange={(value) => updateFormField("referred_by", value)}
              placeholder="Enter referrer name"
              disabled={!canEdit || isSaving}
              maxLength={100}
              required
              error={fieldErrors.referred_by}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailInputField
              id={`reference-contact-${user.id}`}
              label="Reference Contact Number"
              value={formDetails.reference_contact_number}
              onChange={(value) =>
                updateFormField(
                  "reference_contact_number",
                  value.replace(/\D/g, "").slice(0, 15)
                )
              }
              placeholder="Enter 10-digit contact number"
              disabled={!canEdit || isSaving}
              maxLength={15}
              required
              error={fieldErrors.reference_contact_number}
            />
            <DetailInputField
              id={`passport-number-${user.id}`}
              label="Passport Number"
              value={formDetails.passport_number}
              onChange={(value) =>
                updateFormField(
                  "passport_number",
                  value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)
                )
              }
              placeholder="e.g. A1234567 (optional)"
              disabled={!canEdit || isSaving}
              maxLength={12}
              error={fieldErrors.passport_number}
            />
          </div>
        </div>
      </section>

      {canEdit && onSaveDetails ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className={themePrimaryButtonSmClassName}
            onClick={() => void handleSave()}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? "Saving..." : "Save Details"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function UserPermissionsContent({
  permissions,
  permissionModules,
  isLoading,
  canEditPermissions,
  isProtectedSuperAdmin,
  currentTier,
  currentUserPermissions,
  onTogglePermission,
}: {
  permissions: Record<string, boolean>
  permissionModules: PermissionModuleOption[]
  isLoading: boolean
  canEditPermissions: boolean
  isProtectedSuperAdmin: boolean
  currentTier: RoleTier
  currentUserPermissions: Record<string, boolean>
  onTogglePermission: (functionId: string) => void
}) {
  if (isLoading) {
    return <PermissionsSkeleton />
  }

  return (
    <div className="space-y-4">
      <SheetDescription className="text-sm text-muted-foreground">
        {canEditPermissions
          ? "Manage permissions for this user. Changes are saved automatically and override their role defaults."
          : isProtectedSuperAdmin
            ? "Super Admin role and tier are protected. Permissions are view-only."
            : "You have view-only access to this user's permissions."}
      </SheetDescription>

      <div className="space-y-3">
        {permissionModules.map((module) => (
          <Collapsible
            key={module.id}
            className="group/collapsible overflow-hidden rounded-lg border"
            defaultOpen={module.id.trim() === "lead"}
          >
            <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50">
              <span
                className="min-w-0 flex-1 truncate text-sm font-semibold"
                style={{ color: module.color }}
              >
                {module.name}
              </span>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {module.functions.filter((func) => permissions[func.id]).length}/
                  {module.functions.length}
                  <span className="hidden sm:inline"> enabled</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out group-data-[state=open]/collapsible:rotate-90" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=open]:grid-rows-[1fr]">
              <div className="min-h-0 overflow-hidden">
                <div className="border-t bg-muted/30">
                  {module.functions.map((func, index) => {
                    const managerBlocked =
                      (currentTier === "branch_manager" || currentTier === "branch_user") &&
                      !currentUserPermissions[func.id] &&
                      canEditPermissions
                    const switchDisabled = !canEditPermissions || managerBlocked

                    return (
                      <div
                        key={func.id}
                        className={cn(
                          "flex items-center justify-between p-3 transition-colors hover:bg-muted/50",
                          index !== module.functions.length - 1 && "border-b border-border"
                        )}
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-sm font-medium text-foreground">{func.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {func.description}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              permissions[func.id] ? "text-primary" : "text-muted-foreground"
                            )}
                          >
                            {permissions[func.id] ? "ON" : "OFF"}
                          </span>
                          <Switch
                            checked={permissions[func.id] || false}
                            onCheckedChange={() => onTogglePermission(func.id)}
                            disabled={switchDisabled}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}

export function UserPermissionsSheet({
  open,
  onOpenChange,
  user,
  permissions,
  permissionModules,
  isLoading,
  canEdit,
  canEditPermissions,
  currentTier,
  currentUserPermissions,
  onTogglePermission,
  onSaveDetails,
  onUploadAadhaarDocument,
  onUploadPanDocument,
}: UserPermissionsSheetProps) {
  const [activeTab, setActiveTab] = React.useState("details")
  const resolvedCanEditPermissions = canEditPermissions ?? canEdit
  const isProtectedSuperAdmin = user?.role_tier === "super_admin"
  const resolvedPermissionModules =
    permissionModules && permissionModules.length > 0
      ? permissionModules
      : staticPermissionModules

  React.useEffect(() => {
    if (open) {
      setActiveTab("details")
    }
  }, [open, user?.id])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(sheetFormContentClassName, "data-[side=right]:sm:max-w-lg")}
      >
        <SheetHeader className={cn(formModalHeaderClassName, "space-y-1")}>
          <SheetTitle className="text-lg font-semibold tracking-tight text-primary">
            {user?.name ?? "User"}
          </SheetTitle>
          {user && (
            <SheetDescription className="truncate text-sm text-muted-foreground">
              {user.email}
            </SheetDescription>
          )}
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="h-auto w-full shrink-0 justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent px-4 py-0 sm:px-6">
            <TabsTrigger
              value="details"
              className={cn(themeActiveTabTriggerClassName, "rounded-none shadow-none")}
            >
              User Details
            </TabsTrigger>
            <TabsTrigger
              value="permissions"
              className={cn(themeActiveTabTriggerClassName, "rounded-none shadow-none")}
            >
              User Permissions
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="details"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-5 focus-visible:outline-none sm:px-6"
          >
            {user ? (
              <UserDetailsContent
                user={user}
                canEdit={canEdit}
                onSaveDetails={onSaveDetails}
                onUploadAadhaarDocument={onUploadAadhaarDocument}
                onUploadPanDocument={onUploadPanDocument}
              />
            ) : null}
          </TabsContent>

          <TabsContent
            value="permissions"
            className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-5 focus-visible:outline-none sm:px-6"
          >
            <UserPermissionsContent
              permissions={permissions}
              permissionModules={resolvedPermissionModules}
              isLoading={isLoading}
              canEditPermissions={resolvedCanEditPermissions}
              isProtectedSuperAdmin={isProtectedSuperAdmin}
              currentTier={currentTier}
              currentUserPermissions={currentUserPermissions}
              onTogglePermission={onTogglePermission}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
