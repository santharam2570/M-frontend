import type { RoleTier } from "@/lib/auth"

export type AgentType = "internal" | "external" | "channel_partner"
export type AgentStatus = "active" | "inactive"

export interface Agent {
  _id: string
  name: string
  email: string
  phone: string
  role?: string
  role_name?: string
  role_tier?: RoleTier
  agent_type: AgentType
  rera_number?: string
  commission_rate?: number
  branch_id?: string
  branch_name?: string
  status: AgentStatus
  address?: string
  city?: string
  state?: string
  pincode?: string
  pan_number?: string
  pan_document?: string
  aadhaar_number?: string
  aadhaar_document?: string
  passport_number?: string
  source?: string
  referred_by?: string
  reference_contact_number?: string
  agency_name?: string
  assigned_project_ids: string[]
  assigned_project_names: string[]
  total_leads: number
  total_bookings: number
  total_commission: number
  notes?: string
  create_date?: string
}

export interface AgentMetrics {
  total_agents: number
  active_agents: number
  new_this_month: number
  total_bookings: number
}

export interface AgentFilterState {
  status: string
  agent_type: string
  branch_id: string
}

export interface AgentFormPayload {
  name: string
  email: string
  phone: string
  agent_type: AgentType
  rera_number?: string
  commission_rate?: number
  branch_id?: string
  status: AgentStatus
  address?: string
  city?: string
  state?: string
  pincode?: string
  pan_number?: string
  agency_name?: string
  assigned_project_ids?: string[]
  notes?: string
}

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  internal: "Internal",
  external: "External",
  channel_partner: "Channel Partner",
}

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}
