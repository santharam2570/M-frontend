"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EditableTitleProps {
  value: string
  onSave: (value: string) => void
  className?: string
  canEdit?: boolean
}

export function EditableTitle({
  value,
  onSave,
  className = "text-2xl font-semibold text-gray-800",
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
        <div className="flex items-center">
          <h1 className={className}>{value}</h1>
          {canEdit && isHovering && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 ml-1 text-gray-400 hover:text-gray-700"
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
