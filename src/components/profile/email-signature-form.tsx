"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { isEmptyEditorHtml, RichTextEditor } from "@/components/ui/rich-text-editor"
import { useToast } from "@/hooks/use-toast"
import {
  fetchEmailSignature,
  getProfileAuthToken,
  updateEmailSignature,
} from "@/lib/profile/profile-api"
import { themePrimaryButtonSmClassName } from "@/lib/form-field-styles"

let emailSignatureCache: string | null = null
let emailSignatureLoadPromise: Promise<string> | null = null

async function loadEmailSignature(token: string): Promise<string> {
  if (emailSignatureCache !== null) return emailSignatureCache
  if (emailSignatureLoadPromise) return emailSignatureLoadPromise

  emailSignatureLoadPromise = fetchEmailSignature(token).then((value) => {
    emailSignatureCache = value
    return value
  })

  try {
    return await emailSignatureLoadPromise
  } finally {
    emailSignatureLoadPromise = null
  }
}

export function EmailSignatureForm() {
  const { toast } = useToast()
  const signatureRef = useRef(
    emailSignatureCache !== null ? emailSignatureCache : ""
  )

  const [signature, setSignature] = useState<string | null>(() =>
    emailSignatureCache !== null ? emailSignatureCache : null
  )
  const [editorKey, setEditorKey] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSignature() {
      const token = getProfileAuthToken()
      if (!token) {
        if (!cancelled) {
          emailSignatureCache = ""
          signatureRef.current = ""
          setSignature("")
          setEditorKey((key) => key + 1)
        }
        return
      }

      try {
        const value = await loadEmailSignature(token)
        if (!cancelled) {
          signatureRef.current = value
          setSignature(value)
          setEditorKey((key) => key + 1)
        }
      } catch {
        if (!cancelled) {
          emailSignatureCache = ""
          signatureRef.current = ""
          setSignature("")
          setEditorKey((key) => key + 1)
        }
      }
    }

    void loadSignature()

    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = useCallback((value: string) => {
    signatureRef.current = value
    setSignature(value)
  }, [])

  async function handleSave() {
    const token = getProfileAuthToken()
    if (!token) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You are not logged in.",
      })
      return
    }

    const currentSignature = signatureRef.current
    if (isEmptyEditorHtml(currentSignature)) {
      toast({
        variant: "destructive",
        title: "Signature is empty",
        description: "Please enter your email signature before saving.",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await updateEmailSignature(token, currentSignature)
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to save email signature.",
        })
        return
      }

      const refreshed = await fetchEmailSignature(token)
      emailSignatureCache = refreshed
      signatureRef.current = refreshed
      setSignature(refreshed)
      setEditorKey((key) => key + 1)

      toast({
        title: "Signature saved",
        description: result.message || "Your email signature has been updated.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="pt-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Email Signature
            </Label>
            {signature === null ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-[220px] w-full" />
              </div>
            ) : (
              <RichTextEditor
                key={editorKey}
                value={signature}
                onChange={handleChange}
                placeholder="Compose your email signature..."
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              className={themePrimaryButtonSmClassName}
              disabled={signature === null || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Email Signature"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
