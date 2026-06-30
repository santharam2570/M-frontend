"use client"

import { useEffect, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type GroupingState,
  type ExpandedState,
} from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, ChevronDown, ChevronRight, X } from "lucide-react"
import { useDebounce } from 'use-debounce'
import URLS from "@/config/urls"

type Customer = {
  _id: string
  name: string
  email: string
  company_name: string
  create_date: string
  lead_status_name: string
  lead_status_color: string
}

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "company_name",
    header: "Company",
  },
  {
    accessorKey: "phone",
    header: "Phone Number",
  },
  {
    accessorKey: "create_date",
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Created Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "lead_status_name",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("lead_status_name") as string
      const color = row.original.lead_status_color
      return (
        <div
          className="px-2 py-1 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: `${color}20`,
            color: color 
          }}
        >
          {status}
        </div>
      )
    },
  },
]

export function CrmTable() {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [grouping, setGrouping] = useState<GroupingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [data, setData] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300)

  // State for filter options
  const [filterOptions, setFilterOptions] = useState<any[]>([]) // Initialize as an empty array
  const [selectedFilters, setSelectedFilters] = useState<any[]>([]) // Initialize as an empty array

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    state: {
      columnFilters,
      sorting,
      grouping,
      expanded,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: pageSize,
      },
    },
    enableGrouping: true,
    enableExpanding: true,
    pageCount: Math.ceil(totalCount / pageSize),
    manualPagination: true,
  })

  const fetchData = async (page: number, filter: any) => {
    try {
      setLoading(true)
      const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NDIyNzQ1ODcsIm5iZiI6MTc0MjI3NDU4NywianRpIjoiMmE2OTQ1MjQtOTY4OC00ZTAxLWE4MzMtMTY0MGVhNTQ0ZWY1IiwiZXhwIjoxNzczODEwNTg3LCJpZGVudGl0eSI6IjY2ZGFjYzU3YWFlYTQ1NjIxMGM4MjBmYSIsImZyZXNoIjpmYWxzZSwidHlwZSI6ImFjY2VzcyJ9.4tqTPas5IsSPAGlF-GLI0EpRQKsdf5oE04wGnWN_3RY" // Replace with your token
      
      const response = await fetch(`${URLS.LEAD_LIST}?page=${page}&length=${pageSize}&search=${debouncedSearchTerm}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          draw: 1,
          start: (page - 1) * pageSize,
          length: pageSize,
          search: {
            value: debouncedSearchTerm,
            regex: false
          },
          filter: filter || [] // Include filters in the request
        })
      })

      const result = await response.json()
      if (result.code === 200) {
        setData(result.data)
        setTotalCount(result.total_count)
      } else {
        console.error('API error:', result)
        setData([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch filter options
  const fetchFilterOptions = async () => {
    try {
      const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NDIyNzQ1ODcsIm5iZiI6MTc0MjI3NDU4NywianRpIjoiMmE2OTQ1MjQtOTY4OC00ZTAxLWE4MzMtMTY0MGVhNTQ0ZWY1IiwiZXhwIjoxNzczODEwNTg3LCJpZGVudGl0eSI6IjY2ZGFjYzU3YWFlYTQ1NjIxMGM4MjBmYSIsImZyZXNoIjpmYWxzZSwidHlwZSI6ImFjY2VzcyJ9.4tqTPas5IsSPAGlF-GLI0EpRQKsdf5oE04wGnWN_3RY"; // Ensure this is a valid token
      const response = await fetch(`${URLS.LEAD_SETTINGS_LIST}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      if (result && result.data) {
        setFilterOptions(result.data); // Ensure result.data is defined
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  useEffect(() => {
    fetchData(currentPage, [])
    fetchFilterOptions() // Fetch filter options on component mount
  }, [])

  useEffect(() => {
    const filter = selectedFilters.map(filter => ({
      field: filter.field,
      indictor: filter.indictor,
      selected_values: filter.selected_values,
      field_orgin: filter.field_orgin
    }));
    
    fetchData(currentPage, filter); // Pass selected filters to fetchData
  }, [currentPage, selectedFilters, pageSize, debouncedSearchTerm]);

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-2">
      {/* Search Input */}
      {/* <div className="mb-4">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          onFocus={(e) => e.target.select()}
        />
      </div> */}

      {/* Page Size Selector */}
      {/* <div className="mb-4">
        <span className="mr-2">Show:</span>
        <Select value={pageSize.toString()} onValueChange={(value) => {
          setPageSize(Number(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder={pageSize.toString()} />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 50, 100].map(size => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div> */}

      {/* Filters UI */}
      <div className="space-y-2 py-4">
        <h2 className="text-lg font-semibold">Advanced Filters</h2>
        <div className="flex flex-wrap gap-4">
          {filterOptions.length > 0 && filterOptions.map((filter, index) => (
            <div key={index} className="flex items-center mb-2">
              <Select value={selectedFilters[index]?.field || ""} onValueChange={(value) => {
                const selectedOption = filterOptions.find(opt => opt.key === value);
                setSelectedFilters(prev => {
                  const newFilters = [...prev];
                  newFilters[index] = {
                    field: value,
                    field_orgin: selectedOption?.field_orgin,
                    value_list: selectedOption?.value,
                    selected_values: [],
                    indictor: "is"
                  };
                  return newFilters;
                });
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map(option => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Value Selection Dropdown */}
              {selectedFilters[index]?.value_list && selectedFilters[index].value_list.length > 0 && (
                <Select value={selectedFilters[index]?.selected_values[0] || ""} onValueChange={(value) => {
                  setSelectedFilters(prev => {
                    const newFilters = [...prev];
                    newFilters[index].selected_values = [value];
                    return newFilters;
                  });
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFilters[index].value_list.map((value: any) => (
                      <SelectItem key={value._id} value={value._id}>
                        {value.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          onFocus={(e) => e.target.select()}
        />
      </div>

      {/* Existing table code... */}
      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cell.getIsGrouped() ? (
                      <>
                        <Button variant="ghost" onClick={row.getToggleExpandedHandler()} className="mr-2">
                          {row.getIsExpanded() ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                      </>
                    ) : cell.getIsAggregated() ? (
                      flexRender(cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell, cell.getContext())
                    ) : cell.getIsPlaceholder() ? null : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {((currentPage - 1) * pageSize) + 1} to{" "}
          {Math.min(currentPage * pageSize, totalCount)} of{" "}
          {totalCount} entries
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCurrentPage(prev => Math.max(1, prev - 1))
            }}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setCurrentPage(prev => Math.min(Math.ceil(totalCount / pageSize), prev + 1))
            }}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
          >
            Next
          </Button>
        </div>
        <div className="">
        {/* <span className="mr-2">Show:</span> */}
        <Select value={pageSize.toString()} onValueChange={(value) => {
          setPageSize(Number(value))
          setCurrentPage(1)
        }}>
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder={pageSize.toString()} />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 30, 50, 100].map(size => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </div>
    </div>
  )
}
