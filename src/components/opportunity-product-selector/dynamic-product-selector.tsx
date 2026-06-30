"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import URLS from "@/config/urls"

interface Product {
  subcategory_id: string
  product_id: string
  quantity: number | string
}

interface ProductSelectorProps {
  products: Product[]
  onProductsChange: (products: Product[]) => void
  disabled?: boolean
}

interface Subcategory {
  _id: string
  name?: string
  subcategory_name?: string
  title?: string
  [key: string]: any // Allow for other possible field names
}

interface ProductItem {
  _id: string
  product_name: string
  sub_category: string
  price?: string
  description?: string
  status?: string
  create_date?: string
}

export function DynamicProductSelector({ products, onProductsChange, disabled = false }: ProductSelectorProps) {
  const { toast } = useToast()
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [productsBySubcategory, setProductsBySubcategory] = useState<{[key: string]: ProductItem[]}>({})
  const [loading, setLoading] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState<{[key: string]: boolean}>({})

  // Fetch subcategories on component mount
  useEffect(() => {
    fetchSubcategories()
  }, [])

  const fetchSubcategories = async () => {
    try {
      setLoading(true)
      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const response = await fetch(URLS.PRODUCT_SUBCATEGORY_SETTINGS_LIST, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      if (result.code === 200) {
        const subcategoriesData = result.data || []
        setSubcategories(subcategoriesData)
      } else {
        throw new Error(result.msg || 'Failed to fetch subcategories')
      }
    } catch (err: any) {
      console.error('Error fetching subcategories:', err)
      // toast({
      //   title: "Error",
      //   description: "Failed to fetch subcategories",
      //   variant: "destructive",
      // })
    } finally {
      setLoading(false)
    }
  }

  const fetchProductsBySubcategory = async (subcategoryId: string) => {
    try {
      // Check if we already have products for this subcategory
      if (productsBySubcategory[subcategoryId]) {
        return productsBySubcategory[subcategoryId]
      }

      // Set loading state for this specific subcategory
      setLoadingProducts(prev => ({ ...prev, [subcategoryId]: true }))

      const storedData = localStorage.getItem('map_user')
      if (!storedData) {
        throw new Error('User not authenticated')
      }
      const userData = JSON.parse(storedData)

      const response = await fetch(`${URLS.PRODUCTS_BY_SUBCATEGORY}/${subcategoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.code === 200) {
        const products = result.data || []
        // Cache the products for this subcategory
        setProductsBySubcategory(prev => ({
          ...prev,
          [subcategoryId]: products
        }))
        return products
      } else if (result.code === 404) {
        // No products found for this subcategory
        setProductsBySubcategory(prev => ({
          ...prev,
          [subcategoryId]: []
        }))
        return []
      } else {
        throw new Error(result.msg || 'Failed to fetch products')
      }
    } catch (err: any) {
      console.error('Error fetching products by subcategory:', err)
      toast({
        title: "Error",
        description: "Failed to fetch products for this subcategory",
        variant: "destructive",
      })
      return []
    } finally {
      // Clear loading state for this subcategory
      setLoadingProducts(prev => ({ ...prev, [subcategoryId]: false }))
    }
  }

  const addProduct = () => {
    const newProduct: Product = {
      subcategory_id: '',
      product_id: '',
      quantity: 1
    }
    onProductsChange([...products, newProduct])
  }

  const removeProduct = (index: number) => {
    const updatedProducts = products.filter((_, i) => i !== index)
    onProductsChange(updatedProducts)
  }

  const updateProduct = async (index: number, field: keyof Product, value: string | number) => {
    const updatedProducts = [...products]
    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: value
    }
    
    // If subcategory is being changed, fetch products for that subcategory
    if (field === 'subcategory_id' && value) {
      await fetchProductsBySubcategory(value as string)
      // Reset product_id when subcategory changes
      updatedProducts[index].product_id = ''
    }
    
    onProductsChange(updatedProducts)
  }

  const getFilteredProducts = (subcategoryId: string): ProductItem[] => {
    if (!subcategoryId) return []
    return productsBySubcategory[subcategoryId] || []
  }

  const getSubcategoryDisplayName = (subcategoryId: string): string => {
    const subcategory = subcategories.find(s => s._id === subcategoryId)
    if (!subcategory) return ''
    return subcategory.name || subcategory.subcategory_name || subcategory.title || `Subcategory ${subcategory._id.slice(-4)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Product</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addProduct}
          disabled={disabled || loading}
          className="h-8 w-8 p-0 rounded-full"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {products.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          No products selected. Click the + button to add products.
        </div>
      )}

      {products.map((product, index) => (
        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
          {/* Sub Category Dropdown */}
          <div className="flex-1">
            <Select
              value={product.subcategory_id}
              onValueChange={(value) => {
                updateProduct(index, 'subcategory_id', value)
                updateProduct(index, 'product_id', '') // Reset product when subcategory changes
              }}
              disabled={disabled || loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Choose Sub Category --">
                  {product.subcategory_id ? getSubcategoryDisplayName(product.subcategory_id) : "-- Choose Sub Category --"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {subcategories.map((subcategory) => {
                  // Try different possible field names for the display name
                  const displayName = subcategory.name || subcategory.subcategory_name || subcategory.title || `Subcategory ${subcategory._id.slice(-4)}`
                  return (
                    <SelectItem key={subcategory._id} value={subcategory._id}>
                      {displayName}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Product Dropdown */}
          <div className="flex-1">
              <Select
                value={product.product_id}
                onValueChange={(value) => updateProduct(index, 'product_id', value)}
                disabled={disabled || loading || !product.subcategory_id || loadingProducts[product.subcategory_id]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue 
                    placeholder={
                      loadingProducts[product.subcategory_id] 
                        ? "Loading products..." 
                        : "-- Choose Product --"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {getFilteredProducts(product.subcategory_id).length === 0 && !loadingProducts[product.subcategory_id] ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No products found for this subcategory
                    </div>
                  ) : (
                    getFilteredProducts(product.subcategory_id).map((productItem: ProductItem) => (
                      <SelectItem key={productItem._id} value={productItem._id}>
                        {productItem.product_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
          </div>

          {/* Quantity Input */}
          <div className="w-20">
            <Input
              type="number"
              min="1"
              value={product.quantity}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty values while typing
                if (value === '') {
                  updateProduct(index, 'quantity', '');
                } else {
                  const numValue = parseInt(value);
                  if (!isNaN(numValue) && numValue > 0) {
                    updateProduct(index, 'quantity', numValue);
                  } else if (!isNaN(numValue) && numValue <= 0) {
                    // If value is 0 or negative, set to 1
                    updateProduct(index, 'quantity', 1);
                  }
                }
              }}
              onBlur={(e) => {
                // Ensure minimum value of 1 on blur
                const value = e.target.value;
                if (value === '' || parseInt(value) < 1) {
                  updateProduct(index, 'quantity', 1);
                }
              }}
              disabled={disabled || loading}
              className="text-center"
            />
          </div>

          {/* Delete Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeProduct(index)}
            disabled={disabled || loading}
            className="h-8 w-8 p-0 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
