import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Ellipsis, Repeat, Trash2, ClipboardList, Clock, Layers, ListChecks, Dumbbell } from 'lucide-react'
import { useState } from 'react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { useWorkout } from '../lib/workout-store'
import { e1rm, workoutStats } from '../lib/stats'
import { cx, fmtDuration, fmtNumber, pad, uid, WEEK_LABELS } from '../lib/utils'
import { Button, Card, IconButton, PageHeader, Sheet, confirm, toast } from '../components/ui'
import { ExerciseThumb } from '../components/ExerciseMedia'
import { fmtSet } from './ExerciseDetail'
import { FEELINGS } from './Summary'

export default function WorkoutDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const w = useLiveQuery(() => db.workouts.get(id!), [id])
  const { byId } = useExercises()
  const { unit } = useSettings()
  const active = useWorkout((s) => s.workout)
  const start = useWorkout((s) => s.start)
  const [menu, setMenu] = useState(false)
  if (!w) return <PageHeader title="训练详情" back />

  const s = workoutStats(w)
  const d = new Date(w.startedAt)
  const feeling = FEELINGS.find((f) => f.v === w.feeling)

  const repeat = async () => {
    await start(
      {
        name: w.name,
        exercises: w.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          restSec: e.restSec,
          sets: e.sets.map((x) => ({ type: x.type, weight: x.weight, reps: x.reps, duration: x.duration, distance: x.distance })),
        })),
      },
      byId,
    )
    nav('/workout')
  }

  const saveAsPlan = async () => {
    const now = Date.now()
    const id = uid()
    await db.plans.add({
      id,
      name: w.name,
      color: w.color ?? '#c6f432',
      days: [],
      createdAt: now,
      updatedAt: now,
      exercises: w.exercises.map((e) => {
        const working = e.sets.filter((x) => x.type !== 'warmup')
        return {
          uid: uid(),
          exerciseId: e.exerciseId,
          sets: Math.max(1, working.length),
          reps: working[0]?.reps ?? 10,
          weight: working[0]?.weight,
          duration: working[0]?.duration,
          restSec: e.restSec,
        }
      }),
    })
    toast('已保存为训练计划')
    nav(`/plans/${id}`)
  }

  return (
    <div className="pb-32">
      <PageHeader
        title={w.name}
        back
        actions={
          <IconButton label="更多" onClick={() => setMenu(true)}>
            <Ellipsis className="size-5" />
          </IconButton>
        }
      />
      <div className="px-4">
        <div className="px-1 pt-1">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: w.color ?? 'var(--accent)' }} />
            <span className="num text-sm text-ink-3">
              {d.getFullYear()}年{d.getMonth() + 1}月{d.getDate()}日 周{WEEK_LABELS[d.getDay()]} · {pad(d.getHours())}:{pad(d.getMinutes())}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{w.name}</h1>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 rounded-3xl bg-surface p-3">
          <Mini icon={<Clock className="size-3.5" />} label="时长" value={fmtDuration(s.duration)} />
          <Mini icon={<Layers className="size-3.5" />} label={`容量(${unit})`} value={fmtNumber(s.volume, 0)} />
          <Mini icon={<ListChecks className="size-3.5" />} label="组数" value={String(s.sets)} />
          <Mini icon={<Dumbbell className="size-3.5" />} label="动作" value={String(s.exercises)} />
        </div>

        {(feeling || w.note) && (
          <Card className="mt-3 flex items-start gap-3">
            {feeling && <span className="text-3xl">{feeling.emoji}</span>}
            <div className="min-w-0 flex-1">
              {feeling && <div className="text-sm font-semibold">感觉：{feeling.label}</div>}
              {w.note && <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{w.note}</p>}
            </div>
          </Card>
        )}

        <div className="mt-3 space-y-3">
          {w.exercises.map((we) => {
            const ex = byId.get(we.exerciseId)
            let n = 0
            const best = Math.max(0, ...we.sets.map((x) => e1rm(x.weight, x.reps)))
            return (
              <Card key={we.uid} className="!p-3">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => ex && nav(`/exercises/${encodeURIComponent(ex.id)}`)}>
                  {ex ? <ExerciseThumb ex={ex} className="size-11 rounded-xl" /> : <div className="size-11 rounded-xl bg-surface-2" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{ex?.zh ?? we.exerciseId}</div>
                    {best > 0 && <div className="num text-xs text-ink-3">最佳预估 1RM {fmtNumber(best)} {unit}</div>}
                  </div>
                </button>
                <div className="mt-2 space-y-1">
                  {we.sets.map((x) => (
                    <div key={x.id} className="num flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <span
                        className={cx(
                          'w-6 text-center text-xs font-bold',
                          x.type === 'warmup' ? 'text-warn' : x.type === 'drop' ? 'text-info' : x.type === 'failure' ? 'text-danger' : 'text-ink-3',
                        )}
                      >
                        {x.type === 'normal' ? ++n : x.type === 'warmup' ? 'W' : x.type === 'drop' ? 'D' : 'F'}
                      </span>
                      <span className="flex-1 font-semibold">{fmtSet(x, unit)}</span>
                      {x.weight && x.reps ? <span className="text-xs text-ink-3">{fmtNumber(x.weight * x.reps, 0)}</span> : null}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        <Button block size="lg" className="mb-4" disabled={!!active} onClick={repeat}>
          <Repeat className="size-5" /> {active ? '已有训练进行中' : '再练一次'}
        </Button>
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)} title="训练操作">
        <div className="space-y-2 px-4 pb-6">
          <Button variant="secondary" block className="!justify-start" onClick={saveAsPlan}>
            <ClipboardList className="size-4" /> 保存为训练计划
          </Button>
          <Button
            variant="danger"
            block
            className="!justify-start"
            onClick={async () => {
              setMenu(false)
              if (await confirm({ title: '删除这条训练记录？', message: '删除后无法恢复', danger: true, confirmText: '删除' })) {
                await db.workouts.delete(w.id)
                toast('已删除')
                nav(-1)
              }
            }}
          >
            <Trash2 className="size-4" /> 删除记录
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1 text-[10px] text-ink-3">
        {icon}
        {label}
      </div>
      <div className="num mt-1 text-[15px] font-extrabold">{value}</div>
    </div>
  )
}
