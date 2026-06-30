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
 * Merges the `ngrok-skip-browser-warning` header into an existing init/Request.
 *
 * Free ngrok tunnels serve an HTML interstitial ("You are about to visit…")
 * for browser requests unless this header is present, which would otherwise
 * make every API call return HTML instead of JSON. The value can be anything;
 * ngrok only checks that the header exists.
 */
function withNgrokHeader(
  input: RequestInfo | URL,
  init?: RequestInit
): RequestInit {
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined)
  )
  headers.set("ngrok-skip-browser-warning", "true")
  return { ...init, headers }
}

/**
 * Wraps window.fetch so API requests to BASE_URL:
 *   1. Always send the ngrok-skip-browser-warning header (so the backend
 *      returns JSON, not ngrok's HTML warning page).
 *   2. Fail fast after 15 seconds instead of hanging indefinitely when the
 *      backend is down or unreachable.
 */
export function installFetchTimeout(): void {
  if (typeof window === "undefined") return
  if (window.__fetchTimeoutInstalled) return

  window.__fetchTimeoutInstalled = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveRequestUrl(input)
    const isApiCall = !!url && !!BASE_URL && url.startsWith(BASE_URL)

    if (!isApiCall) {
      return originalFetch(input, init)
    }

    const nextInit = withNgrokHeader(input, init)

    if (!nextInit.signal) {
      nextInit.signal = AbortSignal.timeout(TIMEOUT_MS)
    }

    return originalFetch(input, nextInit)
  }
}
