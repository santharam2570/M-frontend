"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import type { ChatContext } from "@/lib/ai/chat-types"

interface AiChatContextValue {
  context: ChatContext
  setContext: (context: ChatContext) => void
}

const AiChatContext = createContext<AiChatContextValue | null>(null)

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<ChatContext>({ type: "general" })

  const value = useMemo(
    () => ({
      context,
      setContext,
    }),
    [context],
  )

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
}

export function useAiChatContext() {
  const value = useContext(AiChatContext)
  if (!value) {
    throw new Error("useAiChatContext must be used within AiChatProvider")
  }
  return value
}
