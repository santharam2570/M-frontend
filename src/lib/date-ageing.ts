import { format, differenceInDays, parseISO, isValid } from 'date-fns'

export interface DateAgeingResult {
  days: number
  label: string
  badgeColor: string
  textColor: string
}

/**
 * Parses a date string using multiple strategies to handle various formats
 * @param dateStr - The date string to parse
 * @returns Date object or null if parsing fails
 */
export function parseDateString(dateStr: string): Date | null {
  // Strategy 1: Try parseISO for ISO 8601 formats
  try {
    const isoDate = parseISO(dateStr)
    if (isValid(isoDate)) {
      return isoDate
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Try direct Date constructor
  try {
    const directDate = new Date(dateStr)
    if (isValid(directDate)) {
      return directDate
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 3: Handle common API date formats
  const commonFormats = [
    // YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr),
    // YYYY-MM-DD HH:mm:ss
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(dateStr),
    // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr),
    // DD-MM-YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr),
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateStr),
  ]

  for (const match of commonFormats) {
    if (match) {
      try {
        let date: Date
        
        if (match.length === 4) {
          // YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY
          const [, part1, part2, part3] = match
          if (part1.length === 4) {
            // YYYY-MM-DD
            date = new Date(parseInt(part1), parseInt(part2) - 1, parseInt(part3))
          } else {
            // DD/MM/YYYY or DD-MM-YYYY
            date = new Date(parseInt(part3), parseInt(part2) - 1, parseInt(part1))
          }
        } else if (match.length === 7) {
          // YYYY-MM-DD HH:mm:ss
          const [, year, month, day, hour, minute, second] = match
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second))
        } else {
          // MM/DD/YYYY
          const [, month, day, year] = match
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
        
        if (isValid(date)) {
          return date
        }
      } catch (e) {
        // Continue to next format
      }
    }
  }

  // Strategy 4: Try parsing as timestamp
  try {
    const timestamp = parseInt(dateStr)
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp)
      if (isValid(date)) {
        return date
      }
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 5: Try parsing as timestamp in milliseconds
  try {
    const timestamp = parseInt(dateStr)
    if (!isNaN(timestamp) && timestamp > 1000000000000) { // Check if it's likely milliseconds
      const date = new Date(timestamp)
      if (isValid(date)) {
        return date
      }
    }
  } catch (e) {
    // Continue to next strategy
  }

  return null
}

function buildAgeingResult(days: number, label?: string): DateAgeingResult {
  const normalizedDays = Number.isFinite(days) ? Math.max(Math.floor(days), 0) : 0

  let badgeColor = 'bg-gray-100'
  let textColor = 'text-gray-600'
  let finalLabel: string

  if (normalizedDays <= 0) {
    badgeColor = 'bg-green-100'
    textColor = 'text-green-700'
    finalLabel = label && label.trim() ? label : 'Today'
  } else if (normalizedDays >= 1 && normalizedDays <= 4) {
    badgeColor = 'bg-green-100'
    textColor = 'text-green-700'
    finalLabel = label && label.trim() ? label : `${normalizedDays} Day${normalizedDays > 1 ? 's' : ''}`
  } else if (normalizedDays >= 5 && normalizedDays <= 10) {
    badgeColor = 'bg-blue-100'
    textColor = 'text-blue-700'
    finalLabel = label && label.trim() ? label : `${normalizedDays} Days`
  } else if (normalizedDays >= 11 && normalizedDays <= 15) {
    badgeColor = 'bg-orange-100'
    textColor = 'text-orange-700'
    finalLabel = label && label.trim() ? label : `${normalizedDays} Days`
  } else {
    badgeColor = 'bg-red-100'
    textColor = 'text-red-700'
    finalLabel = label && label.trim() ? label : `${normalizedDays} Days`
  }

  return {
    days: normalizedDays,
    label: finalLabel,
    badgeColor,
    textColor
  }
}

/**
 * Calculates date ageing based on the difference between a given date and today
 * @param date - The date to calculate ageing for (can be string, Date, or null/undefined)
 * @returns DateAgeingResult with days, label, and styling information
 */
export function calculateDateAgeing(date: string | Date | null | undefined): DateAgeingResult {
  if (!date) {
    return {
      days: 0,
      label: 'No Date',
      badgeColor: 'bg-gray-100',
      textColor: 'text-gray-600'
    }
  }

  let targetDate: Date | null = null
  
  try {
    if (typeof date === 'string') {
      // Handle various date string formats
      const dateStr = date.trim()
      
      // Check if it's already a valid date string
      if (dateStr === 'Invalid Date' || dateStr === '') {
        return {
          days: 0,
          label: 'Invalid Date',
          badgeColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        }
      }
      
      // Try to parse the date with multiple strategies
      targetDate = parseDateString(dateStr)
      
      // Check if the date is valid
      if (!targetDate || isNaN(targetDate.getTime())) {
        return {
          days: 0,
          label: 'Invalid Date',
          badgeColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        }
      }
    } else {
      targetDate = date
      
      // Check if the date is valid
      if (isNaN(targetDate.getTime())) {
        return {
          days: 0,
          label: 'Invalid Date',
          badgeColor: 'bg-gray-100',
          textColor: 'text-gray-600'
        }
      }
    }
  } catch (error) {
    console.warn('Invalid date provided to calculateDateAgeing:', date, error)
    return {
      days: 0,
      label: 'Invalid Date',
      badgeColor: 'bg-gray-100',
      textColor: 'text-gray-600'
    }
  }

  // At this point, targetDate should be valid, but add a safety check
  if (!targetDate) {
    return {
      days: 0,
      label: 'Invalid Date',
      badgeColor: 'bg-gray-100',
      textColor: 'text-gray-600'
    }
  }

  const today = new Date()
  
  // Reset time to start of day for accurate day calculation
  const targetDateStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  const days = differenceInDays(todayStart, targetDateStart)

  return buildAgeingResult(days)
}

export function calculateAgeingFromValue(ageingValue: string | number | null | undefined): DateAgeingResult {
  if (ageingValue === null || ageingValue === undefined) {
    return {
      days: 0,
      label: 'No Date',
      badgeColor: 'bg-gray-100',
      textColor: 'text-gray-600'
    }
  }

  if (typeof ageingValue === 'number' && !Number.isNaN(ageingValue)) {
    return buildAgeingResult(ageingValue)
  }

  if (typeof ageingValue === 'string') {
    const trimmed = ageingValue.trim()

    if (trimmed === '') {
      return {
        days: 0,
        label: 'No Date',
        badgeColor: 'bg-gray-100',
        textColor: 'text-gray-600'
      }
    }

    if (trimmed.toLowerCase() === 'invalid date') {
      return {
        days: 0,
        label: 'Invalid Date',
        badgeColor: 'bg-gray-100',
        textColor: 'text-gray-600'
      }
    }

    const match = trimmed.match(/(\d+)/)
    const parsed = match ? parseInt(match[1], 10) : Number(trimmed)

    if (Number.isNaN(parsed)) {
      return {
        days: 0,
        label: trimmed,
        badgeColor: 'bg-gray-100',
        textColor: 'text-gray-600'
      }
    }

    return buildAgeingResult(parsed, trimmed)
  }

  return {
    days: 0,
    label: 'No Date',
    badgeColor: 'bg-gray-100',
    textColor: 'text-gray-600'
  }
}

/**
 * Formats a date for display in the ageing badge
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDateForAgeing(date: string | Date | null | undefined): string {
  if (!date) return 'No Date'
  
  try {
    let targetDate: Date
    
    if (typeof date === 'string') {
      targetDate = parseDateString(date) || new Date(date)
    } else {
      targetDate = date
    }
    
    // Check if the date is valid
    if (!targetDate || isNaN(targetDate.getTime())) {
      return 'Invalid Date'
    }
    
    return format(targetDate, 'dd MMM yyyy')
  } catch (error) {
    console.warn('Invalid date provided to formatDateForAgeing:', date, error)
    return 'Invalid Date'
  }
}
