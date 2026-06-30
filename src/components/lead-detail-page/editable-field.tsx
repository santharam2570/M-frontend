"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Check, X, Pencil, CalendarIcon, ChevronDown } from "lucide-react"
import { Select, FormSelectContent, FormSelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, isValid, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  formSelectTriggerClassName,
  leadDetailFieldLabelClassName,
  leadDetailFieldValueClassName,
  leadDetailInlineFieldClassName,
  leadDetailSidebarFieldLabelClassName,
  leadDetailSidebarFieldValueClassName,
  leadDetailSidebarInputClassName,
} from "@/lib/form-field-styles"

function parseDateValue(dateStr: string): Date | undefined {
  if (!dateStr?.trim()) return undefined
  const iso = parseISO(dateStr)
  if (isValid(iso)) return iso
  const direct = new Date(dateStr)
  if (isValid(direct)) return direct
  return undefined
}

function formatDateDisplay(dateStr: string): string {
  const parsed = parseDateValue(dateStr)
  if (!parsed) return dateStr
  return format(parsed, "PPP")
}

interface EditableFieldProps {
  field: string
  value: string
  label: string
  isTextarea?: boolean
  isBold?: boolean
  isUrl?: boolean
  type?: string
  options?: Array<{ label: string; value: string; color?: string }>
  isMultiSelect?: boolean
  onSave: (field: string, value: string) => void
  canEdit?: boolean
  variant?: "default" | "detail"
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
}

