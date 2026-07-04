export type ChatRole = "assistant" | "user"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

export interface LeadChatContext {
  leadId?: string
  leadName?: string
  email?: string
  phone?: string
  status?: string
  stage?: string
  budget?: string
  location?: string
  customerRequirement?: string
  timeline?: string
}

export type ChatContext =
  | { type: "general" }
  | { type: "lead"; lead: LeadChatContext }

export interface SendChatMessageInput {
  message: string
  history: Pick<ChatMessage, "role" | "content">[]
  context?: ChatContext
}
