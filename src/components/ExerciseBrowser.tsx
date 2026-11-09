import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, HeartPulse, Star, LayoutGrid, Loader2 } from 'lucide-react'
import type { Equipment, Exercise, Muscle } from '../lib/types'
import { BODY_PARTS, EQUIPMENT_ORDER, EQUIPMENT_ZH, MUSCLE_ZH, type BodyPart } from '../lib/catalog'
import { matchesPart, matchesQuery } from '../lib/exercises'
import { cx } from '../lib/utils'
import { MiniBody } from './BodyMap'
import { EquipmentIcon } from './icons'
import { ExerciseThumb } from './ExerciseMedia'

export interface ExerciseFilter {
  q: string
  part: BodyPart | 'all'
  equipment: Equipment | 'all'
  muscle?: Muscle
}

export const emptyFilter: ExerciseFilter = { q: '', part: 'all', equipment: 'all' }

export function filterExercises(list: Exercise[], f: ExerciseFilter) {
  return list.filter(
    (e) =>
      (f.part === 'all' || matchesPart(e, f.part)) &&
      (f.equipment === 'all' || e.equipment === f.equipment) &&
      (!f.muscle || e.primary.includes(f.muscle)) &&
      matchesQuery(e, f.q),
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-2xl bg-surface-2 px-3.5 focus-within:ring-2 focus-within:ring-accent/50">
      <Search className="size-[18px] shrink-0 text-ink-3" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '搜索动作，如「卧推」「深蹲」「bench」'}
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
        enterKeyHint="search"
      />
      {value && (
        <button aria-label="清除" onClick={() => onChange('')} className="grid size-6 place-items-center rounded-full bg-surface-3 text-ink-2">
          <X className="size-3.5" />
        </button>
      )}
    </label>
  )
}

/** 第一步：选部位（带人体高亮小图标） */
export function BodyPartPicker({
  value,
  onChange,
  counts,
  compact,
}: {
  value: BodyPart | 'all'
  onChange: (p: BodyPart | 'all') => void
  counts?: Partial<Record<BodyPart | 'all', number>>
  compact?: boolean
}) {
  const items: { key: BodyPart | 'all'; zh: string; color: string; muscles: Muscle[] }[] = [
    { key: 'all', zh: '全部', color: 'var(--accent)', muscles: [] },
    ...BODY_PARTS,
  ]
  return (
    <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
      {items.map((p) => {
        const active = value === p.key
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={cx(
              'pressable flex shrink-0 flex-col items-center gap-1 rounded-2xl border-2',
              compact ? 'w-[60px] pb-1.5 pt-2' : 'w-[68px] pb-2 pt-2.5',
              active ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface-2',
            )}
          >
            <div className={cx('grid place-items-center', compact ? 'h-9' : 'h-12')}>
              {p.key === 'all' ? (
                <LayoutGrid className={cx('text-ink-2', compact ? 'size-5' : 'size-7')} />
              ) : p.key === 'cardio' ? (
                <HeartPulse className={compact ? 'size-6' : 'size-8'} style={{ color: p.color }} />
              ) : (
                <MiniBody muscles={p.muscles} color={p.color} className={compact ? 'h-9' : 'h-12'} />
              )}
            </div>
            <span className={cx('text-[13px] font-semibold', active ? 'text-ink' : 'text-ink-2')}>{p.zh}</span>
            {counts?.[p.key] !== undefined && <span className="num -mt-1 text-[10px] text-ink-3">{counts[p.key]}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** 第二步：选器材 */
export function EquipmentPicker({
  value,
  onChange,
  available,
}: {
  value: Equipment | 'all'
  onChange: (e: Equipment | 'all') => void
  available?: Set<Equipment>
}) {
  const list = EQUIPMENT_ORDER.filter((e) => !available || available.has(e) || e === value)
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      <button
        onClick={() => onChange('all')}
        className={cx(
          'pressable inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-medium',
          value === 'all' ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2',
        )}
      >
        全部器材
      </button>
      {list.map((e) => (
        <button
          key={e}
          onClick={() => onChange(value === e ? 'all' : e)}
          className={cx(
            'pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium',
            value === e ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2',
          )}
        >
          <EquipmentIcon type={e} width={16} height={16} />
          {EQUIPMENT_ZH[e]}
        </button>
      ))}
    </div>
  )
}

/** 第三步：选动作（增量渲染的长列表） */
export function ExerciseList({
  items,
  selected,
  onItem,
  mode = 'browse',
  pageSize = 40,
}: {
  items: Exercise[]
  selected?: string[]
  onItem: (e: Exercise) => void
  mode?: 'browse' | 'pick'
  pageSize?: number
}) {
  const [limit, setLimit] = useState(pageSize)
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setLimit(pageSize)
  }, [items, pageSize])
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver((es) => es[0].isIntersecting && setLimit((l) => l + pageSize), { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [items, pageSize])
  return (
    <ul className="flex flex-col">
      {items.slice(0, limit).map((e) => {
        const idx = selected?.indexOf(e.id) ?? -1
        const sel = idx >= 0
        return (
          <li key={e.id}>
            <button
              onClick={() => onItem(e)}
              className={cx(
                'pressable flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left',
                sel ? 'bg-accent-soft' : 'hover:bg-surface-2',
              )}
            >
              <ExerciseThumb ex={e} className="size-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[15px] font-semibold">{e.zh}</span>
                  {e.popular !== undefined && <Star className="size-3 shrink-0 fill-warn text-warn" aria-label="常用" />}
                  {e.custom && <span className="shrink-0 rounded bg-info/15 px-1 text-[10px] font-semibold text-info">自定义</span>}
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-3">{e.name}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-px">
                    <EquipmentIcon type={e.equipment} width={11} height={11} />
                    {EQUIPMENT_ZH[e.equipment]}
                  </span>
                  <span className="truncate">{e.primary.map((m) => MUSCLE_ZH[m]).join(' · ')}</span>
                </div>
              </div>
              {mode === 'pick' && (
                <span
                  className={cx(
                    'grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold transition-all',
                    sel ? 'animate-pop border-accent bg-accent text-accent-ink' : 'border-surface-3',
                  )}
                >
                  {sel ? idx + 1 : ''}
                </span>
              )}
            </button>
          </li>
        )
      })}
      <div ref={sentinel} />
    </ul>
  )
}

export function useFilterCounts(list: Exercise[], f: ExerciseFilter) {
  return useMemo(() => {
    const base = list.filter((e) => (f.equipment === 'all' || e.equipment === f.equipment) && matchesQuery(e, f.q))
    const counts: Partial<Record<BodyPart | 'all', number>> = { all: base.length }
    for (const p of BODY_PARTS) counts[p.key] = base.filter((e) => matchesPart(e, p.key)).length
    const eq = new Set(list.filter((e) => f.part === 'all' || matchesPart(e, f.part)).map((e) => e.equipment))
    return { counts, equipment: eq }
  }, [list, f.q, f.equipment, f.part])
}

export function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-3">
      <Loader2 className="size-4 animate-spin" /> 正在加载动作库…
    </div>
  )
}

