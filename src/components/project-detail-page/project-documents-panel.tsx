"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Download, FileText, Loader2, Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"
import { getApiErrorMessage } from "@/lib/api"
import {
  fetchProjectDocuments,
  uploadProjectDocumentApi,
} from "@/lib/projects/project-api"
import type { ProjectDocument } from "@/lib/projects/types"

const CATEGORY_LABELS: Record<ProjectDocument["category"], string> = {
  legal: "Legal",
  layout: "Layout",
  brochure: "Brochure",
  kyc: "KYC",
  registration: "Registration",
  other: "Other",
}

interface ProjectDocumentsPanelProps {
  projectId: string
  onDocumentsCountChange?: (count: number) => void
}

function getDocumentUrl(documentPath: string) {
  if (!documentPath) return ""
  if (documentPath.startsWith("http://") || documentPath.startsWith("https://")) {
    return documentPath
  }
  if (documentPath.startsWith("/")) {
    return `${URLS.DOCUMENT_BASE_URL}${documentPath}`
  }
  return `${URLS.DOCUMENT_BASE_URL}/${documentPath}`
}

export function ProjectDocumentsPanel({
  projectId,
  onDocumentsCountChange,
}: ProjectDocumentsPanelProps) {
  const { toast } = useToast()
  const generalUploadRef = useRef<HTMLInputElement>(null)
  const cardInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const [isGeneralUploading, setIsGeneralUploading] = useState(false)

  const loadDocuments = useCallback(async () => {
    if (!projectId) {
      setDocuments([])
      onDocumentsCountChange?.(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const items = await fetchProjectDocuments(projectId)
      setDocuments(items)
      onDocumentsCountChange?.(items.length)
    } catch (error) {
      setDocuments([])
      onDocumentsCountChange?.(0)
      toast({
        title: "Error",
        description: getApiErrorMessage(error, "Failed to load documents."),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [onDocumentsCountChange, projectId, toast])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  const handleDocumentUpload = useCallback(
    async (file: File, documentId?: string, category?: ProjectDocument["category"]) => {
      if (!projectId) {
        toast({
          title: "Error",
          description: "Project not found",
          variant: "destructive",
        })
        return
      }

      const isCardUpload = Boolean(documentId)
      if (isCardUpload) {
        setUploadingDocId(documentId!)
      } else {
        setIsGeneralUploading(true)
      }

      try {
        await uploadProjectDocumentApi(projectId, {
          file,
          name: file.name,
          category: category ?? "other",
        })
        await loadDocuments()
        toast({
          title: "Success",
          description: "Document uploaded successfully",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: getApiErrorMessage(error, "Failed to upload document."),
          variant: "destructive",
        })
      } finally {
        setUploadingDocId(null)
        setIsGeneralUploading(false)
      }
    },
    [loadDocuments, projectId, toast],
  )

  const handleDocumentDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(getDocumentUrl(fileUrl))
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", fileName)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      })
    }
  }

  const openCardUpload = (documentId: string) => {
    cardInputRefs.current[documentId]?.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          DTCP/RERA approvals, layout copies, brochures, and registration bundles.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isGeneralUploading}
          onClick={() => generalUploadRef.current?.click()}
        >
          {isGeneralUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Upload
        </Button>
        <input
          ref={generalUploadRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              void handleDocumentUpload(file)
            }
            event.target.value = ""
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents...
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {documents.map((doc) => {
            const isUploading = uploadingDocId === doc._id

            return (
              <Card key={doc._id} className="border-slate-200/80 shadow-none">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{doc.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {CATEGORY_LABELS[doc.category]}
                      </Badge>
                      {doc.uploaded_at ? (
                        <span className="text-xs text-muted-foreground">
                          Uploaded {doc.uploaded_at}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={isUploading}
                      title="Upload document"
                      onClick={() => openCardUpload(doc._id)}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={!doc.file_url}
                      title="Download document"
                      onClick={() => {
                        if (doc.file_url) {
                          void handleDocumentDownload(doc.file_url, doc.name)
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    ref={(element) => {
                      cardInputRefs.current[doc._id] = element
                    }}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        void handleDocumentUpload(file, doc._id, doc.category)
                      }
                      event.target.value = ""
                    }}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
