"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteItemAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
  itemName: string
  itemType: string
  isDeleting?: boolean
}

export function DeleteItemAlert({
  open,
  onOpenChange,
  onDelete,
  itemName,
  itemType,
  isDeleting = false,
}: DeleteItemAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete this {itemType}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the {itemType.toLowerCase()} &quot;{itemName}
            &quot;. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
