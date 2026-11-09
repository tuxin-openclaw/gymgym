import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, CalendarX, Plus, Scale, Trophy, Flame, Clock, Layers, Timer, Trash2 } from 'lucide-react'
import { db } from '../lib/db'
import { useExercises, partOf } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { BODY_PARTS, type BodyPart } from '../lib/catalog'
import { bestByExercise, isWorkingSet, muscleLoad, workoutStats } from '../lib/stats'
import type { Workout } from '../lib/types'
import { WEEK_LABELS, addDays, cx, dayKey, fmtDate, fmtNumber, startOfWeek, uid, fmtDuration } from '../lib/utils'
import { Button, Card, EmptyState, PageHeader, Segmented, SectionTitle, Sheet, toast, confirm } from '../components/ui'
import { BarChart, LineChart } from '../components/charts'
import { BodyMap } from '../components/BodyMap'
import { WorkoutCard } from './Home'

export default function Records() {
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as 'history' | 'stats') ?? 'history'
  const workouts = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().toArray(), [], [] as Workout[])
  return (
    <div>
      <PageHeader large title="训练记录" subtitle={`累计训练 ${workouts.length} 次`} />
      <div className="px-4">
        <Segmented
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={[
            { value: 'history', label: '历史' },
            { value: 'stats', label: '统计' },
          ]}
        />
        {tab === 'history' ? <History workouts={workouts} /> : <Stats workouts={workouts} />}
      </div>
    </div>
  )
}

/* ================= 历史 ================= */
function History({ workouts }: { workouts: Workout[] }) {
  const { weekStart, unit } = useSettings()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState<string | null>(null)
  const byDay = useMemo(() => {
    const m = new Map<string, Workout[]>()
    for (const w of workouts) {
      const k = dayKey(w.startedAt)
      m.set(k, [...(m.get(k) ?? []), w])
    }
    return m
  }, [workouts])

  const first = startOfWeek(month, weekStart)
  const days = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const weeks = days[35].getMonth() === month.getMonth() ? 6 : 5
  const monthWorkouts = workouts.filter((w) => {
    const d = new Date(w.startedAt)
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  })
  const list = selected ? byDay.get(selected) ?? [] : monthWorkouts
  const monthDuration = monthWorkouts.reduce((n, w) => n + workoutStats(w).duration, 0)
  const shift = (n: number) => {
    setSelected(null)
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1))
  }
  const todayKey = dayKey(Date.now())

  return (
    <>
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <button aria-label="上个月" onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-full bg-surface-2">
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <div className="font-bold">
              {month.getFullYear()}年{month.getMonth() + 1}月
            </div>
            <div className="num text-xs text-ink-3">
              训练 {monthWorkouts.length} 次 · {fmtDuration(monthDuration)}
            </div>
          </div>
          <button aria-label="下个月" onClick={() => shift(1)} className="grid size-9 place-items-center rounded-full bg-surface-2">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="pb-1 text-[11px] text-ink-3">
              {WEEK_LABELS[(i + weekStart) % 7]}
            </div>
          ))}
          {days.slice(0, weeks * 7).map((d) => {
            const k = dayKey(d)
            const ws = byDay.get(k) ?? []
            const inMonth = d.getMonth() === month.getMonth()
            const isSel = selected === k
            return (
              <button
                key={k}
                disabled={!ws.length}
                onClick={() => setSelected(isSel ? null : k)}
                className="flex flex-col items-center py-0.5"
              >
                <span
                  className={cx(
                    'num grid size-9 place-items-center rounded-full text-sm font-semibold transition-all',
                    !inMonth && 'opacity-30',
                    ws.length ? 'text-accent-ink' : k === todayKey ? 'text-accent-text' : 'text-ink-2',
                    isSel && 'ring-2 ring-ink ring-offset-2 ring-offset-surface',
                  )}
                  style={ws.length ? { background: ws[0].color ?? 'var(--accent)' } : undefined}
                >
                  {d.getDate()}
                </span>
                <span className="mt-0.5 flex h-1 gap-0.5">
                  {ws.length > 1 && ws.slice(1, 4).map((w) => <span key={w.id} className="size-1 rounded-full" style={{ background: w.color ?? 'var(--accent)' }} />)}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <div className="mb-3 mt-6 flex items-center justify-between px-1">
        <h2 className="text-[17px] font-bold">{selected ? fmtDate(new Date(selected.replace(/-/g, '/'))) : '本月训练'}</h2>
        {selected && (
          <button onClick={() => setSelected(null)} className="text-xs text-ink-3">
            查看整月
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<CalendarX className="size-10 text-ink-3" />} title="这个月还没有训练记录" desc="坚持就是胜利，开始你的第一练吧" />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((w) => (
            <WorkoutCard key={w.id} w={w} unit={unit} />
          ))}
        </div>
      )}
    </>
  )
}

