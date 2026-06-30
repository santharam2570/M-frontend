import { BASE_URL } from "@/config/environment"

const TIMEOUT_MS = 15000

declare global {
  interface Window {
    __fetchTimeoutInstalled?: boolean
  }
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input
  if (input instanceof URL) return input.href
  return input.url
}

/**
 * Wraps window.fetch so API requests to BASE_URL fail fast after 15 seconds
 * instead of hanging indefinitely when the backend is down or unreachable.
 */
export function installFetchTimeout(): void {
  if (typeof window === "undefined") return
  if (window.__fetchTimeoutInstalled) return

  window.__fetchTimeoutInstalled = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveRequestUrl(input)
    const isApiCall = !!url && !!BASE_URL && url.startsWith(BASE_URL)

    if (isApiCall && !init?.signal) {
      return originalFetch(input, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    }

    return originalFetch(input, init)
  }
}
