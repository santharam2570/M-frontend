"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Select,
  FormSelectContent,
  FormSelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formSelectTriggerClassName, themePrimaryButtonSmClassName } from "@/lib/form-field-styles"
import { getStoredAuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

function getOrganizationNameFromAuth(): string {
  const storedUser = getStoredAuthUser()
  const organization = storedUser?.organization
  if (!organization) return ""

  const candidates = [
    organization.organization_name,
    organization.name,
    organization.org_name,
    organization.company_name,
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }

  return ""
}

const CURRENCIES = [
  { _id: "inr", name: "INR" },
  { _id: "usd", name: "USD" },
  { _id: "eur", name: "EUR" },
  { _id: "gbp", name: "GBP" },
]

const COUNTRIES = [
  { _id: "india", name: "India" },
  { _id: "usa", name: "United States" },
  { _id: "uk", name: "United Kingdom" },
  { _id: "uae", name: "United Arab Emirates" },
]

const INDIAN_STATES = [
  { _id: "tn", name: "Tamil Nadu" },
  { _id: "ka", name: "Karnataka" },
  { _id: "kl", name: "Kerala" },
  { _id: "mh", name: "Maharashtra" },
  { _id: "dl", name: "Delhi" },
  { _id: "gj", name: "Gujarat" },
  { _id: "ts", name: "Telangana" },
  { _id: "ap", name: "Andhra Pradesh" },
]

const organizationProfileSchema = z.object({
  orgname: z.string().min(1, { message: "Organization name is required." }),
  baseCurrency: z.string().min(1, { message: "Please select a base currency." }),
  orgphone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().min(1, { message: "Address line 1 is required." }),
  addressLine2: z.string().optional(),
  country: z.string().min(1, { message: "Please select a country." }),
  state: z.string().optional(),
  city: z.string().min(1, { message: "City is required." }),
  pincode: z.string().min(1, { message: "Pincode/ZIP is required." }),
})

type OrganizationProfileValues = z.infer<typeof organizationProfileSchema>

export function OrganizationProfileForm() {
  const { toast } = useToast()
  const [states, setStates] = useState(INDIAN_STATES)
  const [isSaving, setIsSaving] = useState(false)

  const organizationName = getOrganizationNameFromAuth()

  const form = useForm<OrganizationProfileValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      orgname: organizationName,
      baseCurrency: "inr",
      orgphone: "",
      website: "",
      addressLine1: "",
      addressLine2: "",
      country: "India",
      state: "",
      city: "",
      pincode: "",
    },
  })

  useEffect(() => {
    if (organizationName) {
      form.setValue("orgname", organizationName)
    }
  }, [organizationName, form])

  const handleCountryChange = (value: string) => {
    form.setValue("country", value)
    setStates(value === "India" ? INDIAN_STATES : [])
    form.setValue("state", "")
  }

  async function onSubmit(values: OrganizationProfileValues) {
    setIsSaving(true)
    try {
      // Organization profile API integration can be wired here when available.
      console.log("Organization profile update:", values)
      toast({
        title: "Profile saved",
        description: "Your organization profile has been updated.",
      })
    } catch (error) {
      console.error("Error saving organization profile:", error)
      toast({
        title: "Error",
        description: "Failed to save organization profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Organization Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization details and address information.
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="orgname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter organization name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address line 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter address line 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select onValueChange={handleCountryChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger
                            size="form"
                            className={cn(formSelectTriggerClassName, "w-full")}
                          >
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <FormSelectContent>
                          {COUNTRIES.map((country) => (
                            <FormSelectItem key={country._id} value={country.name}>
                              {country.name}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger
                            size="form"
                            className={cn(formSelectTriggerClassName, "w-full")}
                            disabled={states.length === 0}
                          >
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <FormSelectContent>
                          {states.map((state) => (
                            <FormSelectItem key={state._id} value={state.name}>
                              {state.name}
                            </FormSelectItem>
                          ))}
                        </FormSelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode/ZIP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter pincode"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value
                            if (/^[0-9]*$/.test(value) || value === "") {
                              field.onChange(value)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  size="sm"
                  className={themePrimaryButtonSmClassName}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
