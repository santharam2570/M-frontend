"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import URLS from "@/config/urls"

interface Note {
  _id: string
  content: string
  createdBy: string
  createdAt: string
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  } | null
}

interface ShowNotesDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityName?: string
  associateId: string
  associateTo: string // "lead", "company", "opportunity", "partner", "onboarding", "new_request", "ticket"
}

// Helper function to get the appropriate notes URL based on associateTo type
const getNotesUrl = (associateTo: string, associateId: string): string => {
  switch (associateTo) {
    case "lead":
      return `${URLS.LEAD_NOTES_DETAIL}/${associateId}`
    case "company":
      return `${URLS.COMPANY_NOTES_DETAIL}/${associateId}`
    case "ticket":
      return `${URLS.TICKET_MODULE_REQUEST_ACTIVITY}/${associateId}`
    case "new_request":
      return `${URLS.PARTNER_REQUEST_ACTIVITY}/${associateId}`
    case "onboarding":
      return `${URLS.ONBOARDING_REQUEST_ACTIVITY}/${associateId}`
    case "partner":
      return `${URLS.PARTNER_ACTIVITY}/${associateId}`
    // For other types, you may need to add specific endpoints or use a generic one
    // For now, we'll use the lead endpoint as fallback for other types
    default:
      // If there's a generic notes endpoint, use it here
      // Otherwise, fallback to lead endpoint
      return `${URLS.LEAD_NOTES_DETAIL}/${associateId}`
  }
}

export function ShowNotesDrawer({ 
  open, 
  onOpenChange, 
  entityName, 
  associateId, 
  associateTo 
}: ShowNotesDrawerProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotes = async () => {
      if (!associateId) return
      setIsLoading(true)
      setError(null)

      try {
        const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token
        if (!token) throw new Error("Token not found")
          
        const notesUrl = getNotesUrl(associateTo, associateId)
        const response = await fetch(notesUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        const data = await response.json()

        // Handle ticket, new_request, onboarding, and partner notes which come from activity endpoint with different structure
        if (associateTo === "ticket" || associateTo === "new_request" || associateTo === "onboarding" || associateTo === "partner") {
          if (data.code === 200 && data.data && Array.isArray(data.data.notes)) {
            const transformedNotes = data.data.notes.map((note: any) => ({
              _id: note._id,
              content: note.note,
              createdBy: note.createBy,
              createdAt: note.create_date_utc,
              location: note.location
            }))
            setNotes(transformedNotes)
          } else {
            // If no notes found, set empty array instead of throwing error
            setNotes([])
          }
        } else if (data.code === 200 && Array.isArray(data.data?.notes)) {
          const transformedNotes = data.data.notes.map((note: any) => ({
            _id: note._id,
            content: note.note,
            createdBy: note.createBy,
            createdAt: note.create_date_utc,
            location: note.location
          }))
          setNotes(transformedNotes)
        } else {
          throw new Error(data.msg || 'Failed to fetch notes')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch notes')
        console.error('Error fetching notes:', err)
      } finally {
        setIsLoading(false)
      }
    }

    if (open && associateId) {
      fetchNotes()
    }
  }, [open, associateId, associateTo])

  if (error) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="data-[side=right]:sm:max-w-md p-0 flex flex-col h-full gap-0">
          <div className="flex-1 overflow-y-auto p-6">
            <SheetHeader className="pb-4">
              <SheetTitle>Notes {entityName ? `for ${entityName}` : ""}</SheetTitle>
            </SheetHeader>
            <div className="text-destructive text-sm mt-4">{error}</div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Format date to display in a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
  }

  // Open location in Google Maps
  const openInGoogleMaps = (latitude: number, longitude: number) => {
    window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, "_blank")
  }

  // Get entity type label for empty state
  const getEntityTypeLabel = () => {
    switch (associateTo) {
      case "lead":
        return "lead"
      case "company":
        return "company"
      case "opportunity":
        return "opportunity"
      case "partner":
        return "partner"
      case "onboarding":
        return "onboarding partner"
      case "new_request":
        return "request partner"
      case "ticket":
        return "ticket"
      default:
        return "item"
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md p-0 flex flex-col h-full gap-0">
        <div className="flex-1 overflow-y-auto p-6">
          <SheetHeader className="pb-4">
            <SheetTitle>Notes {entityName ? `for ${entityName}` : ""}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-muted-foreground text-sm text-center py-8">
                No notes found for this {getEntityTypeLabel()}
              </div>
            ) : notes.map((note) => (
              <div key={note._id} className="bg-muted/50 p-4 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.createdBy}</span>
                  <span>{formatDate(note.createdAt)}</span>
                </div>

                {note.location ? (
                  <div className="mt-3 border-t pt-3">
                    <div className="flex items-center text-xs text-muted-foreground mb-2">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-blue-600" />
                      <span>
                        Location: {note.location?.latitude?.toFixed(6) || 'N/A'}, {note.location?.longitude?.toFixed(6) || 'N/A'}
                        {note.location?.accuracy && ` (±${Math.round(note.location.accuracy)}m)`}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInGoogleMaps(note.location!.latitude, note.location!.longitude)}
                      className="w-full mt-1 h-7 text-xs"
                    >
                      <MapPin className="h-3.5 w-3.5 mr-2" />
                      View in Google Maps
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

