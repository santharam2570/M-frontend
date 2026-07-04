"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { Bot, Loader2, Send, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { sendChatMessage } from "@/lib/ai/chat-api"
import type { ChatContext, ChatMessage } from "@/lib/ai/chat-types"
import { cn } from "@/lib/utils"

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-3.5 w-3.5" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-slate-100 bg-slate-50 text-slate-800",
        )}
      >
        {message.content}
      </div>

      {isUser ? (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <User className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  )
}

export interface ChatPanelProps {
  context?: ChatContext
  welcomeMessage?: string
  quickPrompts?: string[]
  className?: string
  messagesClassName?: string
  inputPlaceholder?: string
  compact?: boolean
}

export function ChatPanel({
  context = { type: "general" },
  welcomeMessage,
  quickPrompts = [],
  className,
  messagesClassName,
  inputPlaceholder = "Type your message...",
  compact = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const contextKey =
    context.type === "lead"
      ? `lead:${context.lead.leadId ?? context.lead.leadName ?? "unknown"}`
      : "general"

  const resolvedWelcomeMessage =
    welcomeMessage ??
    (context.type === "lead" && context.lead.leadName
      ? `Hi! I can help you work on ${context.lead.leadName}. Ask me to summarize the lead, suggest follow-ups, or draft a message.`
      : "Hi! I'm your MAP CRM assistant. Ask about leads, projects, bookings, or follow-ups.")

  useEffect(() => {
    setMessages([
      {
        id: createMessageId(),
        role: "assistant",
        content: resolvedWelcomeMessage,
      },
    ])
    setInput("")
    setIsThinking(false)
  }, [contextKey, resolvedWelcomeMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  const sendMessage = async (rawMessage: string) => {
    const trimmed = rawMessage.trim()
    if (!trimmed || isThinking) return

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    }

    const nextHistory = [...messages, userMessage]
    setMessages(nextHistory)
    setInput("")
    setIsThinking(true)

    try {
      const reply = await sendChatMessage({
        message: trimmed,
        history: nextHistory.map(({ role, content }) => ({ role, content })),
        context,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: reply,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: "Sorry, I couldn't process that request. Please try again.",
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void sendMessage(input)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(input)
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <ScrollArea className={cn(compact ? "h-[240px]" : "h-[280px]", "px-4 py-4", messagesClassName)}>
        <div className="space-y-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isThinking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="space-y-3 border-t border-slate-100 px-4 py-4">
        {quickPrompts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isThinking}
                onClick={() => void sendMessage(prompt)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={inputPlaceholder}
            rows={1}
            disabled={isThinking}
            className="min-h-[42px] max-h-24 resize-none rounded-xl border-slate-200 bg-slate-50/60 text-sm focus-visible:ring-primary/30"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isThinking}
            className="h-[42px] w-[42px] shrink-0 rounded-xl"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
