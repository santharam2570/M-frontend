"use client"

import { useCallback, useState } from "react"
import { clearPersistedQueryCache } from "@/lib/query-cache"

interface AuthUser {
  access_token?: string
  result?: {
    name?: string
    email?: string
  }
  [key: string]: unknown
}

export function useReduxAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const logout = useCallback(() => {
    localStorage.removeItem("map_user")
    clearPersistedQueryCache()
    setUser(null)
    setToken(null)
  }, [])

  return { user, token, logout, setUser, setToken }
}
