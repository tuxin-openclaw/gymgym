import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Play, ClipboardList, CalendarDays, ChevronRight, Sparkles } from 'lucide-react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { TEMPLATES, planFromTemplate, type Template } from '../lib/templates'
import { WEEK_LABELS, cx, fmtRelativeDay } from '../lib/utils'
import { Button, EmptyState, IconButton, PageHeader, SectionTitle, Sheet, toast } from '../components/ui'
import { useStartWorkout } from '../components/StartSheet'
import { useWorkout } from '../lib/workout-store'
import { MiniBody } from '../components/BodyMap'
import type { Muscle, Plan } from '../lib/types'

export function planMuscles(p: Plan, byId: Map<string, { primary: Muscle[] }>) {
  return [...new Set(p.exercises.flatMap((e) => byId.get(e.exerciseId)?.primary ?? []))]
}

export default function Plans() {
  const nav = useNavigate()
  const plans = useLiveQuery(() => db.plans.orderBy('updatedAt').reverse().toArray(), [], [])
  const [tpl, setTpl] = useState<Template | null>(null)
  return (
    <div>
      <PageHeader
        large
        title="训练计划"
        subtitle="选部位、选器材、选动作，制定属于你的计划"
        actions={
          <IconButton label="新建计划" onClick={() => nav('/plans/new')} className="bg-accent !text-accent-ink">
            <Plus className="size-5" />
          </IconButton>
        }
      />
      <div className="px-4">
        {plans.length === 0 ? (
          <div className="mt-2 rounded-3xl bg-surface">
            <EmptyState
              icon={
                <div className="grid size-16 place-items-center rounded-3xl bg-accent-soft">
                  <ClipboardList className="size-8 text-accent-text" />
                </div>
              }
              title="还没有训练计划"
              desc="从下方的推荐模板一键创建，或者从零开始自己制定"
              action={
                <Button onClick={() => nav('/plans/new')}>
                  <Plus className="size-4" /> 新建计划
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
            <button
              onClick={() => nav('/plans/new')}
              className="pressable flex h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-surface-3 text-sm font-semibold text-ink-2"
            >
              <Plus className="size-4" /> 新建计划
            </button>
          </div>
        )}

        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-accent-text" /> 推荐模板
          </span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTpl(t)}
              className="pressable relative flex min-h-36 flex-col overflow-hidden rounded-3xl bg-surface p-4 text-left"
            >
              <div
                className="absolute -bottom-8 -right-8 size-28 rounded-full opacity-25 blur-2xl"
                style={{ background: t.plans[0].color }}
              />
              <div className="flex gap-1.5">
                <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold text-accent-ink" style={{ background: t.plans[0].color }}>
                  {t.tag}
                </span>
                <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">{t.level}</span>
              </div>
              <div className="mt-2.5 font-bold leading-snug">{t.name}</div>
              <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-3">{t.desc}</div>
              <div className="mt-auto pt-2 text-[11px] font-medium text-ink-2">
                每周 {t.perWeek} 练 · {t.plans.length} 个计划
              </div>
            </button>
          ))}
        </div>
      </div>
      <TemplateSheet template={tpl} onClose={() => setTpl(null)} />
    </div>
  )
}

function PlanCard({ plan: p }: { plan: Plan }) {
  const nav = useNavigate()
  const { byId } = useExercises()
  const startWorkout = useStartWorkout()
  const active = useWorkout((s) => s.workout)
  const today = new Date().getDay()
  const muscles = planMuscles(p, byId)
  const totalSets = p.exercises.reduce((n, e) => n + e.sets, 0)
  const minutes = Math.round(p.exercises.reduce((n, e) => n + e.sets * (45 + e.restSec), 0) / 60)
  return (
    <div onClick={() => nav(`/plans/${p.id}`)} className="pressable relative cursor-pointer overflow-hidden rounded-3xl bg-surface">
      <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: p.color }} />
      <div className="flex gap-3 p-4 pl-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[17px] font-bold">{p.name}</h3>
            {p.days.includes(today) && (
              <span className="shrink-0 rounded-md bg-accent px-1.5 py-px text-[10px] font-bold text-accent-ink">今日</span>
            )}
          </div>
          <div className="mt-1 text-xs text-ink-3">
            {p.exercises.length} 个动作 · {totalSets} 组 · 约 {minutes} 分钟
            {p.lastUsedAt && <> · 上次 {fmtRelativeDay(p.lastUsedAt)}</>}
          </div>
          <div className="mt-3 flex gap-1">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <span
                key={d}
                className={cx(
                  'grid size-6 place-items-center rounded-full text-[11px] font-semibold',
                  p.days.includes(d) ? 'text-accent-ink' : 'bg-surface-2 text-ink-3',
                )}
                style={p.days.includes(d) ? { background: p.color } : undefined}
              >
                {WEEK_LABELS[d]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end justify-between">
          <MiniBody muscles={muscles} color={p.color} className="h-14" />
          <button
            aria-label="开始训练"
            disabled={!!active || !p.exercises.length}
            onClick={(e) => {
              e.stopPropagation()
              startWorkout(p)
            }}
            className="pressable grid size-10 place-items-center rounded-full text-accent-ink disabled:opacity-30"
            style={{ background: p.color }}
          >
            <Play className="ml-0.5 size-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplateSheet({ template: t, onClose }: { template: Template | null; onClose: () => void }) {
  const { byId } = useExercises()
  const nav = useNavigate()
  const use = async () => {
    if (!t) return
    const plans = t.plans.map(planFromTemplate)
    await db.plans.bulkAdd(plans)
    toast(`已创建 ${plans.length} 个计划`)
    onClose()
    if (plans.length === 1) nav(`/plans/${plans[0].id}`)
  }
  return (
    <Sheet
      open={!!t}
      onClose={onClose}
      title={t?.name}
      footer={
        <Button block onClick={use}>
          <Plus className="size-4" /> 使用此模板
        </Button>
      }
    >
      {t && (
        <div className="px-5 pb-4">
          <p className="text-sm leading-relaxed text-ink-2">{t.desc}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
            <CalendarDays className="size-3.5" /> 每周 {t.perWeek} 练 · 适合{t.level === '通用' ? '所有人' : t.level}
          </div>
          <div className="mt-4 space-y-3">
            {t.plans.map((p) => (
              <div key={p.name} className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="font-bold">{p.name}</span>
                  <span className="ml-auto text-xs text-ink-3">周{p.days.map((d) => WEEK_LABELS[d]).join('、')}</span>
                </div>
                <ol className="mt-3 space-y-2">
                  {p.rows.map(([id, sets, reps, , dur], i) => (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="num w-4 text-xs text-ink-3">{i + 1}</span>
                      <span className="flex-1 truncate">{byId.get(id)?.zh ?? id}</span>
                      <span className="num text-xs text-ink-3">
                        {sets} × {dur ? `${dur >= 120 ? dur / 60 + ' 分钟' : dur + ' 秒'}` : `${reps} 次`}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1 text-xs text-ink-3">
            <ChevronRight className="size-3" /> 创建后可以自由调整动作、组数和重量
          </div>
        </div>
      )}
    </Sheet>
  )
}
