"use client"

import * as React from "react"
import { Building, Building2, Calendar, RotateCcw, Search, UserPlus, User, Users, Briefcase, FileText, ClipboardList, Clock, Target, Mail, Phone, ChevronRight, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import URLS from "@/config/urls"
import { useToast } from "@/hooks/use-toast"

// Define types for search results based on the API response
type CompanyResult = {
  _id: string
  company_name: string
  associate_to: string
  org_id: number
  create_date?: string
  create_date_utc?: string
  company_status_name?: string
  company_status_color?: string
  phone?: string
  email?: string
}

type ContactResult = {
  _id: string
  contact_name: string
  email?: string
  phone?: string
  company_id?: string
  create_date?: string
  create_date_utc?: string
  designation?: string
  associate_to: string
  status?: string
  org_id: number
}

type FollowupTaskResult = {
  _id: string
  description: string
  company_id?: string
  date?: number
  time?: string
  status?: string
  create_date?: string
  create_date_utc?: string
  associate_to: string
  org_id: number
}

type OpportunityResult = {
  _id: string
  opportunity_name?: string
  company_id?: string
  company_name?: string
  create_date?: string
  create_date_utc?: string
  associate_to: string
  org_id: number
  opportunity_status_name?: string
  opportunity_color?: string
}

type LeadResult = {
  _id: string
  lead_name?: string
  name?: string
  company_id?: string
  company_name?: string
  create_date?: string
  create_date_utc?: string
  associate_to: string
  org_id: number
  status?: string
  lead_status_name?: string
  lead_status_color?: string
  email?: string
  phone?: string
}

type QuoteResult = {
  _id: string
  quote_name?: string
  company_id?: string
  create_date?: string
  create_date_utc?: string
  associate_to: string
  org_id: number
}

type TaskResult = {
  _id: string
  task_name?: string
  description?: string
  create_date?: string
  create_date_utc?: string
  associate_to: string
  org_id: number
}

type BulkSearchResponse = {
  company: CompanyResult[]
  contact: ContactResult[]
  followuptask: FollowupTaskResult[]
  opportunity: OpportunityResult[]
  lead: LeadResult[]
  quote: QuoteResult[]
  task: TaskResult[]
  customfieldsearch: any[]
}

type SearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<BulkSearchResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("all")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null)

  // Function to perform the search using the bulksearch API
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Get token from localStorage
      const userDataString = localStorage.getItem("map_user")
      if (!userDataString) {
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: "Please log in again."
        })
        setIsLoading(false)
        return
      }

      const userData = JSON.parse(userDataString)
      const token = userData?.access_token

      if (!token) {
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: "Invalid token. Please log in again."
        })
        setIsLoading(false)
        return
      }

      // Make API call to bulksearch endpoint
      const response = await fetch(`${URLS.BULK_SEARCH}?search=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`)
      }

      const data: BulkSearchResponse = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search error:', error)
      toast({
        variant: "destructive",
        title: "Search failed",
        description: error instanceof Error ? error.message : "An error occurred while searching"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // State to track if query is too short
  const [queryTooShort, setQueryTooShort] = React.useState(false)

  // Debounced search effect
  React.useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }

    const trimmedQuery = searchQuery.trim()
    
    if (trimmedQuery === "") {
      setSearchResults(null)
      setQueryTooShort(false)
      return
    }

    // Check if search query has at least 3 characters
    if (trimmedQuery.length < 3) {
      setSearchResults(null)
      setIsLoading(false)
      setQueryTooShort(true)
      return
    }

    // Reset the too short flag
    setQueryTooShort(false)
    
    // Debounce search to avoid excessive API calls
    debounceTimeout.current = setTimeout(() => {
      performSearch(trimmedQuery)
    }, 500) // 500ms debounce

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current)
      }
    }
  }, [searchQuery])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
    
    // Reset search when dialog closes
    if (!open) {
      setSearchQuery("")
      setSearchResults(null)
      setActiveTab("all")
    }
  }, [open])
  
  // Calculate total results count
  const totalResults = React.useMemo(() => {
    if (!searchResults) return 0
    
    return (
      searchResults.company.length +
      searchResults.contact.length +
      searchResults.followuptask.length +
      searchResults.opportunity.length +
      searchResults.lead.length +
      searchResults.quote.length +
      searchResults.task.length
    )
  }, [searchResults])
  
  // Handle navigation to detail pages
  const navigateToDetail = (type: string, id: string, companyId?: string) => {
    onOpenChange(false)
    
    switch (type) {
      case "company":
        router.push(`/company/detail/${id}`)
        break
      case "contact":
        // Redirect to company details page if company_id is available
        if (companyId) {
          router.push(`/company/detail/${companyId}`)
        } else {
          // Fallback to contact list if no company_id
          router.push(`/contact`)
        }
        break
      case "opportunity":
        router.push(`/opportunity/detail/${id}`)
        break
      case "lead":
        router.push(`/lead/detail/${id}`)
        break
      case "followuptask":
        router.push(`/taskdetail/${id}`)
        break
      case "quote":
        router.push(`/quotes/${id}`)
        break
      case "task":
        router.push(`/taskdetail/${id}`)
        break
      default:
        break
    }
  }

  // Format date to a more readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return ""
    
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    } catch (error) {
      return dateString
    }
  }
  
  // Format timestamp to date
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return ""
    
    try {
      const date = new Date(timestamp)
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date)
    } catch (error) {
      return ""
    }
  }

  // Helper function to render status badge with dynamic color
  const renderStatusBadge = (statusName?: string, statusColor?: string) => {
    if (!statusName) return null

    // Check if color is a hex color (starts with #)
    const isHexColor = statusColor && statusColor.startsWith('#')
    
    // If it's a hex color, use inline styles
    if (isHexColor) {
      // Calculate text color based on background brightness
      const hex = statusColor.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      const textColor = brightness > 128 ? '#000000' : '#ffffff'
      
      return (
        <Badge 
          style={{ 
            backgroundColor: statusColor, 
            color: textColor,
            borderColor: statusColor
          }}
        >
          {statusName}
        </Badge>
      )
    }
    
    // If it's a Tailwind class string, use it directly
    if (statusColor && statusColor.includes('bg-')) {
      return (
        <Badge className={statusColor}>
          {statusName}
        </Badge>
      )
    }
    
    // Default fallback
    return (
      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
        {statusName}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] p-0">
        <div className="px-10 pt-6 pb-4 space-y-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all records..."
                className="pl-10 h-12 text-base"
                disabled={isLoading}
              />
            </div>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="flex-shrink-0 bg-transparent py-0 px-0 mx-0"
                title="Clear search"
                disabled={isLoading}
                size="icon"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          </div>
        ) : searchQuery.trim() === "" ? (
          <div className="text-center py-20 text-muted-foreground">Start typing to search...</div>
        ) : searchResults && totalResults > 0 ? (
          <div className="flex flex-col">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-3 pb-2 border-b border-border/40">
                <TabsList className="w-full grid grid-cols-6 h-auto p-1 bg-muted/50">
                  <TabsTrigger value="all" className="w-full">All</TabsTrigger>
                  <TabsTrigger value="leads" className="w-full" disabled={searchResults.lead.length === 0}>Leads</TabsTrigger>
                  <TabsTrigger value="companies" className="w-full" disabled={searchResults.company.length === 0}>Companies</TabsTrigger>
                  <TabsTrigger value="contacts" className="w-full" disabled={searchResults.contact.length === 0}>Contacts</TabsTrigger>
                  <TabsTrigger value="opportunities" className="w-full" disabled={searchResults.opportunity.length === 0}>Opportunities</TabsTrigger>
                  {/* <TabsTrigger value="tasks" className="w-full" disabled={searchResults.followuptask.length === 0}>Tasks</TabsTrigger> */}
                </TabsList>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(85vh-180px)] px-6 pb-6">
                <TabsContent value="all" className="mt-4 space-y-6">
                  {/* Companies Section */}
                  {searchResults.company.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="font-semibold text-foreground">Companies</h3>
                        <span className="text-sm text-muted-foreground">
                          ({searchResults.company.length} {searchResults.company.length === 1 ? "record" : "records"})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {searchResults.company.slice(0, 3).map((item) => (
                          <Card 
                            key={item._id} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => navigateToDetail("company", item._id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 mt-0.5 flex-shrink-0">
                                  <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-foreground">{item.company_name}</h4>
                                    {renderStatusBadge(item.company_status_name, item.company_status_color)}
                                  </div>
                                  <div className="space-y-1.5 text-sm">
                                    {item.phone && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.phone}</span>
                                      </div>
                                    )}
                                    {item.email && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {item.create_date && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(item.create_date)}</span>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {searchResults.company.length > 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setActiveTab("companies")}
                          >
                            View all {searchResults.company.length} companies
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contacts Section */}
                  {searchResults.contact.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <h3 className="font-semibold text-foreground">Contacts</h3>
                        <span className="text-sm text-muted-foreground">
                          ({searchResults.contact.length} {searchResults.contact.length === 1 ? "record" : "records"})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {searchResults.contact.slice(0, 3).map((item) => (
                          <Card 
                            key={item._id} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => navigateToDetail("contact", item._id, item.company_id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950 mt-0.5 flex-shrink-0">
                                  <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <h4 className="font-semibold text-foreground">{item.contact_name}</h4>
                                  <div className="space-y-1.5 text-sm">
                                    {item.phone && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.phone}</span>
                                      </div>
                                    )}
                                    {item.email && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {item.create_date && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(item.create_date)}</span>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {searchResults.contact.length > 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setActiveTab("contacts")}
                          >
                            View all {searchResults.contact.length} contacts
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Opportunities Section */}
                  {searchResults.opportunity.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        <h3 className="font-semibold text-foreground">Opportunities</h3>
                        <span className="text-sm text-muted-foreground">
                          ({searchResults.opportunity.length} {searchResults.opportunity.length === 1 ? "record" : "records"})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {searchResults.opportunity.slice(0, 3).map((item) => (
                          <Card 
                            key={item._id} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => navigateToDetail("opportunity", item._id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 mt-0.5 flex-shrink-0">
                                  <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-foreground">{item.opportunity_name}</h4>
                                    {renderStatusBadge(item.opportunity_status_name, item.opportunity_color)}
                                  </div>
                                  {item.company_name && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>{item.company_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {item.create_date && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(item.create_date)}</span>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {searchResults.opportunity.length > 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setActiveTab("opportunities")}
                          >
                            View all {searchResults.opportunity.length} opportunities
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Leads Section */}
                  {searchResults.lead.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-foreground">Leads</h3>
                        <span className="text-sm text-muted-foreground">
                          ({searchResults.lead.length} {searchResults.lead.length === 1 ? "record" : "records"})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {searchResults.lead.slice(0, 3).map((item) => (
                          <Card 
                            key={item._id} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => navigateToDetail("lead", item._id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 mt-0.5 flex-shrink-0">
                                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-foreground">{item.lead_name || item.name}</h4>
                                    {renderStatusBadge(item.lead_status_name || item.status, item.lead_status_color)}
                                  </div>
                                  <div className="space-y-1.5 text-sm">
                                    {item.company_name && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.company_name}</span>
                                      </div>
                                    )}
                                    {item.phone && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.phone}</span>
                                      </div>
                                    )}
                                    {item.email && (
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>{item.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {item.create_date && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(item.create_date)}</span>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {searchResults.lead.length > 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setActiveTab("leads")}
                          >
                            View all {searchResults.lead.length} leads
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tasks Section */}
                  {/* {searchResults.followuptask.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <h3 className="font-semibold text-foreground">Tasks</h3>
                        <span className="text-sm text-muted-foreground">
                          ({searchResults.followuptask.length} {searchResults.followuptask.length === 1 ? "record" : "records"})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {searchResults.followuptask.slice(0, 3).map((item) => (
                          <Card 
                            key={item._id} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => navigateToDetail("followuptask", item._id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 mt-0.5 flex-shrink-0">
                                  <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-foreground">{item.description}</h4>
                                    {item.status && (
                                      <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{item.status}</Badge>
                                    )}
                                  </div>
                                  {(item.date || item.time) && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>
                                        {item.date && formatTimestamp(item.date)} {item.time}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                        {searchResults.followuptask.length > 3 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full text-xs"
                            onClick={() => setActiveTab("tasks")}
                          >
                            View all {searchResults.followuptask.length} tasks
                          </Button>
                        )}
                      </div>
                    </div>
                  )} */}

                  {/* Quotes Section */}
                  {searchResults.quote.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="font-semibold text-foreground">Quotes</h3>
                        <span className="text-sm text-muted-foreground">
                          ({searchResults.quote.length} {searchResults.quote.length === 1 ? "record" : "records"})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {searchResults.quote.slice(0, 3).map((item) => (
                          <Card 
                            key={item._id} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                            onClick={() => navigateToDetail("quote", item._id)}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 mt-0.5 flex-shrink-0">
                                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                  <h4 className="font-semibold text-foreground">{item.quote_name}</h4>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {item.create_date && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(item.create_date)}</span>
                                  </div>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="companies" className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-semibold text-foreground">Companies</h3>
                    <span className="text-sm text-muted-foreground">
                      ({searchResults.company.length} {searchResults.company.length === 1 ? "record" : "records"})
                    </span>
                  </div>
                  <div className="space-y-3">
                      {searchResults.company.map((item) => (
                        <Card 
                          key={item._id} 
                          className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                          onClick={() => navigateToDetail("company", item._id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 mt-0.5 flex-shrink-0">
                                <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-foreground">{item.company_name}</h4>
                                  {renderStatusBadge(item.company_status_name, item.company_status_color)}
                                </div>
                                <div className="space-y-1.5 text-sm">
                                  {item.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>{item.phone}</span>
                                    </div>
                                  )}
                                  {item.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>{item.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              {item.create_date && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDate(item.create_date)}</span>
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                </TabsContent>

                <TabsContent value="contacts" className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-semibold text-foreground">Contacts</h3>
                    <span className="text-sm text-muted-foreground">
                      ({searchResults.contact.length} {searchResults.contact.length === 1 ? "record" : "records"})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {searchResults.contact.map((item) => (
                      <Card 
                        key={item._id} 
                        className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => navigateToDetail("contact", item._id, item.company_id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950 mt-0.5 flex-shrink-0">
                              <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <h4 className="font-semibold text-foreground">{item.contact_name}</h4>
                              <div className="space-y-1.5 text-sm">
                                {item.phone && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{item.phone}</span>
                                  </div>
                                )}
                                {item.email && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{item.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {item.create_date && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.create_date)}</span>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    </div>
                </TabsContent>

                <TabsContent value="opportunities" className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <h3 className="font-semibold text-foreground">Opportunities</h3>
                    <span className="text-sm text-muted-foreground">
                      ({searchResults.opportunity.length} {searchResults.opportunity.length === 1 ? "record" : "records"})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {searchResults.opportunity.map((item) => (
                      <Card 
                        key={item._id} 
                        className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => navigateToDetail("opportunity", item._id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 mt-0.5 flex-shrink-0">
                              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">{item.opportunity_name}</h4>
                                {renderStatusBadge(item.opportunity_status_name, item.opportunity_color)}
                              </div>
                              {item.company_name && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>{item.company_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {item.create_date && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.create_date)}</span>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    </div>
                </TabsContent>

                <TabsContent value="leads" className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-foreground">Leads</h3>
                    <span className="text-sm text-muted-foreground">
                      ({searchResults.lead.length} {searchResults.lead.length === 1 ? "record" : "records"})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {searchResults.lead.map((item) => (
                      <Card 
                        key={item._id} 
                        className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => navigateToDetail("lead", item._id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 mt-0.5 flex-shrink-0">
                              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">{item.lead_name || item.name}</h4>
                                {renderStatusBadge(item.lead_status_name || item.status, item.lead_status_color)}
                              </div>
                              <div className="space-y-1.5 text-sm">
                                {item.company_name && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{item.company_name}</span>
                                  </div>
                                )}
                                {item.phone && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{item.phone}</span>
                                  </div>
                                )}
                                {item.email && (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{item.email}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {item.create_date && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(item.create_date)}</span>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    </div>
                </TabsContent>

                {/* <TabsContent value="tasks" className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-semibold text-foreground">Tasks</h3>
                    <span className="text-sm text-muted-foreground">
                      ({searchResults.followuptask.length} {searchResults.followuptask.length === 1 ? "record" : "records"})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {searchResults.followuptask.map((item) => (
                      <Card 
                        key={item._id} 
                        className="p-4 hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => navigateToDetail("followuptask", item._id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 mt-0.5 flex-shrink-0">
                              <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-foreground">{item.description}</h4>
                                {item.status && (
                                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">{item.status}</Badge>
                                )}
                              </div>
                              {(item.date || item.time) && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>
                                    {item.date && formatTimestamp(item.date)} {item.time}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    </div>
                </TabsContent> */}
              </div>
            </Tabs>
          </div>
        ) : queryTooShort ? (
          <div className="text-center py-20 text-muted-foreground">
            Please enter at least 3 characters to start the search
          </div>
        ) : searchQuery.trim() !== "" ? (
          <div className="text-center py-20 text-muted-foreground">No results found for "{searchQuery}"</div>
        ) : null
        }
      </DialogContent>
    </Dialog>
  )
}
