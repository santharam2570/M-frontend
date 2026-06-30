"use client"

import * as React from "react"
import { ChevronDown, X } from "lucide-react"
import { Command, CommandGroup, CommandItem } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { formMultiSelectTriggerClassName } from "@/lib/form-field-styles"

type Option = {
  label: string
  value: string
}

type MultiSelectProps = {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  id?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  id,
  className,
}: MultiSelectProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleUnselect = (option: Option) => {
    onChange(selected.filter((s) => s !== option.value))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "") {
          const newSelected = [...selected]
          newSelected.pop()
          onChange(newSelected)
        }
      }
      if (e.key === "Escape") {
        setOpen(false)
        input.blur()
      }
    }
  }

  const selectables = options.filter((option) => !selected.includes(option.value))

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleOpen = () => {
    setOpen((prev) => !prev)
    inputRef.current?.focus()
  }

  return (
    <Command onKeyDown={handleKeyDown} className={cn("overflow-visible bg-transparent", className)}>
      <div ref={containerRef} className="relative">
        <div
          className={cn(formMultiSelectTriggerClassName)}
          onClick={() => {
            setOpen(true)
            inputRef.current?.focus()
          }}
        >
          <div className="flex flex-wrap items-center gap-1">
            {selected.map((selectedValue) => {
              const option = options.find((o) => o.value === selectedValue)
              return option ? (
                <Badge key={option.value} variant="secondary" className="gap-1">
                  {option.label}
                  <button
                    type="button"
                    className="rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(option)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(option)
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ) : null
            })}
            <CommandPrimitive.Input
              id={id}
              ref={inputRef}
              value={inputValue}
              onValueChange={setInputValue}
              onFocus={() => setOpen(true)}
              placeholder={selected.length === 0 ? placeholder : "Add more..."}
              className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle customer type options"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
            toggleOpen()
          }}
        >
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div className="absolute top-[calc(100%+4px)] left-0 z-[200] w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95">
            <CommandGroup className="max-h-60 overflow-auto p-1">
              {selectables.length > 0 ? (
                selectables.map((option) => (
                  <CommandItem
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onSelect={() => {
                      setInputValue("")
                      onChange([...selected, option.value])
                      setOpen(true)
                    }}
                    className="cursor-pointer rounded-sm py-2.5"
                  >
                    {option.label}
                  </CommandItem>
                ))
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  All options selected
                </div>
              )}
            </CommandGroup>
          </div>
        ) : null}
      </div>
    </Command>
  )
}
