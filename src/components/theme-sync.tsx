'use client'

import React, { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeSync() {
  const { isDarkTheme } = useTheme()

  useEffect(() => {
    // Apply theme to document element
    if (isDarkTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Force re-render of components that might not be listening to theme changes
    const event = new CustomEvent('themeChanged', {
      detail: { isDark: isDarkTheme }
    })
    window.dispatchEvent(event)

    // Update CSS custom properties for immediate visual feedback
    const root = document.documentElement
    if (isDarkTheme) {
      root.style.setProperty('--theme-mode', 'dark')
    } else {
      root.style.setProperty('--theme-mode', 'light')
    }
  }, [isDarkTheme])

  // This component doesn't render anything, it just syncs the theme
  return null
} 