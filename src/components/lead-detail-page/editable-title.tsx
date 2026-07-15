"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface EditableTitleProps {
  value: string
  onSave: (value: string) => void
  className?: string
  canEdit?: boolean
}

export function EditableTitle({
  value,
  onSave,
  className = "text-2xl font-semibold text-foreground",
  canEdit = true,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value)
  }, [value])

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  return (
    <div className="relative group" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      {isEditing ? (
        <div className="flex items-center">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`${className} h-9 py-1`}
          />
          <div className="flex ml-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h1 className={cn(className, "min-w-0 break-words")}>{value}</h1>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground",
                "opacity-100 sm:opacity-0",
                isHovering && "sm:opacity-100",
              )}
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
