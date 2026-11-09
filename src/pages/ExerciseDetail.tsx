import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Plus, Trophy, Trash2, ClipboardList, Check } from 'lucide-react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { useWorkout } from '../lib/workout-store'
import { CATEGORY_ZH, EQUIPMENT_ZH, LEVEL_ZH, MUSCLE_ZH, TRACKING_ZH } from '../lib/catalog'
import { bestOfSets, e1rm, isWorkingSet } from '../lib/stats'
import { fmtDate, fmtNumber, uid, cx } from '../lib/utils'
import { Button, Card, EmptyState, IconButton, Segmented, Sheet, Tag, confirm, toast } from '../components/ui'
import { ExerciseAnimation } from '../components/ExerciseMedia'
import { BodyMap, musclesFill } from '../components/BodyMap'
import { EquipmentIcon } from '../components/icons'
import { LineChart } from '../components/charts'
import { LoadingRow } from '../components/ExerciseBrowser'
import { fmtSec } from './PlanEdit'
import type { WorkoutSet } from '../lib/types'

export function fmtSet(s: WorkoutSet, unit: string) {
  const parts: string[] = []
  if (s.weight) parts.push(`${s.weight}${unit}`)
  if (s.reps) parts.push(`${s.reps}次`)
  if (s.duration) parts.push(fmtSec(s.duration))
  if (s.distance) parts.push(`${s.distance}km`)
  return parts.join(' × ') || '—'
}

