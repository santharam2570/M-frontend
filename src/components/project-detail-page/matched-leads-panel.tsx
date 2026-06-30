"use client"

import Link from "next/link"
import { Loader2, Phone, Target, UserPlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { MatchedLead } from "@/lib/projects/types"

interface MatchedLeadsPanelProps {
  leads: MatchedLead[]
  isLoading?: boolean
}

export function MatchedLeadsPanel({ leads, isLoading = false }: MatchedLeadsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading matched leads...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Leads matched by budget band, preferred location, and property type.
      </p>
      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-muted-foreground">
          No matching leads found for this project yet.
        </div>
      ) : (
        leads.map((lead) => (
          <Card key={lead._id} className="border-slate-200/80 shadow-none">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{lead.name || "Unnamed lead"}</p>
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                    <Target className="mr-1 h-3 w-3" />
                    {lead.match_score}% match
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {lead.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.phone}
                    </span>
                  ) : null}
                  {lead.budget ? <span>Budget: {lead.budget}</span> : null}
                  {lead.location ? <span>Location: {lead.location}</span> : null}
                  {lead.property_type ? <span>Type: {lead.property_type}</span> : null}
                </div>
                {lead.match_reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {lead.match_reasons.map((reason) => (
                      <Badge key={reason} variant="secondary" className="text-[10px] font-normal">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/lead/detail/${lead._id}`}>View in Leads</Link>
                </Button>
                <Button size="sm" className="gap-1">
                  <UserPlus className="h-3.5 w-3.5" />
                  Schedule Visit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
