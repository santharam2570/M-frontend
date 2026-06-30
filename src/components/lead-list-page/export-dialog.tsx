"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText, FileType } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalRecords: number
}

export function ExportDialog({ open, onOpenChange, totalRecords }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"excel" | "csv" | "pdf">("excel")
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('current_filters')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      localStorage.removeItem('current_filters')
    }
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) throw new Error('Authentication required. Please login again.')
      
      const userData = JSON.parse(storedData)
      const token = userData.access_token
      
      // Get the current filters from localStorage
      const currentFilters = JSON.parse(localStorage.getItem('current_filters') || '[]')
      
      const response = await fetch(`${URLS.EXPORT_LEAD}?format=${selectedFormat}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filter: currentFilters
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads.${selectedFormat}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({
        title: "Export Successful",
        description: `Leads exported as ${selectedFormat.toUpperCase()} successfully!`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error exporting leads:', error)
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : 'Error exporting leads',
        variant: "destructive"
      });
    } finally {
      setIsExporting(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Leads</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select a format to export {totalRecords} lead{totalRecords !== 1 ? "s" : ""}:
          </p>

          <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as any)}>
            {/* <div className="flex items-start space-x-3 space-y-0 mb-4 border rounded-md p-3 hover:bg-muted/50">
              <RadioGroupItem value="excel" id="excel" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="excel" className="flex items-center text-sm font-medium">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                  Excel (.xlsx)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Export to Microsoft Excel format for data analysis and filtering
                </p>
              </div>
            </div> */}

            <div className="flex items-start space-x-3 space-y-0 mb-4 border rounded-md p-3 hover:bg-muted/50">
              <RadioGroupItem value="csv" id="csv" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="csv" className="flex items-center text-sm font-medium">
                  <FileText className="h-4 w-4 mr-2 text-primary" />
                  CSV (.csv)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Export to CSV format for compatibility with most spreadsheet applications
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 border rounded-md p-3 hover:bg-muted/50">
              <RadioGroupItem value="pdf" id="pdf" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="pdf" className="flex items-center text-sm font-medium">
                  <FileType className="h-4 w-4 mr-2 text-red-600" />
                  PDF (.pdf)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Export to PDF format for printing or sharing as a document
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

