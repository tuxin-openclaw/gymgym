import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Settings, Play, ChevronRight, Flame, Clock, Layers, Plus, Moon, Sparkles, Timer } from 'lucide-react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { useWorkout } from '../lib/workout-store'
import { muscleLoad, workoutStats } from '../lib/stats'
import { WEEK_LABELS, addDays, cx, dayKey, fmtNumber, fmtRelativeDay, greeting, startOfWeek, fmtDuration } from '../lib/utils'
import { Card, IconButton, SectionTitle, Button } from '../components/ui'
import { Logo } from '../components/icons'
import { BodyMap } from '../components/BodyMap'
import { openStartSheet, useStartWorkout } from '../components/StartSheet'
import type { Workout } from '../lib/types'

export default function Home() {
  const nav = useNavigate()
  const { nickname, weekStart, unit } = useSettings()
  const active = useWorkout((s) => s.workout)
  const plans = useLiveQuery(() => db.plans.toArray(), [], [])
  const recent = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().limit(60).toArray(), [], [])
  const { byId } = useExercises()
  const startWorkout = useStartWorkout()

  const weekStartDate = startOfWeek(new Date(), weekStart)
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))
  const thisWeek = recent.filter((w) => w.startedAt >= weekStartDate.getTime())
  const byDay = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of recent) {
      const k = dayKey(w.startedAt)
      m.set(k, [...(m.get(k) ?? []), w])
    }
    return m
  }, [recent])
  const weekTotals = thisWeek.reduce(
    (acc, w) => {
      const s = workoutStats(w)
      acc.duration += s.duration
      acc.volume += s.volume
      acc.sets += s.sets
      return acc
    },
    { duration: 0, volume: 0, sets: 0 },
  )
  const load = useMemo(() => muscleLoad(thisWeek, byId), [thisWeek, byId])
  const maxLoad = Math.max(1, ...Object.values(load).map((v) => v ?? 0))
  const fill = Object.fromEntries(Object.entries(load).map(([k, v]) => [k, (v ?? 0) / maxLoad]))

  const today = new Date().getDay()
  const todayPlans = plans.filter((p) => p.days.includes(today))
  const trainedToday = byDay.has(dayKey(Date.now()))

  return (
    <div className="pt-safe">
      <header className="flex items-center gap-3 px-5 pb-2 pt-4">
        <Logo size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-3">
            {new Date().getMonth() + 1}月{new Date().getDate()}日 · 星期{WEEK_LABELS[today]}
          </div>
          <div className="truncate text-xl font-extrabold tracking-tight">
            {greeting()}
            {nickname ? `，${nickname}` : ''} 👋
          </div>
        </div>
        <IconButton label="设置" onClick={() => nav('/settings')} className="bg-surface">
          <Settings className="size-5" />
        </IconButton>
      </header>

      <div className="px-4">
        {active && (
          <button
            onClick={() => nav('/workout')}
            className="pressable mt-3 flex w-full animate-rise items-center gap-3 rounded-3xl bg-accent p-4 text-left text-accent-ink"
          >
            <div className="grid size-11 place-items-center rounded-2xl bg-accent-ink/10">
              <Timer className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold opacity-70">训练进行中</div>
              <div className="truncate font-bold">{active.name}</div>
            </div>
            <span className="flex items-center gap-1 text-sm font-bold">
              继续 <ChevronRight className="size-4" />
            </span>
          </button>
        )}

        {/* 本周 */}
        <Card className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">本周训练</div>
            <Link to="/records" className="flex items-center text-xs text-ink-3">
              全部记录 <ChevronRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {week.map((d) => {
              const k = dayKey(d)
              const ws = byDay.get(k) ?? []
              const isToday = k === dayKey(Date.now())
              const future = d.getTime() > Date.now()
              return (
                <div key={k} className="flex flex-col items-center gap-1.5">
                  <span className={cx('text-[11px]', isToday ? 'font-bold text-ink' : 'text-ink-3')}>{WEEK_LABELS[d.getDay()]}</span>
                  <div
                    className={cx(
                      'num grid size-9 place-items-center rounded-full text-sm font-semibold transition-colors',
                      ws.length ? 'text-accent-ink' : isToday ? 'ring-2 ring-accent text-ink' : future ? 'text-ink-3' : 'bg-surface-2 text-ink-2',
                    )}
                    style={ws.length ? { background: ws[0].color ?? 'var(--accent)' } : undefined}
                  >
                    {ws.length ? <Flame className="size-4" /> : d.getDate()}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface-2 py-3">
            <Stat icon={<Flame className="size-3.5" />} label="训练次数" value={String(thisWeek.length)} unit="次" />
            <Stat icon={<Clock className="size-3.5" />} label="训练时长" value={fmtNumber(weekTotals.duration / 60, 0)} unit="分钟" />
            <Stat icon={<Layers className="size-3.5" />} label="训练容量" value={fmtNumber(weekTotals.volume, 0)} unit={unit} />
          </div>
        </Card>

        {/* 今日计划 */}
        <SectionTitle
          action={
            <Link to="/plans" className="flex items-center text-xs text-ink-3">
              全部计划 <ChevronRight className="size-3.5" />
            </Link>
          }
        >
          今日训练
        </SectionTitle>
        {todayPlans.length > 0 ? (
          <div className="space-y-3">
            {todayPlans.map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-3xl p-5"
                style={{ background: `linear-gradient(135deg, ${p.color}26, ${p.color}08 60%), var(--surface)` }}
              >
                <div className="absolute -right-6 -top-6 size-32 rounded-full opacity-20 blur-2xl" style={{ background: p.color }} />
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: p.color }}>
                  <span className="size-2 rounded-full" style={{ background: p.color }} />
                  {trainedToday ? '今天已经练过啦，还可以再来一组' : '今天的计划'}
                </div>
                <div className="mt-1.5 text-2xl font-extrabold tracking-tight">{p.name}</div>
                <div className="mt-1 text-sm text-ink-3">
                  {p.exercises.length} 个动作 · {p.exercises.reduce((n, e) => n + e.sets, 0)} 组 · 约{' '}
                  {Math.round(p.exercises.reduce((n, e) => n + e.sets * (45 + e.restSec), 0) / 60)} 分钟
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.exercises.slice(0, 5).map((e) => (
                    <span key={e.uid} className="rounded-lg bg-surface-2/80 px-2 py-1 text-xs text-ink-2">
                      {byId.get(e.exerciseId)?.zh ?? '…'}
                    </span>
                  ))}
                  {p.exercises.length > 5 && <span className="px-1 py-1 text-xs text-ink-3">+{p.exercises.length - 5}</span>}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" onClick={() => startWorkout(p)} disabled={!!active}>
                    <Play className="size-4 fill-current" /> 开始训练
                  </Button>
                  <Button variant="secondary" onClick={() => nav(`/plans/${p.id}`)}>
                    查看
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="flex items-center gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface-2">
              {plans.length ? <Moon className="size-6 text-info" /> : <Sparkles className="size-6 text-accent-text" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{plans.length ? '今天没有安排计划' : '先制定一个训练计划吧'}</div>
              <div className="mt-0.5 text-xs text-ink-3">
                {plans.length ? '可以休息恢复，也可以来一场自由训练' : '选部位、选器材、选动作，或使用推荐模板'}
              </div>
            </div>
            <Button size="sm" onClick={() => (plans.length ? openStartSheet() : nav('/plans'))}>
              {plans.length ? '开练' : '去制定'}
            </Button>
          </Card>
        )}

        {/* 本周部位 */}
        {thisWeek.length > 0 && (
          <>
            <SectionTitle>本周练到的部位</SectionTitle>
            <Card>
              <BodyMap fill={fill} className="h-56" />
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-ink-3">
                少
                <span className="h-2 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, color-mix(in srgb, var(--chart) 28%, transparent), var(--chart))' }} />
                多
              </div>
            </Card>
          </>
        )}

        {/* 最近训练 */}
        <SectionTitle
          action={
            recent.length > 0 && (
              <Link to="/records" className="flex items-center text-xs text-ink-3">
                查看全部 <ChevronRight className="size-3.5" />
              </Link>
            )
          }
        >
          最近训练
        </SectionTitle>
        {recent.length === 0 ? (
          <Card className="py-8 text-center">
            <div className="text-sm text-ink-3">还没有训练记录，完成第一次训练后会显示在这里</div>
            <Button size="sm" className="mt-4" onClick={openStartSheet}>
              <Plus className="size-4" /> 开始第一次训练
            </Button>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {recent.slice(0, 3).map((w) => (
              <WorkoutCard key={w.id} w={w} unit={unit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 text-[11px] text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-1">
        <span className="num text-xl font-extrabold">{value}</span>
        <span className="ml-0.5 text-[11px] text-ink-3">{unit}</span>
      </div>
    </div>
  )
}

export function WorkoutCard({ w, unit }: { w: Workout; unit: string }) {
  const nav = useNavigate()
  const { byId } = useExercises()
  const s = workoutStats(w)
  const d = new Date(w.startedAt)
  return (
    <Card onClick={() => nav(`/records/${w.id}`)} className="flex items-center gap-3.5 !p-3.5">
      <div
        className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl"
        style={{ background: `${w.color ?? '#c6f432'}22`, color: w.color ?? 'var(--accent-text)' }}
      >
        <span className="text-[10px] font-semibold">{d.getMonth() + 1}月</span>
        <span className="num text-xl font-extrabold leading-none">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{w.name}</span>
          <span className="shrink-0 text-[11px] text-ink-3">{fmtRelativeDay(w.startedAt)}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-3">
          {w.exercises.map((e) => byId.get(e.exerciseId)?.zh).filter(Boolean).join('、') || '—'}
        </div>
        <div className="num mt-1.5 flex gap-3 text-xs text-ink-2">
          <span>⏱ {fmtDuration(s.duration)}</span>
          <span>{s.sets} 组</span>
          {s.volume > 0 && (
            <span>
              {fmtNumber(s.volume, 0)} {unit}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-3" />
    </Card>
  )
}
