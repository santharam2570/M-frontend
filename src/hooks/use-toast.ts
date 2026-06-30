import { useCallback } from "react"
import { toast as sonnerToast } from "sonner"

type ToastInput = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = "default" }: ToastInput) => {
    const message = title ?? description ?? ""
    const options = description && title ? { description } : undefined

    if (variant === "destructive") {
      sonnerToast.error(message, options)
      return
    }

    sonnerToast(message, options)
  }, [])

  return { toast }
}
