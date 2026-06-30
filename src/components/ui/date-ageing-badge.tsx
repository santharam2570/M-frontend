import React from 'react'
import { calculateAgeingFromValue, calculateDateAgeing, formatDateForAgeing } from '@/lib/date-ageing'

interface DateAgeingBadgeProps {
  date?: string | Date | null | undefined
  ageingValue?: string | number | null | undefined
  showDate?: boolean
  className?: string
  variant?: 'default' | 'days'
}

export function DateAgeingBadge({ 
  date, 
  ageingValue,
  showDate = false, 
  className = '',
  variant = 'default',
}: DateAgeingBadgeProps) {
  const hasAgeingValue = ageingValue !== undefined && ageingValue !== null && ageingValue !== ''
  const ageing = hasAgeingValue ? calculateAgeingFromValue(ageingValue) : calculateDateAgeing(date)
  const formattedDate = formatDateForAgeing(date)
  const label = variant === 'days' ? `Days / ${ageing.days}` : ageing.label
  const badgeClassName =
    variant === 'days'
      ? 'bg-destructive/10 text-destructive'
      : `${ageing.badgeColor} ${ageing.textColor}`

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span 
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClassName}`}
      >
        {label}
      </span>
      {showDate && (
        <span className="text-xs text-gray-500">
          {formattedDate}
        </span>
      )}
    </div>
  )
}

