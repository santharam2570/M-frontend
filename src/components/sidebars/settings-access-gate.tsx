"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserData } from "@/hooks/useUserData"

export function SettingsAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthLoading, userData, canAccessSettings } = useUserData()

  useEffect(() => {
    if (isAuthLoading || !userData) return
    if (!canAccessSettings) {
      router.replace("/dashboard")
    }
  }, [canAccessSettings, isAuthLoading, router, userData])

  if (isAuthLoading || !userData) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return <>{children}</>
}
