"use client"

import { useEffect, useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import { installFetchTimeout } from "@/lib/fetch-timeout"
import { QUERY_CACHE_STORAGE_KEY } from "@/lib/query-cache"
import { UserDataProvider } from "@/hooks/useUserData"

const GC_TIME_MS = 30 * 60 * 1000

function createQueryClient() {
  installFetchTimeout()

  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 5 minutes: navigating back within
        // this window will NOT trigger a refetch or a loading spinner.
        staleTime: 5 * 60 * 1000,
        // Keep unused/cached data around for 30 minutes before garbage
        // collection so quick page switches always hit the cache.
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  })
}

/**
 * App-wide client providers.
 *
 * React Query cache is persisted to localStorage so a full page reload can
 * hydrate from the last session instead of flashing loading skeletons.
 *
 * Persistence is attached imperatively after mount so the provider tree stays
 * stable (no remount / double useEffect fetch on first paint).
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: QUERY_CACHE_STORAGE_KEY,
    })

    const [unsubscribe, restorePromise] = persistQueryClient({
      queryClient,
      persister,
      maxAge: GC_TIME_MS,
    })

    void restorePromise

    return () => {
      unsubscribe()
    }
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <UserDataProvider>{children}</UserDataProvider>
    </QueryClientProvider>
  )
}
