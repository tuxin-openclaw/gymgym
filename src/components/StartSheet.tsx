import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { create } from 'zustand'
import { Plus, ChevronRight, Sparkles } from 'lucide-react'
import { Sheet } from './ui'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useWorkout } from '../lib/workout-store'
import type { Plan } from '../lib/types'
import { WEEK_LABELS, cx } from '../lib/utils'

const useStartSheet = create<{ open: boolean }>(() => ({ open: false }))
export const openStartSheet = () => useStartSheet.setState({ open: true })

/** 开始训练前的确认：今天的计划优先，其次最近使用 */
export function sortPlansForToday(plans: Plan[]) {
  const today = new Date().getDay()
  return [...plans].sort((a, b) => {
    const ta = a.days.includes(today) ? 1 : 0
    const tb = b.days.includes(today) ? 1 : 0
    if (ta !== tb) return tb - ta
    return (b.lastUsedAt ?? b.updatedAt) - (a.lastUsedAt ?? a.updatedAt)
  })
}

export function useStartWorkout() {
  const start = useWorkout((s) => s.start)
  const { byId } = useExercises()
  const nav = useNavigate()
  return async (plan?: Plan) => {
    await start({ plan }, byId)
    useStartSheet.setState({ open: false })
    nav('/workout')
  }
}

export function StartSheetHost() {
  const open = useStartSheet((s) => s.open)
  const plans = useLiveQuery(() => db.plans.toArray(), [], [])
  const startWorkout = useStartWorkout()
  const nav = useNavigate()
  const today = new Date().getDay()
  const close = () => useStartSheet.setState({ open: false })
  return (
    <Sheet open={open} onClose={close} title="开始训练">
      <div className="space-y-2 px-4 pb-6">
        <button
          onClick={() => startWorkout()}
          className="pressable flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-surface-3 p-4 text-left"
        >
          <div className="grid size-11 place-items-center rounded-xl bg-accent text-accent-ink">
            <Plus className="size-6" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">自由训练</div>
            <div className="text-xs text-ink-3">从空白开始，边练边添加动作</div>
          </div>
          <ChevronRight className="size-5 text-ink-3" />
        </button>
        {plans.length > 0 && <div className="px-1 pb-1 pt-3 text-xs font-semibold text-ink-3">按计划训练</div>}
        {sortPlansForToday(plans).map((p) => (
          <button
            key={p.id}
            onClick={() => startWorkout(p)}
            className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-left"
          >
            <span className="h-11 w-1.5 rounded-full" style={{ background: p.color }} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{p.name}</span>
                {p.days.includes(today) && (
                  <span className="shrink-0 rounded-md bg-accent px-1.5 py-px text-[10px] font-bold text-accent-ink">今日</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-ink-3">
                {p.exercises.length} 个动作 · {p.exercises.reduce((n, e) => n + e.sets, 0)} 组
                {p.days.length > 0 && <> · 周{p.days.map((d) => WEEK_LABELS[d]).join('、')}</>}
              </div>
            </div>
            <ChevronRight className="size-5 text-ink-3" />
          </button>
        ))}
        {plans.length === 0 && (
          <button
            onClick={() => {
              close()
              nav('/plans')
            }}
            className={cx('pressable mt-2 flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-4 text-left')}
          >
            <Sparkles className="size-5 text-accent-text" />
            <div className="flex-1 text-sm">
              <div className="font-semibold">还没有训练计划</div>
              <div className="text-xs text-ink-3">从推荐模板一键创建，或自己制定</div>
            </div>
            <ChevronRight className="size-5 text-ink-3" />
          </button>
        )}
      </div>
    </Sheet>
  )
}
