"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText, FileType } from "lucide-react"
import { RadioGroup, RadioGroupOption } from "@/components/ui/radio-group"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"
import { useLeadPermissions } from "@/hooks/useLeadPermissions"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  totalRecords: number
}

export function ExportDialog({ open, onOpenChange, totalRecords }: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<"excel" | "csv" | "pdf">("excel")
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()
  const { canExportLead } = useLeadPermissions()

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
    if (!canExportLead) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to export leads.",
        variant: "destructive",
      })
      return
    }

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
            <RadioGroupOption
              value="excel"
              id="excel"
              title="Excel (.xlsx)"
              description="Export to Microsoft Excel format for data analysis and filtering"
              icon={<FileSpreadsheet className="h-4 w-4 text-green-600" />}
            />
            <RadioGroupOption
              value="csv"
              id="csv"
              title="CSV (.csv)"
              description="Export to CSV format for compatibility with most spreadsheet applications"
              icon={<FileText className="h-4 w-4 text-primary" />}
            />
            <RadioGroupOption
              value="pdf"
              id="pdf"
              title="PDF (.pdf)"
              description="Export to PDF format for printing or sharing as a document"
              icon={<FileType className="h-4 w-4 text-red-600" />}
            />
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !canExportLead}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

