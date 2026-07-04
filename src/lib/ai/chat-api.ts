import URLS from "@/config/urls"
import { parseJsonResponse } from "@/lib/api"

import type { ChatContext, SendChatMessageInput } from "./chat-types"

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("map_user") ?? "{}"
    const parsed = JSON.parse(stored) as { access_token?: string }
    return parsed?.access_token ?? null
  } catch {
    return null
  }
}

function getLeadDisplayName(context: ChatContext): string {
  if (context.type === "lead") {
    return context.lead.leadName?.trim() || "this lead"
  }
  return "your CRM"
}

function buildLeadSummary(context: Extract<ChatContext, { type: "lead" }>): string {
  const { lead } = context
  const parts: string[] = []

  if (lead.status) parts.push(`Status: ${lead.status}`)
  if (lead.stage) parts.push(`Stage: ${lead.stage}`)
  if (lead.budget) parts.push(`Budget: ${lead.budget}`)
  if (lead.location) parts.push(`Location: ${lead.location}`)
  if (lead.customerRequirement) parts.push(`Requirement: ${lead.customerRequirement}`)
  if (lead.timeline) parts.push(`Timeline: ${lead.timeline}`)

  return parts.join(" · ")
}

function getLocalAssistantReply(message: string, context: ChatContext = { type: "general" }): string {
  const normalized = message.toLowerCase()
  const leadName = getLeadDisplayName(context)
  const isLeadContext = context.type === "lead"

  if (normalized.includes("summarize")) {
    if (isLeadContext) {
      const summary = buildLeadSummary(context)
      return summary
        ? `Quick summary for ${leadName}:\n${summary}\n\nReview recent activity, notes, and matching projects on this page before your next touchpoint.`
        : `Here is a quick summary for ${leadName}: review their budget, preferred location, and requirements from the customer info panel. Check recent activity and notes for the latest context.`
    }

    return "I can help with leads, projects, bookings, and follow-ups. Open a lead detail page for lead-specific summaries, or ask about your pipeline and next actions."
  }

  if (normalized.includes("follow-up") || normalized.includes("follow up")) {
    if (isLeadContext) {
      return `Suggested follow-ups for ${leadName}:\n• Confirm budget and timeline\n• Share matching project options\n• Schedule a site visit or call\n• Log the conversation in notes after contact`
    }

    return "Suggested follow-ups:\n• Review leads with pending follow-ups today\n• Update lead stages after each conversation\n• Share project options with warm leads\n• Schedule site visits for qualified prospects"
  }

  if (normalized.includes("whatsapp") || normalized.includes("message") || normalized.includes("draft")) {
    if (isLeadContext) {
      return `Hi ${leadName}, thank you for your interest. Based on your requirements, I can share a few project options that may suit you. Would you be available for a quick call today?`
    }

    return "Open a lead detail page to draft personalized outreach. I can help compose WhatsApp messages, emails, and call scripts once lead context is available."
  }

  if (normalized.includes("project")) {
    if (isLeadContext) {
      return "Check the Suggested Projects and Matching Projects sections on this lead page. You can update suggested projects from the dropdown and compare AI-matched options."
    }

    return "Go to Projects to browse inventory, or open a lead detail page to see matching projects for that lead."
  }

  if (normalized.includes("booking")) {
    return "Use the Bookings module to track token payments, installments, and unit allocations. Open a project detail page to see available units."
  }

  if (normalized.includes("help") || normalized.includes("what can you")) {
    if (isLeadContext) {
      return `I can help with ${leadName}:\n• Summarize lead details\n• Suggest follow-up actions\n• Draft WhatsApp or email messages\n• Guide you to matching projects`
    }

    return "I can help you across MAP CRM:\n• Summarize leads and suggest follow-ups\n• Draft outreach messages\n• Navigate projects, bookings, and tasks\n• Answer questions about your workflow"
  }

  if (isLeadContext) {
    return `I can help with ${leadName}. Try asking me to summarize this lead, suggest follow-ups, or draft a message.`
  }

  return "Ask me about leads, projects, bookings, or follow-ups. Open a lead detail page for context-aware assistance."
}

async function fetchAssistantReplyFromApi(
  input: SendChatMessageInput,
  token: string,
): Promise<string | null> {
  try {
    const response = await fetch(URLS.AI_CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: input.message,
        history: input.history,
        context: input.context ?? { type: "general" },
      }),
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const result = await parseJsonResponse<{
      code?: number
      data?: { reply?: string; message?: string }
      reply?: string
      message?: string
    }>(response)

    const reply =
      result.data?.reply ??
      result.data?.message ??
      result.reply ??
      result.message

    if (typeof reply === "string" && reply.trim()) {
      return reply.trim()
    }

    if (Number(result.code) === 200 && typeof result.message === "string" && result.message.trim()) {
      return result.message.trim()
    }
  } catch {
    // Fall back to local responses below.
  }

  return null
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<string> {
  const token = getAuthToken()

  if (token) {
    const apiReply = await fetchAssistantReplyFromApi(input, token)
    if (apiReply) {
      return apiReply
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 500))

  return getLocalAssistantReply(input.message, input.context)
}