/* ================= 统计 ================= */
type Range = '4w' | '12w' | '1y'
type Metric = 'count' | 'duration' | 'volume'

function Stats({ workouts }: { workouts: Workout[] }) {
  const nav = useNavigate()
  const { byId } = useExercises()
  const { weekStart, unit } = useSettings()
  const [range, setRange] = useState<Range>('12w')
  const [metric, setMetric] = useState<Metric>('volume')

  const now = new Date()
  const from =
    range === '1y'
      ? new Date(now.getFullYear(), now.getMonth() - 11, 1)
      : startOfWeek(addDays(now, -7 * ((range === '4w' ? 4 : 12) - 1)), weekStart)
  const inRange = workouts.filter((w) => w.startedAt >= from.getTime())
  const totals = inRange.reduce(
    (a, w) => {
      const s = workoutStats(w)
      a.duration += s.duration
      a.volume += s.volume
      a.sets += s.sets
      return a
    },
    { duration: 0, volume: 0, sets: 0 },
  )

  const buckets = useMemo(() => {
    const val = (ws: Workout[]) =>
      metric === 'count'
        ? ws.length
        : ws.reduce((n, w) => n + (metric === 'duration' ? workoutStats(w).duration / 60 : workoutStats(w).volume), 0)
    if (range === '1y') {
      return Array.from({ length: 12 }, (_, i) => {
        const s = new Date(from.getFullYear(), from.getMonth() + i, 1)
        const e = new Date(from.getFullYear(), from.getMonth() + i + 1, 1)
        const ws = inRange.filter((w) => w.startedAt >= s.getTime() && w.startedAt < e.getTime())
        return { label: `${s.getMonth() + 1}月`, tip: `${s.getFullYear()}年${s.getMonth() + 1}月`, value: Math.round(val(ws)) }
      })
    }
    const n = range === '4w' ? 4 : 12
    return Array.from({ length: n }, (_, i) => {
      const s = addDays(from, i * 7)
      const e = addDays(s, 7)
      const ws = inRange.filter((w) => w.startedAt >= s.getTime() && w.startedAt < e.getTime())
      return { label: `${s.getMonth() + 1}/${s.getDate()}`, tip: `${fmtDate(s)} 那周`, value: Math.round(val(ws)) }
    })
  }, [range, metric, inRange, from.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps

  // 连续训练周数
  const streak = useMemo(() => {
    let n = 0
    let ws = startOfWeek(now, weekStart)
    const has = (s: Date) => workouts.some((w) => w.startedAt >= s.getTime() && w.startedAt < addDays(s, 7).getTime())
    if (!has(ws)) ws = addDays(ws, -7) // 本周还没练不打断
    while (has(ws)) {
      n++
      ws = addDays(ws, -7)
    }
    return n
  }, [workouts, weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = useMemo(() => muscleLoad(inRange, byId), [inRange, byId])
  const maxLoad = Math.max(1, ...Object.values(load).map((v) => v ?? 0))
  const fill = Object.fromEntries(Object.entries(load).map(([k, v]) => [k, (v ?? 0) / maxLoad]))

  const partSets = useMemo(() => {
    const m: Partial<Record<BodyPart, number>> = {}
    for (const w of inRange)
      for (const e of w.exercises) {
        const ex = byId.get(e.exerciseId)
        if (!ex) continue
        const k = partOf(ex)
        m[k] = (m[k] ?? 0) + e.sets.filter(isWorkingSet).length
      }
    return BODY_PARTS.map((p) => ({ ...p, sets: m[p.key] ?? 0 })).sort((a, b) => b.sets - a.sets)
  }, [inRange, byId])
  const maxPart = Math.max(1, ...partSets.map((p) => p.sets))

  const prs = useMemo(() => {
    const best = bestByExercise(workouts)
    const freq = new Map<string, number>()
    for (const w of workouts) for (const e of w.exercises) freq.set(e.exerciseId, (freq.get(e.exerciseId) ?? 0) + 1)
    return [...best.entries()]
      .filter(([id, b]) => byId.get(id)?.tracking === 'weight' && b.maxWeight > 0)
      .sort((a, b) => (freq.get(b[0]) ?? 0) - (freq.get(a[0]) ?? 0))
      .slice(0, 8)
  }, [workouts, byId])

  if (!workouts.length)
    return (
      <Card className="mt-4">
        <EmptyState icon={<Trophy className="size-10 text-ink-3" />} title="还没有数据" desc="完成几次训练后，这里会出现你的训练趋势、部位分布和个人记录" />
      </Card>
    )

  return (
    <>
      <div className="mt-4 flex justify-end">
        <Segmented
          className="w-56"
          value={range}
          onChange={setRange}
          options={[
            { value: '4w', label: '4周' },
            { value: '12w', label: '12周' },
            { value: '1y', label: '1年' },
          ]}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Kpi icon={<Flame className="size-4" />} label="训练次数" value={String(inRange.length)} unit="次" />
        <Kpi icon={<Clock className="size-4" />} label="总时长" value={fmtNumber(totals.duration / 3600, 1)} unit="小时" />
        <Kpi icon={<Layers className="size-4" />} label="总容量" value={fmtNumber(totals.volume, 0)} unit={unit} />
        <Kpi icon={<Timer className="size-4" />} label="连续训练" value={String(streak)} unit="周" />
      </div>

      <Card className="mt-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">训练趋势</div>
          <div className="flex gap-1">
            {(
              [
                ['volume', '容量'],
                ['count', '次数'],
                ['duration', '时长'],
              ] as [Metric, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setMetric(k)}
                className={cx('h-7 rounded-full px-2.5 text-xs font-semibold', metric === k ? 'bg-ink text-bg' : 'text-ink-3')}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <BarChart
            data={buckets}
            format={(v) => (metric === 'count' ? `${v} 次` : metric === 'duration' ? `${v} 分钟` : `${fmtNumber(v, 0)} ${unit}`)}
          />
        </div>
      </Card>

      <SectionTitle>部位分布</SectionTitle>
      <Card>
        <BodyMap fill={fill} className="h-52" />
        <div className="mt-4 space-y-2.5">
          {partSets
            .filter((p) => p.sets > 0)
            .map((p) => (
              <div key={p.key} className="flex items-center gap-3">
                <span className="w-9 text-sm text-ink-2">{p.zh}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${(p.sets / maxPart) * 100}%`, background: p.color }} />
                </div>
                <span className="num w-12 text-right text-xs text-ink-3">{p.sets} 组</span>
              </div>
            ))}
        </div>
      </Card>

      <SectionTitle>个人记录</SectionTitle>
      <Card className="!p-2">
        {prs.length === 0 ? (
          <p className="p-4 text-center text-sm text-ink-3">完成负重训练后会显示各动作的最佳成绩</p>
        ) : (
          prs.map(([id, b], i) => (
            <button
              key={id}
              onClick={() => nav(`/exercises/${encodeURIComponent(id)}`)}
              className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-surface-2"
            >
              <span
                className={cx(
                  'num grid size-7 place-items-center rounded-full text-xs font-bold',
                  i < 3 ? 'bg-warn/15 text-warn' : 'bg-surface-2 text-ink-3',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{byId.get(id)?.zh}</span>
              <span className="num text-right">
                <span className="text-sm font-bold">
                  {fmtNumber(b.maxWeight)}
                  <span className="text-[11px] font-normal text-ink-3"> {unit}</span>
                </span>
                <span className="block text-[11px] text-ink-3">1RM ≈ {fmtNumber(b.maxE1rm)}</span>
              </span>
            </button>
          ))
        )}
      </Card>

      <BodyWeightCard />
    </>
  )
}

function Kpi({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-3xl bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs text-ink-3">
        {icon}
        {label}
      </div>
      <div className="mt-1.5">
        <span className="num text-2xl font-extrabold tracking-tight">{value}</span>
        <span className="ml-1 text-xs text-ink-3">{unit}</span>
      </div>
    </div>
  )
}

function BodyWeightCard() {
  const { unit } = useSettings()
  const list = useLiveQuery(() => db.bodyweights.orderBy('date').toArray(), [], [])
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')
  const [date, setDate] = useState(dayKey(Date.now()))
  const lastW = list[list.length - 1]
  const firstW = list[0]
  const diff = lastW && firstW ? lastW.weight - firstW.weight : 0

  const save = async () => {
    const weight = parseFloat(val)
    if (!weight) return
    const existing = list.find((b) => b.date === date)
    await db.bodyweights.put({ id: existing?.id ?? uid(), date, weight })
    setOpen(false)
    setVal('')
    toast('体重已记录')
  }

  return (
    <>
      <SectionTitle
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setVal(lastW ? String(lastW.weight) : '')
              setDate(dayKey(Date.now()))
              setOpen(true)
            }}
          >
            <Plus className="size-4" /> 记录
          </Button>
        }
      >
        体重
      </SectionTitle>
      <Card className="mb-4">
        {list.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Scale className="size-9 text-ink-3" />
            <p className="mt-2 text-sm text-ink-3">记录体重，观察身体变化</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-ink-3">当前</div>
                <span className="num text-3xl font-extrabold">{lastW.weight}</span>
                <span className="ml-1 text-sm text-ink-3">{unit}</span>
              </div>
              {list.length > 1 && (
                <div className={cx('num rounded-full px-2.5 py-1 text-xs font-bold', diff <= 0 ? 'bg-accent-soft text-accent-text' : 'bg-warn/15 text-warn')}>
                  较首次 {diff > 0 ? '+' : ''}
                  {fmtNumber(diff)} {unit}
                </div>
              )}
            </div>
            {list.length > 1 && (
              <div className="mt-6">
                <LineChart
                  data={list.slice(-30).map((b) => ({ label: b.date.slice(5).replace('-', '/'), tip: b.date, value: b.weight }))}
                  format={(v) => `${fmtNumber(v)} ${unit}`}
                  color="var(--info)"
                />
              </div>
            )}
            <div className="mt-3 space-y-1">
              {[...list]
                .reverse()
                .slice(0, 3)
                .map((b) => (
                  <div key={b.id} className="num flex items-center justify-between rounded-xl px-1 py-1 text-sm">
                    <span className="text-ink-3">{b.date}</span>
                    <span className="flex items-center gap-2">
                      {b.weight} {unit}
                      <button
                        aria-label="删除"
                        className="text-ink-3"
                        onClick={async () => (await confirm({ title: '删除这条体重记录？', danger: true, confirmText: '删除' })) && db.bodyweights.delete(b.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
            </div>
          </>
        )}
      </Card>
      <Sheet open={open} onClose={() => setOpen(false)} title="记录体重">
        <div className="space-y-3 px-5 pb-6">
          <div className="flex h-20 items-center justify-center gap-2 rounded-3xl bg-surface-2">
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={val}
              onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="0.0"
              className="num w-32 bg-transparent text-center text-4xl font-extrabold outline-none"
            />
            <span className="text-lg text-ink-3">{unit}</span>
          </div>
          <input
            type="date"
            value={date}
            max={dayKey(Date.now())}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[15px] outline-none"
          />
          <Button block disabled={!parseFloat(val)} onClick={save}>
            保存
          </Button>
        </div>
      </Sheet>
    </>
  )
}
