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
import { useRouter } from "next/navigation"

interface DeleteItemAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: string
  onDelete: () => void
}

export function DeleteItemAlert({
  open,
  onOpenChange,
  itemName,
  itemType,
  onDelete,
}: DeleteItemAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this {itemType}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the {itemType.toLowerCase()} "{itemName}". This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-destructive text-white hover:bg-destructive/90" 
            onClick={onDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
