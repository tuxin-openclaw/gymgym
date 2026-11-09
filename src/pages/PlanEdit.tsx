import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trash2, ChevronUp, ChevronDown, Play, Copy, Dumbbell, Ellipsis } from 'lucide-react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { useWorkout } from '../lib/workout-store'
import { PLAN_COLORS, EQUIPMENT_ZH, MUSCLE_ZH } from '../lib/catalog'
import type { Plan, PlanExercise } from '../lib/types'
import { WEEK_LABELS, cx, uid } from '../lib/utils'
import { Button, EmptyState, IconButton, PageHeader, Sheet, Stepper, confirm, toast } from '../components/ui'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseThumb } from '../components/ExerciseMedia'
import { useStartWorkout } from '../components/StartSheet'

const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180, 240]

function newPlan(): Plan {
  const now = Date.now()
  return { id: uid(), name: '', color: PLAN_COLORS[0], days: [], exercises: [], createdAt: now, updatedAt: now }
}

export default function PlanEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const nav = useNavigate()
  const stored = useLiveQuery(() => (isNew ? undefined : db.plans.get(id!)), [id])
  const [plan, setPlan] = useState<Plan | null>(isNew ? newPlan() : null)
  const [dirty, setDirty] = useState(false)
  const [picker, setPicker] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const { byId } = useExercises()
  const { defaultRest, unit } = useSettings()
  const active = useWorkout((s) => s.workout)
  const startWorkout = useStartWorkout()

  useEffect(() => {
    if (!isNew && stored && !plan) setPlan(stored)
  }, [stored, isNew, plan])

  if (!plan) {
    return (
      <div>
        <PageHeader title="计划" back />
        {stored === undefined ? null : <EmptyState icon={<Dumbbell className="size-10 text-ink-3" />} title="计划不存在" />}
      </div>
    )
  }

  const update = (patch: Partial<Plan>) => {
    setPlan({ ...plan, ...patch })
    setDirty(true)
  }
  const updateEx = (uid: string, patch: Partial<PlanExercise>) =>
    update({ exercises: plan.exercises.map((e) => (e.uid === uid ? { ...e, ...patch } : e)) })
  const move = (i: number, dir: -1 | 1) => {
    const list = [...plan.exercises]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update({ exercises: list })
  }

  const save = async (silent = false) => {
    const p = { ...plan, name: plan.name.trim() || '未命名计划', updatedAt: Date.now() }
    await db.plans.put(p)
    setPlan(p)
    setDirty(false)
    if (!silent) toast('计划已保存')
    if (isNew) nav(`/plans/${p.id}`, { replace: true })
    return p
  }

  const back = async () => {
    if (dirty && plan.exercises.length + plan.name.length > 0) {
      const ok = await confirm({ title: '保存修改？', message: '计划有未保存的修改', confirmText: '保存', cancelText: '不保存' })
      if (ok) await save(true)
    }
    nav('/plans')
  }

  const estMinutes = Math.round(plan.exercises.reduce((n, e) => n + e.sets * (45 + e.restSec), 0) / 60)

  return (
    <div className="pb-32">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-1 px-2">
          <button onClick={back} className="px-3 text-[15px] text-ink-2">
            {dirty ? '取消' : '返回'}
          </button>
          <div className="flex-1 text-center text-[17px] font-semibold">{isNew ? '新建计划' : '编辑计划'}</div>
          {!isNew && (
            <IconButton label="更多" onClick={() => setMenu(true)}>
              <Ellipsis className="size-5" />
            </IconButton>
          )}
          <button
            onClick={() => save()}
            disabled={!dirty && !isNew}
            className="px-3 text-[15px] font-bold text-accent-text disabled:text-ink-3"
          >
            保存
          </button>
        </div>
      </header>

      <div className="px-4 pt-4">
        <input
          value={plan.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="给计划起个名字，如「推日 · 胸肩三头」"
          className="w-full bg-transparent px-1 text-2xl font-extrabold tracking-tight outline-none placeholder:text-ink-3/60"
          autoFocus={isNew}
        />

        <div className="mt-5 rounded-3xl bg-surface p-4">
          <div className="text-xs font-semibold text-ink-3">训练日</div>
          <div className="mt-2.5 flex justify-between">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const on = plan.days.includes(d)
              return (
                <button
                  key={d}
                  onClick={() => update({ days: on ? plan.days.filter((x) => x !== d) : [...plan.days, d] })}
                  className={cx(
                    'pressable grid size-10 place-items-center rounded-full text-sm font-bold transition-colors',
                    on ? 'text-accent-ink' : 'bg-surface-2 text-ink-2',
                  )}
                  style={on ? { background: plan.color } : undefined}
                >
                  {WEEK_LABELS[d]}
                </button>
              )
            })}
          </div>
          <div className="mt-5 text-xs font-semibold text-ink-3">标签颜色</div>
          <div className="mt-2.5 flex justify-between">
            {PLAN_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`颜色 ${c}`}
                onClick={() => update({ color: c })}
                className={cx('pressable size-8 rounded-full ring-offset-2 ring-offset-surface', plan.color === c && 'ring-2 ring-ink')}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="mb-3 mt-7 flex items-end justify-between px-1">
          <h2 className="text-[17px] font-bold">
            动作 <span className="num text-sm font-medium text-ink-3">{plan.exercises.length}</span>
          </h2>
          {plan.exercises.length > 0 && (
            <span className="num text-xs text-ink-3">
              {plan.exercises.reduce((n, e) => n + e.sets, 0)} 组 · 约 {estMinutes} 分钟
            </span>
          )}
        </div>

        {plan.exercises.length === 0 ? (
          <button
            onClick={() => setPicker(true)}
            className="pressable flex w-full flex-col items-center rounded-3xl border-2 border-dashed border-surface-3 py-10"
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink">
              <Plus className="size-7" />
            </div>
            <div className="mt-3 font-semibold">添加动作</div>
            <div className="mt-1 text-xs text-ink-3">选部位 → 选器材 → 选动作</div>
          </button>
        ) : (
          <div className="space-y-2.5">
            {plan.exercises.map((pe, i) => {
              const ex = byId.get(pe.exerciseId)
              const open = expanded === pe.uid
              const t = ex?.tracking ?? 'weight'
              const timed = t === 'time' || t === 'cardio'
              return (
                <div key={pe.uid} className={cx('rounded-3xl bg-surface transition-shadow', open && 'ring-1 ring-line')}>
                  <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setExpanded(open ? null : pe.uid)}>
                    <span className="num w-5 text-center text-sm font-bold text-ink-3">{i + 1}</span>
                    {ex ? <ExerciseThumb ex={ex} className="size-12 shrink-0 rounded-xl" /> : <div className="size-12 rounded-xl bg-surface-2" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{ex?.zh ?? '加载中…'}</div>
                      <div className="num mt-0.5 text-xs text-ink-3">
                        {pe.sets} 组 ×{' '}
                        {timed ? fmtSec(pe.duration ?? 60) : `${pe.reps} 次`}
                        {pe.weight ? ` · ${pe.weight}${unit}` : ''} · 休息 {pe.restSec}s
                      </div>
                    </div>
                    <ChevronDown className={cx('size-5 text-ink-3 transition-transform', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="animate-fade-in space-y-3 border-t border-line px-4 pb-4 pt-3">
                      {ex && (
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-ink-2">
                          <span className="rounded-md bg-surface-2 px-1.5 py-0.5">{EQUIPMENT_ZH[ex.equipment]}</span>
                          {ex.primary.map((m) => (
                            <span key={m} className="rounded-md bg-surface-2 px-1.5 py-0.5">
                              {MUSCLE_ZH[m]}
                            </span>
                          ))}
                          <button className="ml-auto text-accent-text" onClick={() => nav(`/exercises/${ex.id}`)}>
                            动作说明 ›
                          </button>
                        </div>
                      )}
                      <Field label="组数">
                        <Stepper value={pe.sets} min={1} max={20} onChange={(v) => updateEx(pe.uid, { sets: v })} unit="组" />
                      </Field>
                      {timed ? (
                        <Field label="每组时长">
                          <Stepper
                            value={pe.duration ?? 60}
                            min={5}
                            max={7200}
                            step={t === 'cardio' ? 60 : 5}
                            onChange={(v) => updateEx(pe.uid, { duration: v })}
                            format={fmtSec}
                          />
                        </Field>
                      ) : (
                        <Field label="每组次数">
                          <Stepper value={pe.reps} min={1} max={100} onChange={(v) => updateEx(pe.uid, { reps: v })} unit="次" />
                        </Field>
                      )}
                      {t === 'weight' && (
                        <Field label="目标重量" hint="留空则自动使用上次的重量">
                          <div className="flex h-11 items-center rounded-2xl bg-surface-2 px-3">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={pe.weight ?? ''}
                              placeholder="—"
                              onChange={(e) => updateEx(pe.uid, { weight: e.target.value === '' ? undefined : Number(e.target.value) })}
                              className="num w-full bg-transparent text-right text-[15px] font-semibold outline-none"
                            />
                            <span className="ml-1 text-xs text-ink-3">{unit}</span>
                          </div>
                        </Field>
                      )}
                      <div>
                        <div className="mb-2 text-xs font-semibold text-ink-3">组间休息</div>
                        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                          {REST_OPTIONS.map((r) => (
                            <button
                              key={r}
                              onClick={() => updateEx(pe.uid, { restSec: r })}
                              className={cx(
                                'num h-8 shrink-0 rounded-full px-3 text-xs font-semibold',
                                pe.restSec === r ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2',
                              )}
                            >
                              {r === 0 ? '不休息' : r < 60 ? `${r}秒` : `${Math.floor(r / 60)}分${r % 60 ? '半' : '钟'}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button variant="secondary" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                          <ChevronUp className="size-4" /> 上移
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => move(i, 1)} disabled={i === plan.exercises.length - 1}>
                          <ChevronDown className="size-4" /> 下移
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="ml-auto"
                          onClick={() => update({ exercises: plan.exercises.filter((e) => e.uid !== pe.uid) })}
                        >
                          <Trash2 className="size-4" /> 移除
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <button
              onClick={() => setPicker(true)}
              className="pressable flex h-14 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-surface-3 text-sm font-semibold text-ink-2"
            >
              <Plus className="size-4" /> 添加动作
            </button>
          </div>
        )}
      </div>

      {!isNew && plan.exercises.length > 0 && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
          <Button
            block
            size="lg"
            className="mb-4"
            disabled={!!active}
            onClick={async () => {
              const p = dirty ? await save(true) : plan
              startWorkout(p)
            }}
          >
            <Play className="size-5 fill-current" /> {active ? '已有训练进行中' : '按此计划开始训练'}
          </Button>
        </div>
      )}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        exclude={plan.exercises.map((e) => e.exerciseId)}
        onPick={(ids) =>
          update({
            exercises: [
              ...plan.exercises,
              ...ids.map((exerciseId) => {
                const t = byId.get(exerciseId)?.tracking
                return {
                  uid: uid(),
                  exerciseId,
                  sets: t === 'cardio' ? 1 : 3,
                  reps: t === 'reps' ? 12 : 10,
                  duration: t === 'cardio' ? 1200 : t === 'time' ? 45 : undefined,
                  restSec: t === 'cardio' ? 60 : defaultRest,
                }
              }),
            ],
          })
        }
      />

      <Sheet open={menu} onClose={() => setMenu(false)} title="计划操作">
        <div className="space-y-2 px-4 pb-6">
          <Button
            variant="secondary"
            block
            className="!justify-start"
            onClick={async () => {
              const now = Date.now()
              const copy = { ...plan, id: uid(), name: `${plan.name} 副本`, createdAt: now, updatedAt: now, lastUsedAt: undefined }
              await db.plans.add(copy)
              setMenu(false)
              toast('已复制计划')
              nav(`/plans/${copy.id}`, { replace: true })
              setPlan(copy)
            }}
          >
            <Copy className="size-4" /> 复制计划
          </Button>
          <Button
            variant="danger"
            block
            className="!justify-start"
            onClick={async () => {
              setMenu(false)
              if (await confirm({ title: '删除这个计划？', message: '已有的训练记录不会受影响', danger: true, confirmText: '删除' })) {
                await db.plans.delete(plan.id)
                toast('计划已删除')
                nav('/plans', { replace: true })
              }
            }}
          >
            <Trash2 className="size-4" /> 删除计划
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0">
        <div className="text-sm font-medium text-ink-2">{label}</div>
        {hint && <div className="text-[10px] leading-tight text-ink-3">{hint}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

export function fmtSec(s: number) {
  if (s >= 60) {
    const m = Math.floor(s / 60)
    return s % 60 ? `${m}分${s % 60}秒` : `${m}分钟`
  }
  return `${s}秒`
}
