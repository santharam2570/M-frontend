"use client"

import { forwardRef, useImperativeHandle, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { leadDetailBodyClassName } from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"

export interface DocumentUploadCardProps {
  onFileSelect?: (file: File) => void | Promise<void>
  disabled?: boolean
  className?: string
  accept?: string
  description?: string
}

export interface DocumentUploadCardHandle {
  openFilePicker: () => void
}

export const DocumentUploadCard = forwardRef<DocumentUploadCardHandle, DocumentUploadCardProps>(
  function DocumentUploadCard(
    {
      onFileSelect,
      disabled = false,
      className,
      accept,
      description = "Drag and drop files here or",
    },
    ref,
  ) {
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFile = (file: File | undefined) => {
      if (disabled || !file || !onFileSelect) return
      void onFileSelect(file)
    }

    const openFilePicker = () => {
      if (disabled) return
      inputRef.current?.click()
    }

    useImperativeHandle(ref, () => ({ openFilePicker }), [disabled])

    const handleDragEnter = (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      if (!disabled) setIsDragging(true)
    }

    const handleDragLeave = (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
    }

    const handleDragOver = (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
    }

    const handleDrop = (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
      if (disabled) return

      const files = Array.from(event.dataTransfer.files)
      handleFile(files[0])
    }

    return (
      <Card className={cn("border-slate-200/80 shadow-none", className)}>
        <CardContent className="p-4">
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-4 transition-colors",
              disabled
                ? "cursor-not-allowed border-slate-200 bg-slate-50/50 opacity-60"
                : isDragging
                  ? "border-primary bg-primary/10"
                  : "border-slate-300",
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <p className={leadDetailBodyClassName}>
                {description}{" "}
                <Button
                  type="button"
                  variant="link"
                  className="px-1"
                  disabled={disabled}
                  onClick={openFilePicker}
                >
                  browse
                </Button>
              </p>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            disabled={disabled}
            onChange={(event) => {
              handleFile(event.target.files?.[0])
              event.target.value = ""
            }}
          />
        </CardContent>
      </Card>
    )
  },
)
