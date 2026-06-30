"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface ThemeContextValue {
  isDarkTheme: boolean
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = "map_theme"

const ThemeContext = createContext<ThemeContextValue>({
  isDarkTheme: false,
  toggleTheme: () => {},
})

function getInitialTheme() {
  if (typeof window === "undefined") return false
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer reads the persisted theme on first client render so it
  // matches the pre-hydration script in the root layout (no dark-mode flash).
  const [isDarkTheme, setIsDarkTheme] = useState(getInitialTheme)

  useEffect(() => {
    setIsDarkTheme(getInitialTheme())
  }, [])

  const toggleTheme = () => {
    setIsDarkTheme((current) => {
      const next = !current
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light")
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
