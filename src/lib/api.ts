export class ApiError extends Error {
  status: number
  url?: string

  constructor(message: string, status: number, url?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.url = url
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  let text: string

  try {
    text = await response.text()
  } catch {
    throw new ApiError("Failed to read server response.", response.status, response.url)
  }

  const trimmed = text.trim()

  if (!trimmed) {
    const message = !response.ok
      ? `Request failed with status ${response.status}.`
      : "Empty response from server."
    throw new ApiError(message, response.status, response.url)
  }

  if (trimmed.startsWith("<")) {
    const message = !response.ok
      ? `Server returned an error page (status ${response.status}). Check that the API is running at the configured URL.`
      : "Server returned HTML instead of JSON. Check that the API URL is correct."
    throw new ApiError(message, response.status, response.url)
  }

  try {
    return JSON.parse(trimmed) as T
  } catch {
    throw new ApiError("Invalid JSON response from server.", response.status, response.url)
  }
}
