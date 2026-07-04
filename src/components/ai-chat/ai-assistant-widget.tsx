"use client"

import { useState } from "react"
import { MessageCircle, Sparkles, X } from "lucide-react"

import { ChatPanel } from "@/components/ai-chat/chat-panel"
import { useAiChatContext } from "@/components/ai-chat/ai-chat-context"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const GENERAL_QUICK_PROMPTS = [
  "What can you help with?",
  "Suggest follow-up actions",
  "How do I find matching projects?",
]

const LEAD_QUICK_PROMPTS = [
  "Summarize this lead",
  "Suggest follow-up actions",
  "Draft a WhatsApp message",
]

export function AiAssistantWidget() {
  const { context } = useAiChatContext()
  const [isOpen, setIsOpen] = useState(false)

  const isLeadContext = context.type === "lead"
  const title = isLeadContext ? "Lead AI Assistant" : "MAP AI Assistant"
  const subtitle = isLeadContext
    ? `Helping with ${context.lead.leadName || "this lead"}`
    : "Ask about leads, projects, and bookings"
  const quickPrompts = isLeadContext ? LEAD_QUICK_PROMPTS : GENERAL_QUICK_PROMPTS

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-105",
          isOpen && "scale-95",
        )}
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {isOpen ? (
        <div className="fixed bottom-24 right-6 z-50 flex w-[min(100vw-3rem,380px)] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
          </div>

          <ChatPanel
            context={context}
            quickPrompts={quickPrompts}
            compact
            className="min-h-[360px]"
          />
        </div>
      ) : null}
    </>
  )
}
