"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  GripVertical,
  IndianRupee,
  MapPin,
  Palette,
  ShieldCheck,
} from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { normalizeCardColor } from "@/lib/projects/project-api"
import type { Project } from "@/lib/projects/types"
import {
  getProjectCardColor,
  PROJECT_CARD_COLORS,
  PROJECT_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  RERA_STATUS_LABELS,
} from "@/lib/projects/types"
import { cn } from "@/lib/utils"


interface ProjectsCardsProps {
  projects: Project[]
  isLoading?: boolean
  isReorderMode?: boolean
  onReorder?: (orderedIds: string[]) => void
  onColorChange?: (projectId: string, color: string) => void
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const styles: Record<Project["status"], string> = {
    active: "bg-emerald-500/90 text-white border-0",
    upcoming: "bg-blue-500/90 text-white border-0",
    sold_out: "bg-slate-500/90 text-white border-0",
    on_hold: "bg-amber-500/90 text-white border-0",
  }

  return (
    <Badge className={cn("text-[11px] font-semibold uppercase tracking-wide", styles[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}

function UnitAvailabilityBar({
  available,
  total,
  cardColor,
}: {
  available: number
  total: number
  cardColor: string
}) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Availability</span>
        <span className="font-medium text-slate-700">
          <span className="text-emerald-600">{available}</span>
          <span className="text-muted-foreground"> / {total} units</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${cardColor}, ${cardColor}cc)`,
          }}
        />
      </div>
    </div>
  )
}

function CardColorPicker({
  color,
  onColorChange,
}: {
  color: string
  onColorChange: (color: string) => void
}) {
  const [customColor, setCustomColor] = useState(color)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setCustomColor(color)
  }, [color])

  const applyColor = (value: string) => {
    onColorChange(normalizeCardColor(value))
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setCustomColor(color)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/60 bg-white/90 text-slate-600 shadow-sm transition-colors hover:bg-white"
          aria-label="Change card color"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Palette className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3"
        align="end"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">Card color</p>
        <div className="grid grid-cols-6 gap-1.5">
          {PROJECT_CARD_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={cn(
                "h-6 w-6 rounded-md border transition-transform hover:scale-105",
                color === preset ? "ring-2 ring-primary ring-offset-1" : "border-slate-200",
              )}
              style={{ backgroundColor: preset }}
              aria-label={`Use ${preset}`}
              onClick={() => applyColor(preset)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="color"
            value={customColor}
            onChange={(event) => setCustomColor(event.target.value)}
            className="h-8 w-10 cursor-pointer p-0.5"
            aria-label="Custom color"
          />
          <Input
            value={customColor}
            onChange={(event) => setCustomColor(event.target.value)}
            className="h-8 flex-1 font-mono text-xs uppercase"
            maxLength={7}
          />
          <button
            type="button"
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
            onClick={() => applyColor(customColor)}
          >
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ProjectCardContent({
  project,
  cardColor,
  isReorderMode,
  onColorChange,
}: {
  project: Project
  cardColor: string
  isReorderMode: boolean
  onColorChange?: (color: string) => void
}) {
  const soldPct =
    project.total_units > 0
      ? Math.round((project.sold_units / project.total_units) * 100)
      : 0

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all",
        isReorderMode
          ? "cursor-grab active:cursor-grabbing"
          : "hover:border-primary/25 hover:shadow-md",
      )}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: cardColor,
        backgroundImage: `linear-gradient(135deg, ${cardColor}0a 0%, transparent 60%)`,
      }}
    >
      <CardContent className="flex flex-col gap-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isReorderMode ? (
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                  style={{ backgroundColor: cardColor }}
                >
                  <Building2 className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="min-w-0">
                <span
                  className="font-mono text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: cardColor }}
                >
                  {project.project_no}
                </span>
                {isReorderMode ? (
                  <p className="line-clamp-1 text-base font-bold leading-tight text-slate-900">
                    {project.name}
                  </p>
                ) : (
                  <Link
                    href={`/projects/detail/${project._id}`}
                    className="line-clamp-1 text-base font-bold leading-tight text-slate-900 transition-colors hover:text-primary"
                  >
                    {project.name}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isReorderMode && onColorChange ? (
              <CardColorPicker color={cardColor} onColorChange={onColorChange} />
            ) : null}
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: cardColor }} />
          <span className="truncate">
            {project.area_locality}, {project.location}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-100 bg-slate-50/70 p-2.5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Price / sq.ft
            </p>
            <p className="mt-0.5 flex items-center gap-0.5 text-sm font-semibold text-slate-900">
              <IndianRupee className="h-3.5 w-3.5" />
              {project.price_per_sqft.toLocaleString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Per Cent
            </p>
            <p className="mt-0.5 flex items-center gap-0.5 text-sm font-semibold text-slate-900">
              <IndianRupee className="h-3.5 w-3.5" />
              {(project.price_per_cent ?? 0).toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <UnitAvailabilityBar
          available={project.available_units}
          total={project.total_units}
          cardColor={cardColor}
        />

        {project.dtcp_number ? (
          <div className="rounded-md border border-slate-100 bg-slate-50/70 px-2.5 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              DTCP Number
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {project.dtcp_number}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className="gap-1 text-[11px] font-medium"
            style={{
              borderColor: `${cardColor}40`,
              backgroundColor: `${cardColor}10`,
              color: cardColor,
            }}
          >
            <ShieldCheck className="h-3 w-3" />
            {RERA_STATUS_LABELS[project.rera_status]}
          </Badge>
          {project.property_types.slice(0, 3).map((type) => (
            <Badge key={type} variant="secondary" className="text-[11px] font-normal">
              {PROPERTY_TYPE_LABELS[type]}
            </Badge>
          ))}
          {project.property_types.length > 3 ? (
            <Badge variant="secondary" className="text-[11px] font-normal">
              +{project.property_types.length - 3}
            </Badge>
          ) : null}
        </div>

        {project.highlights[0] ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {project.highlights[0]}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
            <span>{soldPct}% sold</span>
            <span>{project.blocked_units} on hold</span>
            {project.site_visits.length > 0 ? (
              <span className="inline-flex items-center gap-0.5">
                <CalendarCheck className="h-3.5 w-3.5" />
                {project.site_visits.length} visits
              </span>
            ) : null}
          </div>
        </div>

        {!isReorderMode ? (
          <Button asChild className="h-9 w-full gap-1 text-sm" variant="outline">
            <Link href={`/projects/detail/${project._id}`}>
              View Project
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SortableProjectCard({
  project,
  index,
  isReorderMode,
  onColorChange,
}: {
  project: Project
  index: number
  isReorderMode: boolean
  onColorChange?: (color: string) => void
}) {
  const cardColor = getProjectCardColor(project, index)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project._id,
    disabled: !isReorderMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  if (!isReorderMode) {
    return (
      <ProjectCardContent
        project={project}
        cardColor={cardColor}
        isReorderMode={false}
        onColorChange={onColorChange}
      />
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProjectCardContent
        project={project}
        cardColor={cardColor}
        isReorderMode
        onColorChange={onColorChange}
      />
    </div>
  )
}

function CardSkeleton() {
  return (
    <Card className="overflow-hidden border-slate-200/80">
      <CardContent className="space-y-2.5 p-3">
        <div className="flex gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-2 animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-9 animate-pulse rounded-md bg-slate-100" />
      </CardContent>
    </Card>
  )
}

const projectsGridClassName =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"

export function ProjectsCards({
  projects,
  isLoading = false,
  isReorderMode = false,
  onReorder,
  onColorChange,
}: ProjectsCardsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const projectIds = useMemo(() => projects.map((project) => project._id), [projects])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !onReorder) return

    const oldIndex = projectIds.indexOf(String(active.id))
    const newIndex = projectIds.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(arrayMove(projectIds, oldIndex, newIndex))
  }

  if (isLoading) {
    return (
      <div className={projectsGridClassName}>
        {Array.from({ length: 8 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
        <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-700">No projects found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Adjust filters or add a new project to your inventory.
        </p>
      </div>
    )
  }

  const grid = (
    <div className={projectsGridClassName}>
      {projects.map((project, index) => (
        <SortableProjectCard
          key={project._id}
          project={project}
          index={index}
          isReorderMode={isReorderMode}
          onColorChange={
            onColorChange ? (color) => onColorChange(project._id, color) : undefined
          }
        />
      ))}
    </div>
  )

  if (!isReorderMode) {
    return grid
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={projectIds} strategy={rectSortingStrategy}>
        {grid}
      </SortableContext>
    </DndContext>
  )
}
