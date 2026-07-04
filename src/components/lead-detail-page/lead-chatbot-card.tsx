"use client"

import { Sparkles } from "lucide-react"

import { ChatPanel } from "@/components/ai-chat/chat-panel"
import { Card, CardContent } from "@/components/ui/card"
import {
  leadDetailBodyMutedClassName,
  leadDetailSectionTitleClassName,
} from "@/lib/form-field-styles"
import type { LeadChatContext } from "@/lib/ai/chat-types"
import { cn } from "@/lib/utils"

const leadDetailCardClassName =
  "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"

const LEAD_QUICK_PROMPTS = [
  "Summarize this lead",
  "Suggest follow-up actions",
  "Draft a WhatsApp message",
]

interface LeadChatbotCardProps {
  lead: LeadChatContext
}

export function LeadChatbotCard({ lead }: LeadChatbotCardProps) {
  const context = { type: "lead" as const, lead }

  return (
    <Card className={cn(leadDetailCardClassName, "overflow-hidden")}>
      <CardContent className="flex flex-col p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className={leadDetailSectionTitleClassName}>AI Assistant</h3>
              <p className={cn(leadDetailBodyMutedClassName, "text-xs")}>
                Ask about this lead
              </p>
            </div>
          </div>
        </div>

        <ChatPanel context={context} quickPrompts={LEAD_QUICK_PROMPTS} />
      </CardContent>
    </Card>
  )
}
