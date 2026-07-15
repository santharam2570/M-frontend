"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const radioGroupVariants = cva("grid w-full gap-3", {
  variants: {
    orientation: {
      vertical: "grid-cols-1",
      horizontal: "grid-flow-col auto-cols-fr max-sm:grid-flow-row max-sm:auto-cols-auto",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
})

type RadioGroupProps = React.ComponentProps<typeof RadioGroupPrimitive.Root> &
  VariantProps<typeof radioGroupVariants>

function RadioGroup({ className, orientation, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(radioGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    data-slot="radio-group-item"
    className={cn(
      "peer relative flex size-[1.125rem] shrink-0 items-center justify-center rounded-full border-2 border-input bg-background shadow-xs outline-none transition-[border-color,background-color,box-shadow,transform]",
      "hover:border-primary/60 hover:bg-primary/5",
      "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20",
      "data-[state=checked]:border-primary data-[state=checked]:bg-background",
      "data-checked:border-primary data-checked:bg-background",
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator
      data-slot="radio-group-indicator"
      className="flex items-center justify-center"
    >
      <span className="size-2 rounded-full bg-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

interface RadioGroupFieldProps {
  value: string
  id: string
  label: React.ReactNode
  className?: string
  itemClassName?: string
  labelClassName?: string
  disabled?: boolean
}

function RadioGroupField({
  value,
  id,
  label,
  className,
  itemClassName,
  labelClassName,
  disabled,
}: RadioGroupFieldProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <RadioGroupItem value={value} id={id} disabled={disabled} className={itemClassName} />
      <Label
        htmlFor={id}
        className={cn(
          "cursor-pointer font-normal text-foreground transition-colors",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
          labelClassName
        )}
      >
        {label}
      </Label>
    </div>
  )
}

interface RadioGroupOptionProps {
  value: string
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  className?: string
  itemClassName?: string
  disabled?: boolean
}

function RadioGroupOption({
  value,
  id,
  title,
  description,
  icon,
  className,
  itemClassName,
  disabled,
}: RadioGroupOptionProps) {
  return (
    <label
      htmlFor={id}
      data-slot="radio-group-option"
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-all",
        "hover:border-primary/40 hover:bg-muted/40",
        "has-[[data-slot=radio-group-item]:focus-visible]:border-primary/60 has-[[data-slot=radio-group-item]:focus-visible]:ring-[3px] has-[[data-slot=radio-group-item]:focus-visible]:ring-ring/50",
        "has-[[data-slot=radio-group-item][data-state=checked]]:border-primary has-[[data-slot=radio-group-item][data-state=checked]]:bg-primary/5 has-[[data-slot=radio-group-item][data-state=checked]]:shadow-sm",
        "has-[[data-slot=radio-group-item][data-checked]]:border-primary has-[[data-slot=radio-group-item][data-checked]]:bg-primary/5 has-[[data-slot=radio-group-item][data-checked]]:shadow-sm",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <RadioGroupItem
        value={value}
        id={id}
        disabled={disabled}
        className={cn("mt-0.5", itemClassName)}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
        </span>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </label>
  )
}

export { RadioGroup, RadioGroupField, RadioGroupItem, RadioGroupOption }
