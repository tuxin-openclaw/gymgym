import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trophy, Clock, Layers, ListChecks, Dumbbell, Medal, ClipboardList } from 'lucide-react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { detectPRs, muscleLoad, workoutStats } from '../lib/stats'
import { cx, fmtDuration, fmtNumber, uid } from '../lib/utils'
import { Button, Card, toast } from '../components/ui'
import { BodyMap } from '../components/BodyMap'
import { fmtSec } from './PlanEdit'
import type { Workout } from '../lib/types'

export const FEELINGS = [
  { v: 1, emoji: '😫', label: '很累' },
  { v: 2, emoji: '😮‍💨', label: '有点累' },
  { v: 3, emoji: '🙂', label: '还行' },
  { v: 4, emoji: '😄', label: '不错' },
  { v: 5, emoji: '🔥', label: '状态爆棚' },
]

const CONFETTI_COLORS = ['#c6f432', '#4dabf7', '#ff6b6b', '#ffa94d', '#b197fc', '#38d9a9', '#ffd43b']

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.8 + Math.random() * 1.4,
        rot: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.random() * 6,
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
      <style>{`@keyframes confetti-fall{0%{transform:translateY(-20px) rotate(0)}100%{transform:translateY(440px) rotate(720deg);opacity:0}}`}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.w * 0.45,
            background: p.color,
            transform: `rotate(${p.rot}deg)`,
            animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(.3,.6,.5,1) both`,
          }}
        />
      ))}
    </div>
  )
}

export default function Summary() {
  const { id } = useParams()
  const nav = useNavigate()
  const { byId } = useExercises()
  const { unit } = useSettings()
  const w = useLiveQuery(() => db.workouts.get(id!), [id])
  const history = useLiveQuery(() => db.workouts.toArray(), [], [] as Workout[])
  const count = history.length

  const prs = useMemo(() => (w ? detectPRs(w, history, byId) : []), [w, history, byId])
  const load = useMemo(() => (w ? muscleLoad([w], byId) : {}), [w, byId])
  if (!w) return null
  const s = workoutStats(w)
  const maxLoad = Math.max(1, ...Object.values(load).map((v) => v ?? 0))
  const fill = Object.fromEntries(Object.entries(load).map(([k, v]) => [k, (v ?? 0) / maxLoad]))

  const saveAsPlan = async () => {
    const now = Date.now()
    await db.plans.add({
      id: uid(),
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
  }

  return (
    <div className="pt-safe relative pb-10">
      <Confetti />
      <div className="relative px-5 pt-10 text-center">
        <div className="mx-auto grid size-20 animate-pop place-items-center rounded-[28px] bg-accent text-accent-ink shadow-[0_12px_40px_-8px_rgb(198_244_50/0.7)]">
          <Trophy className="size-10" />
        </div>
        <h1 className="mt-5 animate-rise text-3xl font-extrabold tracking-tight">训练完成！</h1>
        <p className="mt-1.5 animate-rise text-sm text-ink-3">
          {w.name} · 这是你的第 <span className="num font-bold text-ink">{count}</span> 次训练
        </p>
      </div>

      <div className="relative mt-7 grid grid-cols-2 gap-2.5 px-4">
        <Big icon={<Clock className="size-4" />} label="训练时长" value={fmtDuration(s.duration)} />
        <Big icon={<Layers className="size-4" />} label="训练容量" value={`${fmtNumber(s.volume, 0)} ${unit}`} />
        <Big icon={<ListChecks className="size-4" />} label="完成组数" value={`${s.sets} 组`} />
        <Big icon={<Dumbbell className="size-4" />} label="训练动作" value={`${s.exercises} 个`} />
      </div>

      <div className="space-y-3 px-4 pt-3">
        {prs.length > 0 && (
          <Card className="animate-rise">
            <div className="flex items-center gap-2 font-bold">
              <Medal className="size-5 text-warn" /> 打破了 {prs.length} 项个人记录
            </div>
            <div className="mt-3 space-y-2">
              {prs.map((p) => (
                <div key={p.exerciseId + p.kind} className="flex items-center gap-3 rounded-2xl bg-warn/10 p-3">
                  <span className="text-xl">🏅</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{byId.get(p.exerciseId)?.zh}</div>
                    <div className="text-xs text-ink-3">
                      {p.kind === 'weight' ? '最大重量' : p.kind === 'e1rm' ? '预估 1RM' : p.kind === 'reps' ? '最多次数' : '最长时长'}
                    </div>
                  </div>
                  <div className="num text-right">
                    <div className="font-extrabold text-warn">{fmtPR(p.kind, p.value, unit)}</div>
                    <div className="text-[11px] text-ink-3 line-through">{fmtPR(p.kind, p.prev, unit)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <div className="text-sm font-semibold">这次练到了</div>
          <BodyMap fill={fill} className="mt-3 h-52" />
        </Card>

        <Card>
          <div className="text-sm font-semibold">感觉怎么样？</div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {FEELINGS.map((f) => (
              <button
                key={f.v}
                onClick={() => db.workouts.update(w.id, { feeling: f.v })}
                className={cx(
                  'pressable flex flex-col items-center gap-1 rounded-2xl py-2.5 transition-colors',
                  w.feeling === f.v ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface-2',
                )}
              >
                <span className={cx('text-2xl transition-transform', w.feeling === f.v && 'scale-125')}>{f.emoji}</span>
                <span className="text-[11px] text-ink-2">{f.label}</span>
              </button>
            ))}
          </div>
          <textarea
            defaultValue={w.note}
            onBlur={(e) => db.workouts.update(w.id, { note: e.target.value || undefined })}
            rows={2}
            placeholder="写点训练心得（可选）"
            className="mt-3 w-full rounded-2xl bg-surface-2 p-3 text-sm outline-none placeholder:text-ink-3"
          />
        </Card>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <Button variant="secondary" onClick={() => nav(`/records/${w.id}`, { replace: true })}>
            查看详情
          </Button>
          <Button onClick={() => nav('/', { replace: true })}>完成</Button>
        </div>
        {!w.planId && (
          <Button variant="ghost" block onClick={saveAsPlan}>
            <ClipboardList className="size-4" /> 把这次训练保存为计划
          </Button>
        )}
      </div>
    </div>
  )
}

export function fmtPR(kind: string, v: number, unit: string) {
  if (kind === 'reps') return `${v} 次`
  if (kind === 'duration') return fmtSec(v)
  return `${fmtNumber(v)} ${unit}`
}

function Big({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="animate-rise rounded-3xl bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs text-ink-3">
        {icon}
        {label}
      </div>
      <div className="num mt-1.5 text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  )
}
