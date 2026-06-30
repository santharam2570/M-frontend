"use client"

interface SupportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-lg font-semibold">Support</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Support is not configured yet. Connect the backend API to enable this feature.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 text-sm font-medium text-primary hover:underline"
        >
          Close
        </button>
      </div>
    </div>
  )
}
