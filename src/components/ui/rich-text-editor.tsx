"use client"

import { useMemo } from "react"
import dynamic from "next/dynamic"

import { cn } from "@/lib/utils"

const ReactQuill = dynamic(
  () => import("react-quill-new").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[220px] animate-pulse rounded-lg border border-border bg-muted" />
    ),
  }
)

const defaultModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["clean"],
  ],
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeightClassName?: string
}

function normalizeEditorHtml(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === "<p><br></p>" || trimmed === "<p></p>") {
    return ""
  }
  return value
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start typing...",
  className,
  minHeightClassName = "min-h-[220px]",
}: RichTextEditorProps) {
  const modules = useMemo(() => defaultModules, [])

  return (
    <div className={cn("email-quill-editor", className)}>
      <ReactQuill
        theme="snow"
        className={minHeightClassName}
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />
    </div>
  )
}

export function isEmptyEditorHtml(value: string): boolean {
  return normalizeEditorHtml(value) === ""
}
