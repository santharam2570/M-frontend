"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { URLS } from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MappingData {
  code: number
  msg?: string
  account?: Record<string, string>
  fields?: Record<string, string>
  count?: number
}

interface ImportResponse {
  code: number
  msg?: string
  count?: number
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [crmFields, setCrmFields] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ excelField: string; crmField: string }[]>([])
  const [recordCount, setRecordCount] = useState<number | null>(null)
  const [mappingData, setMappingData] = useState<MappingData | null>(null)

  // Toggle sidebar function
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Replace the handleFileChange function with this updated version that counts records
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)

      // Read and count records in the CSV file
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const csvContent = event.target.result as string
          // Count lines (records) in the CSV, subtract 1 for header row
          const lines = csvContent.split("\n")
          const count = Math.max(0, lines.length - 1)
          setRecordCount(count)
        }
      }
      reader.readAsText(file)
    }
  }

  const handleMappingChange = (index: number, value: string) => {
    const newMappings = [...mappings]
    newMappings[index].crmField = value
    setMappings(newMappings)
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!selectedFile) {
        toast({
          title: "Error",
          description: "Please select a file to continue",
          variant: "destructive",
        })
        return
      }

      try {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const storedData = localStorage.getItem('map_user')
        if (!storedData) {
          toast({
            title: "Error",
            description: "Authentication required. Please login again.",
            variant: "destructive",
          })
          return
        }

        const userData = JSON.parse(storedData)
        const token = userData.access_token

        const response = await fetch(URLS.LEAD_FILE_UPLOAD, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        const data: MappingData = await parseJsonResponse<MappingData>(response)
        // console.log('File Upload Response:', data)

        if (!response.ok) {
          throw new Error(data.msg || 'Failed to upload file')
        }

        if (data.code === 200) {
          // console.log('File upload successful, proceeding to fetch mapping data')
          setCurrentStep(currentStep + 1)
          
          // Fetch mapping data after successful file upload
          const mappingResponse = await fetch(URLS.LEAD_UPLOAD_VIEW, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (!mappingResponse.ok) {
            throw new Error('Failed to fetch mapping data')
          }

          const mappingData: MappingData = await parseJsonResponse<MappingData>(mappingResponse)
          // console.log('Mapping API Response:', mappingData)

          if (mappingData.code === 200 && mappingData.account && mappingData.fields) {
            // Store the mapping data for later use
            setMappingData(mappingData)
            // Convert object key-value pairs to arrays
            const excelColumns = Object.values(mappingData.account)
            const availableFields = Object.values(mappingData.fields)

            // console.log('Excel Columns:', excelColumns)
            // console.log('CRM Fields:', availableFields)

            // Set the mappings and fields only if we have valid data
            if (excelColumns.length > 0 && availableFields.length > 0) {
              setMappings(excelColumns.map((col: string) => ({ excelField: col, crmField: "" })))
              setCrmFields(["Select", ...availableFields])
              
              toast({
                title: "Success",
                description: `${data.msg}. ${data.count} records will be imported.`,
              })
            } else {
              throw new Error('No mapping data available')
            }
          } else {
            throw new Error(mappingData.msg || 'Failed to fetch mapping data')
          }
        } else {
          toast({
            title: "Error",
            description: data.msg || "Failed to upload file",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error during file upload or mapping:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to upload file or fetch mapping data. Please try again.",
          variant: "destructive",
        })
      }
    } else if (currentStep === 2) {
      // Check if at least one field is mapped
      const hasMappings = mappings.some(mapping => mapping.crmField && mapping.crmField !== 'Select')
      if (!hasMappings) {
        toast({
          title: "Error",
          description: "Please map at least one field before proceeding",
          variant: "destructive",
        })
        return
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        toast({
          title: "Error",
          description: "Authentication required. Please login again.",
          variant: "destructive",
        })
        return
      }

      const userData = JSON.parse(storedData)
      const token = userData.access_token

      // Create mapping object with CRM field keys
      const mappingObject = mappings.reduce<Record<string, string>>((acc, mapping) => {
        if (mapping.crmField && mapping.crmField !== 'Select' && mappingData?.fields) {
          // Find the key for the selected CRM field value
          const crmFieldKey = Object.entries(mappingData.fields).find(
            ([_, value]) => value === mapping.crmField
          )?.[0]
          
          if (crmFieldKey) {
            // Use the field key from mappingData.fields instead of the Excel field value
            const excelFieldKey = Object.entries(mappingData.account || {}).find(
              ([_, value]) => value === mapping.excelField
            )?.[0]
            
            if (excelFieldKey) {
              acc[crmFieldKey] = excelFieldKey
            }
          }
        }
        return acc
      }, {})

      const response = await fetch(URLS.LEAD_MAPPING, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ column: mappingObject })
      })

      const data = await parseJsonResponse<ImportResponse>(response)

      if (data.code === 200) {
        toast({
          title: "Import Started",
          description: "Importing Leads data is In Progress, it will be completed shortly.",
        })
        onOpenChange(false)
        resetDialog()
      } else {
        toast({
          title: "Error",
          description: data.msg || "Failed to process import",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process import. Please try again.",
        variant: "destructive",
      })
    }
  }

  const resetDialog = () => {
    setCurrentStep(1)
    setSelectedFile(null)
    setRecordCount(null)
    setMappings([])
    setCrmFields([])
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - now with conditional width based on sidebarOpen state */}

      

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen)
          if (!isOpen) resetDialog()
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentStep === 1 && "Lead Import"}
              {currentStep === 2 && "Mapping"}
              {currentStep === 3 && "Finish"}
            </DialogTitle>
          </DialogHeader>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border border-dashed rounded-md p-8">
                <h3 className="text-lg font-medium mb-4">Upload excel file in .csv format</h3>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                    Choose File
                    <input type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                  </label>
                  <span className="text-gray-500">{selectedFile ? selectedFile.name : "No file chosen"}</span>
                </div>
              </div>

              {/* Add the record count display here */}
              {recordCount !== null && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="font-medium">
                    Total No of Records: <span className="font-bold">{recordCount}</span>
                  </p>
                </div>
              )}

              <p className="text-orange-500 italic text-xs">
                Note: Only 100 records can be allowed to import in one batch. If the excel file contains more than 100
                records then the first 100 data will be imported and the remaining data will be skipped.
              </p>
              <div className="flex justify-end">
                <Button onClick={handleNext}>Next</Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="px-4">
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <h3 className="text-sm font-medium text-gray-700 text-center">Excel Columns</h3>
                  <h3 className="text-sm font-medium text-gray-700 text-center">Map Fields in map</h3>
                </div>

                {/* Added fixed height container with scrolling */}
                <div className="max-h-[350px] overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {mappings.map((mapping, index) => (
                      <div key={index} className="grid grid-cols-2 gap-4">
                        <div className="border rounded-md py-2 px-3 flex items-center justify-center text-sm text-dark fw-500 fs-17">
                          {mapping.excelField}
                        </div>
                        <div className="relative">
                          <select
                            className="form-control form-select form-control-lg validate_input w-full py-2 px-3 border rounded-md appearance-none pr-8 text-sm"
                            id={`db_column${index}`}
                            name={`db_column${index}`}
                            value={mapping.crmField}
                            onChange={(e) => handleMappingChange(index, e.target.value)}
                            style={{ width: '350px' }}
                          >
                            <option value="" className="dropdown-item">
                              Select
                            </option>
                            {crmFields.map((field) => (
                              <option key={field} value={field} className="dropdown-item">
                                {field}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500"
                            size={14}
                          />
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleNext}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-gray-700">Review your data and click "Submit" to complete the process.</p>

              {/* Added scrolling to the review table as well */}
              <div className="border rounded-md overflow-hidden">
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Excel Field</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">
                          Mapped CRM Field
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((mapping, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-2 text-sm text-gray-700 border-b">{mapping.excelField}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 border-b">
                            {mapping.crmField || "Not mapped"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button onClick={handlePrevious} variant="secondary">
                  Previous
                </Button>
                <Button onClick={handleSubmit}>
                  Submit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