export default function ExerciseDetail() {
  const { id: rawId } = useParams()
  const id = decodeURIComponent(rawId ?? '')
  const nav = useNavigate()
  const { byId, ready } = useExercises()
  const { unit } = useSettings()
  const ex = byId.get(id)
  const active = useWorkout((s) => s.workout)
  const addExercises = useWorkout((s) => s.addExercises)
  const [planSheet, setPlanSheet] = useState(false)
  const [metric, setMetric] = useState<'e1rm' | 'weight' | 'volume'>('e1rm')
  const plans = useLiveQuery(() => db.plans.toArray(), [], [])

  const history = useLiveQuery(
    async () => {
      const ws = await db.workouts.orderBy('startedAt').toArray()
      return ws
        .map((w) => ({ w, ex: w.exercises.find((e) => e.exerciseId === id) }))
        .filter((x): x is { w: typeof x.w; ex: NonNullable<typeof x.ex> } => !!x.ex && x.ex.sets.some(isWorkingSet))
    },
    [id],
    [],
  )

  const best = useMemo(() => bestOfSets(history.flatMap((h) => h.ex.sets)), [history])
  const chart = useMemo(
    () =>
      history.slice(-20).map(({ w, ex }) => {
        const b = bestOfSets(ex.sets)
        const vol = ex.sets.filter(isWorkingSet).reduce((n, s) => n + (s.weight ?? 0) * (s.reps ?? 0), 0)
        const v =
          ex && (metric === 'e1rm' ? b.maxE1rm : metric === 'weight' ? b.maxWeight : vol)
        const d = new Date(w.startedAt)
        return { label: `${d.getMonth() + 1}/${d.getDate()}`, tip: fmtDate(w.startedAt, true), value: Math.round(v * 10) / 10 }
      }),
    [history, metric],
  )

  if (!ex) {
    return (
      <div className="pt-safe">
        <div className="flex h-14 items-center px-2">
          <IconButton label="返回" onClick={() => nav(-1)}>
            <ChevronLeft className="size-6" />
          </IconButton>
        </div>
        {ready ? <EmptyState icon={<ClipboardList className="size-10 text-ink-3" />} title="找不到这个动作" /> : <LoadingRow />}
      </div>
    )
  }

  const t = ex.tracking
  const addToPlan = async (planId: string) => {
    const p = plans.find((x) => x.id === planId)
    if (!p) return
    if (p.exercises.some((e) => e.exerciseId === ex.id)) return toast('计划里已经有这个动作了')
    await db.plans.update(planId, {
      updatedAt: Date.now(),
      exercises: [
        ...p.exercises,
        {
          uid: uid(),
          exerciseId: ex.id,
          sets: t === 'cardio' ? 1 : 3,
          reps: 10,
          duration: t === 'cardio' ? 1200 : t === 'time' ? 45 : undefined,
          restSec: 90,
        },
      ],
    })
    setPlanSheet(false)
    toast(`已添加到「${p.name}」`)
  }

  return (
    <div className="pb-32">
      <div className="relative">
        <ExerciseAnimation ex={ex} className="aspect-[4/3] w-full" />
        <div className="pt-safe absolute inset-x-0 top-0 flex items-center justify-between p-2">
          <IconButton label="返回" onClick={() => nav(-1)} className="bg-black/40 !text-white backdrop-blur">
            <ChevronLeft className="size-6" />
          </IconButton>
          {ex.custom && (
            <IconButton
              label="删除自定义动作"
              className="bg-black/40 !text-white backdrop-blur"
              onClick={async () => {
                if (await confirm({ title: '删除这个自定义动作？', message: '已有的训练记录会保留', danger: true, confirmText: '删除' })) {
                  await db.customExercises.delete(ex.id)
                  nav(-1)
                }
              }}
            >
              <Trash2 className="size-5" />
            </IconButton>
          )}
        </div>
      </div>

      <div className="relative -mt-6 rounded-t-[28px] bg-bg px-4 pt-5">
        <h1 className="px-1 text-2xl font-extrabold tracking-tight">{ex.zh}</h1>
        <div className="px-1 text-sm text-ink-3">{ex.name}</div>
        <div className="mt-3 flex flex-wrap gap-1.5 px-1">
          <Tag>
            <EquipmentIcon type={ex.equipment} width={12} height={12} /> {EQUIPMENT_ZH[ex.equipment]}
          </Tag>
          <Tag>{CATEGORY_ZH[ex.category]}</Tag>
          <Tag>{LEVEL_ZH[ex.level]}</Tag>
          {ex.mechanic && <Tag>{ex.mechanic === 'compound' ? '复合动作' : '孤立动作'}</Tag>}
          <Tag>记录：{TRACKING_ZH[t]}</Tag>
        </div>

        {/* 我的数据 */}
        <Card className="mt-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="size-4 text-warn" /> 我的数据
          </div>
          {history.length === 0 ? (
            <p className="py-5 text-center text-sm text-ink-3">还没有练过这个动作，完成后这里会显示你的进步曲线</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {t === 'weight' ? (
                  <>
                    <Kpi label="最大重量" value={fmtNumber(best.maxWeight)} unit={unit} />
                    <Kpi label="预估 1RM" value={fmtNumber(best.maxE1rm)} unit={unit} />
                    <Kpi label="训练次数" value={String(history.length)} unit="次" />
                  </>
                ) : (
                  <>
                    <Kpi label={t === 'reps' ? '最多次数' : '最长时长'} value={t === 'reps' ? String(best.maxReps) : fmtSec(best.maxDuration)} />
                    <Kpi label="训练次数" value={String(history.length)} unit="次" />
                    <Kpi label="总组数" value={String(history.reduce((n, h) => n + h.ex.sets.filter(isWorkingSet).length, 0))} unit="组" />
                  </>
                )}
              </div>
              {t === 'weight' && history.length > 0 && (
                <div className="mt-4">
                  <Segmented
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'e1rm', label: '预估1RM' },
                      { value: 'weight', label: '最大重量' },
                      { value: 'volume', label: '训练容量' },
                    ]}
                  />
                  <div className="mt-6">
                    <LineChart data={chart} format={(v) => `${fmtNumber(v)}${unit}`} />
                  </div>
                </div>
              )}
              <div className="mt-4 space-y-2">
                <div className="text-xs font-semibold text-ink-3">最近记录</div>
                {[...history].reverse().slice(0, 5).map(({ w, ex: we }) => (
                  <button
                    key={w.id}
                    onClick={() => nav(`/records/${w.id}`)}
                    className="flex w-full items-start gap-3 rounded-2xl bg-surface-2 p-3 text-left"
                  >
                    <div className="num w-14 shrink-0 whitespace-nowrap text-xs text-ink-3">{fmtDate(w.startedAt)}</div>
                    <div className="num flex flex-1 flex-wrap gap-1.5">
                      {we.sets.filter(isWorkingSet).map((s) => (
                        <span key={s.id} className="rounded-md bg-surface px-1.5 py-0.5 text-xs">
                          {fmtSet(s, unit)}
                        </span>
                      ))}
                    </div>
                    {t === 'weight' && (
                      <div className="num shrink-0 text-xs text-ink-3">
                        1RM {fmtNumber(Math.max(...we.sets.map((s) => e1rm(s.weight, s.reps))))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* 目标肌群 */}
        <Card className="mt-3">
          <div className="text-sm font-semibold">目标肌群</div>
          <BodyMap fill={musclesFill(ex.primary, ex.secondary)} className="mt-3 h-56" />
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {ex.primary.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink">
                主要 · {MUSCLE_ZH[m]}
              </span>
            ))}
            {ex.secondary.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
                次要 · {MUSCLE_ZH[m]}
              </span>
            ))}
          </div>
        </Card>

        {/* 动作要领 */}
        {(ex.instructions.length > 0 || ex.note) && (
          <Card className="mt-3">
            <div className="text-sm font-semibold">动作要领</div>
            {ex.note && <p className="mt-2 text-sm leading-relaxed text-ink-2">{ex.note}</p>}
            <ol className="mt-3 space-y-3">
              {ex.instructions.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                  <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-ink">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            {!ex.custom && (
              <p className="mt-4 text-[11px] text-ink-3">
                动作说明与示范图来自开源项目 free-exercise-db（Unlicense 公共领域授权），原文为英文。
              </p>
            )}
          </Card>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg gap-3 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        <Button variant="secondary" className={cx('mb-4', active ? 'flex-1' : 'flex-[2]')} onClick={() => setPlanSheet(true)}>
          <ClipboardList className="size-4" /> 加入计划
        </Button>
        {active && (
          <Button
            className="mb-4 flex-1"
            onClick={async () => {
              await addExercises([ex.id], byId)
              toast('已加入当前训练')
              nav('/workout')
            }}
          >
            <Plus className="size-4" /> 加入训练
          </Button>
        )}
      </div>

      <Sheet open={planSheet} onClose={() => setPlanSheet(false)} title="加入到哪个计划？">
        <div className="space-y-2 px-4 pb-6">
          {plans.map((p) => {
            const has = p.exercises.some((e) => e.exerciseId === ex.id)
            return (
              <button
                key={p.id}
                disabled={has}
                onClick={() => addToPlan(p.id)}
                className="pressable flex w-full items-center gap-3 rounded-2xl bg-surface-2 p-3.5 text-left disabled:opacity-50"
              >
                <span className="h-9 w-1.5 rounded-full" style={{ background: p.color }} />
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-ink-3">{p.exercises.length} 个动作</div>
                </div>
                {has ? <Check className="size-5 text-accent-text" /> : <Plus className="size-5 text-ink-3" />}
              </button>
            )
          })}
          <Button variant="ghost" block onClick={() => nav('/plans/new')}>
            <Plus className="size-4" /> 新建计划
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function Kpi({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className="text-[11px] text-ink-3">{label}</div>
      <div className="mt-0.5">
        <span className="num text-lg font-extrabold">{value}</span>
        {unit && <span className="ml-0.5 text-[11px] text-ink-3">{unit}</span>}
      </div>
    </div>
  )
}
