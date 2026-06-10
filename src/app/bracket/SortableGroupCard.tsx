'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CountryFlag } from '@/components/CountryFlag'
import {
  POSITIONS,
  POSITION_LABEL,
  type Position,
} from '@/lib/bracket'

interface Team {
  id: string
  name: string
  countryCode: string
}

interface Group {
  letter: string
  teams: Team[]
}

interface Props {
  group: Group
  picks: Partial<Record<Position, string>>
  /** Called with the full 4-team ordering whenever the user drags. */
  onReorder: (orderedTeamIds: string[]) => void
}

/**
 * Drag-to-rank group card.
 *
 *   - 4 teams shown as a vertical list, position 1–4 indicated on the left
 *   - User drags rows up/down (or uses keyboard with the drag handle focused)
 *     to set their predicted finishing order
 *   - On any reorder, `onReorder` fires with the new [first, second, third,
 *     fourth] team-id ordering for the parent to persist
 *
 *   Default ordering when no picks yet: alphabetical by team name (stable).
 *   Once user has picks, those drive the order.
 */
export function SortableGroupCard({ group, picks, onReorder }: Props) {
  // Derive an ordered list of team ids from picks; fall back to alphabetical.
  const initialOrder = useMemo(() => {
    const fromPicks = POSITIONS.map((p) => picks[p]).filter(
      (id): id is string => !!id && group.teams.some((t) => t.id === id)
    )
    if (fromPicks.length === 4) return fromPicks
    return [...group.teams]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => t.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, group.teams])

  const [items, setItems] = useState<string[]>(initialOrder)
  const [touched, setTouched] = useState<boolean>(!!picks.first)

  // Keep local order in sync when picks change from outside (e.g. initial load).
  useEffect(() => {
    setItems(initialOrder)
  }, [initialOrder])

  const teamById = useMemo(
    () => new Map(group.teams.map((t) => [t.id, t])),
    [group.teams]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.indexOf(String(active.id))
    const newIndex = items.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    setTouched(true)
    onReorder(next)
  }

  return (
    <article className="bracket-group" aria-labelledby={`group-${group.letter}`}>
      <header className="bracket-group__header">
        <h3 id={`group-${group.letter}`} className="bracket-group__letter">
          {group.letter}
        </h3>
        <span className="bracket-group__hint">
          {touched ? 'Drag to reorder' : 'Drag rows to rank 1–4'}
        </span>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul className="bracket-group__teams" role="list">
            {items.map((id, i) => {
              const t = teamById.get(id)
              if (!t) return null
              return (
                <SortableRow
                  key={id}
                  team={t}
                  rank={i + 1}
                  touched={touched}
                />
              )
            })}
          </ul>
        </SortableContext>
      </DndContext>
    </article>
  )
}

function SortableRow({
  team,
  rank,
  touched,
}: {
  team: Team
  rank: number
  touched: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  const positionKey: Position = POSITIONS[rank - 1]

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bracket-group__team-row bracket-group__team-row--sortable ${
        isDragging ? 'is-dragging' : ''
      } ${touched ? 'is-ranked' : ''}`}
      data-rank={rank}
    >
      <span
        className={`bracket-group__rank bracket-group__rank--pos${rank}`}
        aria-hidden="true"
      >
        {touched ? POSITION_LABEL[positionKey] : rank}
      </span>
      <div className="bracket-group__team-id">
        <CountryFlag
          countryCode={team.countryCode}
          countryName={team.name}
          size="sm"
        />
        <span className="bracket-group__team-name">{team.name}</span>
      </div>
      <button
        type="button"
        className="bracket-group__drag-handle"
        aria-label={`Drag ${team.name} to reorder`}
        {...attributes}
        {...listeners}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="3" r="1.25" />
          <circle cx="10" cy="3" r="1.25" />
          <circle cx="4" cy="7" r="1.25" />
          <circle cx="10" cy="7" r="1.25" />
          <circle cx="4" cy="11" r="1.25" />
          <circle cx="10" cy="11" r="1.25" />
        </svg>
      </button>
    </li>
  )
}
