"use client"

import Link from "next/link"
import { Eye, Loader2, MoreVertical, Pencil, Power, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROLE_TIER_LABELS } from "@/lib/auth"
import { AGENT_STATUS_LABELS, type Agent } from "@/lib/agents/types"
import { formatDateForAgeing } from "@/lib/date-ageing"
import {
  leadDetailDashedEmptyClassName,
  leadDetailTableRowClassName,
  leadDetailTableWrapClassName,
  themePrimaryBadgeClassName,
} from "@/lib/form-field-styles"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const agentTableHeadClass = (align: "left" | "right" | "center" = "left") =>
  cn(
    "sticky top-0 z-10 bg-primary px-4 align-middle font-bold text-primary-foreground min-h-12 py-4 text-sm",
    align === "right" && "text-right",
    align === "center" && "text-center",
    align === "left" && "text-left",
  )

function getAgentDetailHref(agentId: string): string {
  return `/agents/detail/${agentId}`
}

function StatusBadge({ status }: { status: Agent["status"] }) {
  const isActive = status === "active"
  return (
    <Badge
      className={cn(
        "font-normal",
        isActive
          ? "bg-green-500 text-white hover:bg-green-600"
          : "bg-orange-500 text-white hover:bg-orange-600",
      )}
    >
      {AGENT_STATUS_LABELS[status]}
    </Badge>
  )
}

interface AgentRole {
  _id: string
  name: string
}

interface AgentsTableProps {
  agents: Agent[]
  isLoading?: boolean
  filterLabel?: string
  headerAction?: React.ReactNode
  roles?: AgentRole[]
  getBranchName?: (branchId: string) => string
  onEditAgent?: (agent: Agent) => void
  onDeleteAgent?: (agent: Agent) => void
  onToggleStatus?: (agent: Agent) => void
}

function getRoleName(agent: Agent, roles: AgentRole[]): string {
  return agent.role_name || roles.find((role) => role._id === agent.role)?.name || "Unknown Role"
}

export function AgentsTable({
  agents,
  isLoading,
  filterLabel,
  headerAction,
  roles = [],
  getBranchName,
  onEditAgent,
  onDeleteAgent,
  onToggleStatus,
}: AgentsTableProps) {
  const isMobile = useIsMobile()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading agents...
      </div>
    )
  }

  const renderActions = (agent: Agent) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={getAgentDetailHref(agent._id)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Link>
        </DropdownMenuItem>
        {onEditAgent ? (
          <DropdownMenuItem onClick={() => onEditAgent(agent)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {onToggleStatus ? (
          <DropdownMenuItem onClick={() => onToggleStatus(agent)}>
            <Power className="mr-2 h-4 w-4" />
            {agent.status === "active" ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
        ) : null}
        {onDeleteAgent ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDeleteAgent(agent)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {filterLabel ? (
            <p className="text-sm text-muted-foreground">
              Showing: <span className="font-medium text-foreground">{filterLabel}</span>
            </p>
          ) : null}
        </div>
        {headerAction}
      </div>

      <div className={isMobile ? "space-y-3" : leadDetailTableWrapClassName}>
        {isMobile ? (
          agents.length === 0 ? (
            <div className={cn(leadDetailDashedEmptyClassName, "px-4 py-12")}>
              No agents found.
            </div>
          ) : (
            agents.map((agent) => (
              <Card key={agent._id} className="shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={getAgentDetailHref(agent._id)}
                        className="block break-words text-base font-semibold text-primary hover:text-primary/80 hover:underline"
                      >
                        {agent.name || "—"}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">{agent.email || "—"}</p>
                      <p className="text-sm text-muted-foreground">{agent.phone || "—"}</p>
                    </div>
                    {renderActions(agent)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {agent.role_tier ? (
                      <Badge variant="secondary" className="font-normal">
                        {ROLE_TIER_LABELS[agent.role_tier]}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className={themePrimaryBadgeClassName}>
                      {getRoleName(agent, roles)}
                    </Badge>
                    <StatusBadge status={agent.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted/50 px-2 py-2">
                      <p className="font-semibold text-foreground">
                        {agent.branch_id && getBranchName
                          ? getBranchName(agent.branch_id)
                          : "All"}
                      </p>
                      <p className="text-muted-foreground">Branch</p>
                    </div>
                    <div className="rounded-md bg-muted/50 px-2 py-2">
                      <p className="font-semibold text-foreground">
                        {agent.create_date ? formatDateForAgeing(agent.create_date) : "—"}
                      </p>
                      <p className="text-muted-foreground">Created</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )
        ) : (
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="hover:bg-primary">
                <TableHead className={agentTableHeadClass()}>Name</TableHead>
                <TableHead className={agentTableHeadClass()}>Email</TableHead>
                <TableHead className={agentTableHeadClass()}>Phone</TableHead>
                <TableHead className={agentTableHeadClass()}>Tier</TableHead>
                <TableHead className={agentTableHeadClass()}>Branch</TableHead>
                <TableHead className={agentTableHeadClass()}>Permission Role</TableHead>
                <TableHead className={agentTableHeadClass()}>Created</TableHead>
                <TableHead className={agentTableHeadClass()}>Status</TableHead>
                <TableHead className={agentTableHeadClass("center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No agents found.
                  </TableCell>
                </TableRow>
              ) : (
                agents.map((agent) => (
                  <TableRow key={agent._id} className={leadDetailTableRowClassName}>
                    <TableCell className="px-4 py-3">
                      <Link
                        href={getAgentDetailHref(agent._id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {agent.name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {agent.email || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {agent.phone || "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      {agent.role_tier ? (
                        <Badge variant="secondary" className="font-normal">
                          {ROLE_TIER_LABELS[agent.role_tier]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {agent.branch_id && getBranchName ? getBranchName(agent.branch_id) : "All"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="outline" className={themePrimaryBadgeClassName}>
                        {getRoleName(agent, roles)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                      {agent.create_date ? formatDateForAgeing(agent.create_date) : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={agent.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">{renderActions(agent)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
