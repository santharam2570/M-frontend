"use client"

import { Construction, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface ComingSoonProps {
  moduleName?: string
  description?: string
}

export function ComingSoon({ moduleName = "This Module", description }: ComingSoonProps) {
  const defaultDescription = "We're working hard to bring you this feature. It will be available soon!"

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl" />
            <div className="relative bg-primary/5 rounded-full p-6">
              <Construction className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {moduleName} Coming Soon
            </h2>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <p className="text-sm">
                {description || defaultDescription}
              </p>
            </div>
          </div>

          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">Under Development</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