export function EditableField({
  field,
  value,
  label,
  isTextarea = false,
  isBold = false,
  isUrl = false,
  type,
  options,
  isMultiSelect = false,
  onSave,
  canEdit = true,
  variant = "default",
  icon: Icon,
  actions,
}: EditableFieldProps) {
  const parseMultiValue = (val: string): string[] =>
    val ? val.split(",").map((part) => part.trim()).filter(Boolean) : []

  const [isEditing, setIsEditing] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [editMultiValue, setEditMultiValue] = useState<string[]>(() => parseMultiValue(value))
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing) {
      if (isTextarea && textareaRef.current) {
        textareaRef.current.focus()
      } else if (inputRef.current && !options) {
        inputRef.current.focus()
      }

      if (options) {
        setIsDropdownOpen(true)
      }
    } else {
      setIsDropdownOpen(false)
    }
  }, [isEditing, isTextarea, options])

  useEffect(() => {
    setEditValue(value)
    setEditMultiValue(parseMultiValue(value))
  }, [value])

  const handleSave = () => {
    const valueToSave = isMultiSelect ? editMultiValue.join(", ") : editValue
    onSave(field, valueToSave)
    setIsEditing(false)
    setIsDropdownOpen(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setEditMultiValue(parseMultiValue(value))
    setIsEditing(false)
    setIsDropdownOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isTextarea) {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // For phone fields, only allow numeric characters, spaces, hyphens, parentheses, and plus sign
    if (type === 'phone') {
      const phoneRegex = /^[0-9\s\-\(\)\+]*$/
      if (phoneRegex.test(inputValue) || inputValue === '') {
        setEditValue(inputValue)
      }
    } else if (type === 'pincode') {
      const pincodeRegex = /^[0-9]*$/
      if (pincodeRegex.test(inputValue) || inputValue === '') {
        setEditValue(inputValue)
      }
    } else {
      setEditValue(inputValue)
    }
  }

  const handleSelectChange = (newValue: string) => {
    setEditValue(newValue)
    onSave(field, newValue)
    setIsEditing(false)
    setIsDropdownOpen(false)
  }

  const handleDropdownOpenChange = (open: boolean) => {
    setIsDropdownOpen(open)
    if (!open) {
      setEditValue(value)
      setIsEditing(false)
    }
  }

  const getSelectedOption = (selectedValue: string) =>
    options?.find((opt) => opt.value === selectedValue)

  const selectedEditLabel =
    getSelectedOption(editValue)?.label ||
    (editValue?.trim() ? editValue : `Select ${label.toLowerCase()}`)

  // Format URL for display if isUrl is true
  const displayValue = isUrl && value ? (value.startsWith("http") ? value.replace(/^https?:\/\//, "") : value) : value
  const resolvedDisplayValue = isMultiSelect && options
    ? parseMultiValue(value)
        .map((id) => options.find((opt) => opt.value === id)?.label || id)
        .join(", ")
    : options
    ? options.find((opt) => opt.value === value)?.label || value
    : type === "date" && value?.trim()
      ? formatDateDisplay(value)
      : displayValue
  const formattedDisplayValue = resolvedDisplayValue?.trim() ? resolvedDisplayValue : "—"

  const labelClassName =
    variant === "detail"
      ? leadDetailSidebarFieldLabelClassName
      : leadDetailFieldLabelClassName

  const renderDetailDropdownEdit = () => (
    <div className="mt-1.5">
      <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-base font-normal text-foreground shadow-xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <span className="truncate text-left">{selectedEditLabel}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={4}
          className="z-[200] max-h-[280px] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto p-1"
        >
          {options?.length ? (
            options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm"
                onClick={() => handleSelectChange(option.value)}
              >
                {option.color ? (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                ) : null}
                <span className="min-w-0 flex-1 break-words">{option.label}</span>
                {editValue === option.value ? <Check className="ml-auto h-4 w-4 shrink-0 text-primary" /> : null}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-muted-foreground">
              No options available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const renderMultiSelectEdit = () => (
    <div className={cn("mt-1.5", variant !== "detail" && "mt-0")}>
      <MultiSelect
        options={options ?? []}
        selected={editMultiValue}
        onChange={setEditMultiValue}
        placeholder={`Select ${label.toLowerCase()}`}
      />
    </div>
  )

  const renderEditInput = () => (
    <>
      {isMultiSelect && options ? (
        renderMultiSelectEdit()
      ) : isTextarea ? (
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "text-base min-h-[72px] resize-none",
            variant === "detail" ? "mt-1.5 bg-white" : cn(leadDetailInlineFieldClassName, "p-1 min-h-[60px]"),
          )}
        />
      ) : options ? (
        variant === "detail" ? (
          renderDetailDropdownEdit()
        ) : (
          <div className="flex-1">
            <Select
              value={editValue}
              onValueChange={handleSelectChange}
              open={isDropdownOpen}
              onOpenChange={handleDropdownOpenChange}
            >
              <SelectTrigger className={cn(formSelectTriggerClassName, "h-9")} size="form">
                <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
              </SelectTrigger>
              <FormSelectContent>
                {options.map((option) => (
                  <FormSelectItem key={option.value} value={option.value}>
                    {option.label}
                  </FormSelectItem>
                ))}
              </FormSelectContent>
            </Select>
          </div>
        )
      ) : type === "date" ? (
        <div className={cn(variant === "detail" && "mt-1.5")}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  variant === "detail" ? cn(leadDetailSidebarInputClassName, "font-normal") : cn(leadDetailInlineFieldClassName, "p-1"),
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {editValue ? formatDateDisplay(editValue) : `Pick ${label.toLowerCase()}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={parseDateValue(editValue)}
                onSelect={(date) => {
                  if (date) {
                    setEditValue(format(date, "yyyy-MM-dd"))
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      ) : type === "checkbox" ? (
        <div className="flex items-center gap-2 mt-1.5">
          <input
            type="checkbox"
            checked={editValue === "true"}
            onChange={(e) => setEditValue(e.target.checked.toString())}
            className="h-4 w-4"
          />
        </div>
      ) : (
        <Input
          ref={inputRef}
          value={editValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(variant === "detail" ? cn(leadDetailSidebarInputClassName, "mt-1.5") : cn("text-sm", leadDetailInlineFieldClassName, "p-1"))}
          type={type === "number" || type === "money" ? "number" : "text"}
          inputMode={type === "pincode" ? "numeric" : undefined}
        />
      )}
    </>
  )

  const renderEditActions = () => (
    <div className={cn("flex shrink-0", variant === "detail" ? "mt-1.5 gap-0.5" : "ml-2")}>
      <Button
        variant="ghost"
        size="icon"
        className={cn("text-primary hover:text-primary/80", variant === "detail" ? "h-8 w-8" : "h-6 w-6")}
        onClick={handleSave}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn("text-red-500 hover:text-red-600", variant === "detail" ? "h-8 w-8" : "h-6 w-6")}
        onClick={handleCancel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )

  const renderPencilButton = () =>
    canEdit ? (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "shrink-0 text-slate-400 hover:text-slate-700",
          variant === "detail" ? "h-7 w-7" : "h-6 w-6 ml-1",
          isHovering ? "opacity-100" : "opacity-0",
        )}
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    ) : null

  if (variant === "detail") {
    return (
      <div
        className="group flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {Icon ? (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={labelClassName}>{label}</p>
          {isEditing ? (
            options && !isMultiSelect ? (
              renderEditInput()
            ) : (
              <div className={cn("flex gap-2", isTextarea || isMultiSelect ? "flex-col" : "items-start")}>
                <div className="min-w-0 flex-1">{renderEditInput()}</div>
                {(isTextarea || isMultiSelect || !options) && renderEditActions()}
              </div>
            )
          ) : (
            <div className="mt-0.5 flex items-start justify-between gap-2">
              <p
                className={cn(
                  leadDetailSidebarFieldValueClassName,
                  "break-words",
                  !resolvedDisplayValue?.trim() && "text-muted-foreground/60",
                )}
              >
                {formattedDisplayValue}
              </p>
              <div className="flex items-center gap-0.5 shrink-0">
                {actions}
                {renderPencilButton()}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative group w-full"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <p className={labelClassName}>{label}</p>

      {isEditing ? (
        options && !isMultiSelect ? (
          renderEditInput()
        ) : (
          <div className="flex items-center mt-1">
            {renderEditInput()}
            {(isTextarea || isMultiSelect || !options) && renderEditActions()}
          </div>
        )
      ) : (
        <div className="flex items-center">
          <p className={cn(leadDetailFieldValueClassName, "overflow-hidden text-ellipsis", isBold && "font-semibold")}>
            {formattedDisplayValue}
          </p>
          {renderPencilButton()}
        </div>
      )}
    </div>
  )
}
