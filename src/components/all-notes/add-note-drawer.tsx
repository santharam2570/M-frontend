"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, X, AlertCircle, MapPin, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import URLS from '@/config/urls'
import { useTimeline } from "@/hooks/use-timeline"

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  location?: {
    latitude: number
    longitude: number
    accuracy: number
  } | null
}

interface EditNoteData {
  _id: string
  note: string
}

interface AddNoteDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (note: Note) => void
  entityName?: string
  associateId: string
  associateTo: string // "lead", "company", "opportunity", "partner", "onboarding", "new_request", "ticket"
  editNote?: EditNoteData | null
}

// Declare SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function AddNoteDrawer({ 
  open, 
  onOpenChange, 
  onSave, 
  entityName, 
  associateId, 
  associateTo,
  editNote = null,
}: AddNoteDrawerProps) {
  const isEditMode = Boolean(editNote?._id)
  const [content, setContent] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [micPermission, setMicPermission] = useState<boolean | null>(null)
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [locationData, setLocationData] = useState<{
    latitude: number
    longitude: number
    accuracy: number
  } | null>(null)

  const { toast } = useToast()
  const recognitionRef = useRef<any>(null)
  const contentRef = useRef(content)
  const { addTimelineActivity } = useTimeline()

  // Keep contentRef updated with the latest content value
  useEffect(() => {
    contentRef.current = content
  }, [content])

  useEffect(() => {
    if (open) {
      if (editNote) {
        setContent(editNote.note)
        setLocationData(null)
      } else {
        setContent("")
        setLocationData(null)
      }
    }
  }, [open, editNote])

  // Automatically capture location when the drawer opens for new notes
  useEffect(() => {
    if (open && !isEditMode && !locationData && !isCapturingLocation) {
      captureLocation()
    }
  }, [open, isEditMode])

  // Get current location using browser's geolocation API with Google Maps as fallback
  const getCurrentPosition = async (): Promise<GeolocationPosition | null> => {
    try {
      // First try to use browser's native geolocation API
      if (navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
          )
        })
        return position
      }

      // If browser geolocation fails or is not available, try Google Maps Geocoding API
      const response = await fetch(`${URLS.GOOGLE_GEOCODING_API}?key=${URLS.GOOGLE_MAPS_API_KEY}`)
      const data = await response.json()

      if (data.status === 'OK' && data.results && data.results[0]) {
        const location = data.results[0].geometry.location
        return {
          coords: {
            latitude: location.lat,
            longitude: location.lng,
            accuracy: 100, // Default accuracy since Google doesn't provide this
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        } as GeolocationPosition
      }

      toast({
        title: "Location error",
        description: "Could not determine your location",
        variant: "destructive"
      })
      return null
    } catch (error) {
      return null
    }
  }

  // Function to handle speech recognition
  const startSpeechRecognition = () => {
    // Check if the browser supports the Web Speech API
    if (!("webkitSpeechRecognition" in window)) {
      setErrorMessage("Speech recognition is not supported in this browser. Try Chrome or Edge.")
      return
    }

    try {
      // Create a new instance of the speech recognition object
      const recognition = new window.webkitSpeechRecognition()

      // Configure the recognition
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = "en-US"

      // Set up event handlers
      recognition.onstart = () => {
        setIsRecording(true)
        setRecordingStatus("Listening...")
      }

      recognition.onresult = (event: { results: { transcript: any }[][] }) => {
        const transcript = event.results[0][0].transcript
        setContent((prev) => prev + " " + transcript)
      }

      recognition.onerror = (event: { error: any }) => {
        console.error("Speech recognition error:", event.error)
        setRecordingStatus(`Error: ${event.error}`)
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
        setRecordingStatus("")
      }

      // Start the recognition
      recognition.start()
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      setErrorMessage("Failed to start speech recognition. Please try again.")
      setIsRecording(false)
    }
  }
  
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      setRecordingStatus("")
    } else {
      startSpeechRecognition()
    }
  }

  // Cleanup function to stop recognition when component unmounts
  useEffect(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Error stopping recognition:", error)
      }
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (error) {
          console.error("Error stopping recognition:", error)
        }
      }
    }
  }, [isRecording])

  const clearContent = () => {
    setContent("")
  }

  const captureLocation = async () => {
    setIsCapturingLocation(true)
    try {
      const position = await getCurrentPosition()
      if (position) {
        setLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      }
    } catch (error) {
      console.error("Error capturing location:", error)
      toast({
        title: "Error capturing location",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsCapturingLocation(false)
    }
  }

  const handleSave = async () => {
    if (content.trim() === "" || isSaving) {
      toast({
        title: "Please add some content to your note",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    // If location hasn't been captured yet, try to capture it now (add mode only)
    let finalLocationData = locationData
    if (!isEditMode && !finalLocationData) {
      setIsCapturingLocation(true)
      try {
        const position = await getCurrentPosition()
        if (position) {
          finalLocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
        }
      } catch (error) {
        console.error("Error capturing location during save:", error)
      } finally {
        setIsCapturingLocation(false)
      }
    }

    const newNote: Note = {
      id: editNote?._id || Date.now().toString(),
      title: `Note ${new Date().toLocaleString()}`,
      content: content,
      createdAt: new Date().toISOString(),
      location: finalLocationData,
    }

    try {
      const token = JSON.parse(localStorage.getItem('map_user') || '{}').access_token
      if (!token) throw new Error("Token not found")

      const requestPayload = {
        note: content,
        associate_id: associateId,
        associate_to: associateTo,
        ...(isEditMode ? {} : { location: finalLocationData }),
      }

      const response = await fetch(
        isEditMode ? `${URLS.ADD_NOTES}/${editNote?._id}` : `${URLS.ADD_NOTES}`,
        {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(requestPayload)
      })

      // Check HTTP status first
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error('HTTP Error:', response.status, errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const res = await response.json()

      if (res.code === 200) {
        setContent("")
        setLocationData(null)

        onOpenChange(false)
        onSave(newNote)

        toast({
          title: isEditMode ? "Note Updated Successfully!" : "Notes Added Successfully!",
          description: isEditMode
            ? "Your note has been updated."
            : finalLocationData
              ? "Location was captured successfully"
              : "Note saved without location data",
        })

        void addTimelineActivity({
          category_name: 'note',
          action: isEditMode ? 'update' : 'create',
          text_info: isEditMode
            ? `Updated note for ${entityName || associateTo}`
            : `Created note for ${entityName || associateTo}`,
          associate_id: associateId,
          associate_to: associateTo
        })
      } else {
        // Show the actual error message from the API
        const errorMessage = res.msg || res.message || 'Failed to save note. Please try again.'
        console.error('API Error Response:', res)
        toast({
          title: "Failed to save note",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving note:", error)
      const errorMessage = error instanceof Error ? error.message : "An error occurred while saving the note. Please try again."
      toast({
        title: "Error saving note",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (error) {
        console.error("Error stopping recognition:", error)
      }
      setIsRecording(false)
    }

    // Clear content and close drawer
    setContent("")
    setLocationData(null)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="data-[side=right]:sm:max-w-md p-0 flex flex-col h-full gap-0">
        <div className="px-6 py-4">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">
              {isEditMode ? "Edit Note" : "Add New Note"} {entityName ? `for ${entityName}` : ""}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {isEditMode
                ? "Update the note content and save your changes"
                : "Create a new note to save the latest update"}
            </SheetDescription>
          </SheetHeader>

          <Separator className="my-4" />
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="note-content">Note</Label>

            <Textarea
              id="note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note or use Voice to text"
              className="min-h-[200px] resize-none"
            />

            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={clearContent}>
                <X className="h-4 w-4 mr-2" /> Clear
              </Button>

              <Button variant={isRecording ? "destructive" : "secondary"} size="sm" onClick={toggleRecording}>
                {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                {isRecording ? "Stop Recording" : "Voice to Text"}
              </Button>

              {isCapturingLocation && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Capturing location...
                </div>
              )}

              {recordingStatus && <p className="text-sm text-muted-foreground w-full mt-1">{recordingStatus}</p>}

              {micPermission === false && (
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="ml-auto">
                  Refresh Permissions
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Static footer with Cancel and Save buttons */}
        <div className="border-t p-4 mt-auto flex justify-between gap-4">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={isCapturingLocation || isSaving || content.trim() === ""}>
            {isCapturingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Capturing location...
              </>
            ) : isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Updating..." : "Saving..."}
              </>
            ) : (
              isEditMode ? "Update" : "Save"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

