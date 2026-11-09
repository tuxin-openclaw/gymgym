import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronDown,
  Check,
  Plus,
  Ellipsis,
  Trash2,
  ArrowUp,
  ArrowDown,
  Replace,
  Info,
  Timer,
  SkipForward,
  Dumbbell,
  Pencil,
  NotebookPen,
} from 'lucide-react'
import { db } from '../lib/db'
import { useExercises } from '../lib/exercises'
import { useSettings } from '../lib/settings'
import { useWorkout } from '../lib/workout-store'
import { lastSetsFor } from '../lib/stats'
import type { Exercise, SetType, WorkoutExercise, WorkoutSet } from '../lib/types'
import { beep, cx, fmtClock, vibrate } from '../lib/utils'
import { Button, EmptyState, IconButton, Sheet, confirm, toast } from '../components/ui'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseThumb } from '../components/ExerciseMedia'
import { Ring } from '../components/charts'
import { fmtSet } from './ExerciseDetail'

function useNow(ms = 1000, enabled = true) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!enabled) return
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms, enabled])
  return now
}

function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const req = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => {})
    req()
    const onVis = () => document.visibilityState === 'visible' && req()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      lock?.release().catch(() => {})
    }
  }, [enabled])
}

const SET_TYPE_META: Record<SetType, { label: string; short: string; cls: string }> = {
  normal: { label: '正式组', short: '', cls: 'bg-surface-2 text-ink' },
  warmup: { label: '热身组', short: 'W', cls: 'bg-warn/15 text-warn' },
  drop: { label: '递减组', short: 'D', cls: 'bg-info/15 text-info' },
  failure: { label: '力竭组', short: 'F', cls: 'bg-danger/15 text-danger' },
}

export default function WorkoutPage() {
  const nav = useNavigate()
  const w = useWorkout((s) => s.workout)
  const store = useWorkout()
  const { byId } = useExercises()
  const now = useNow(1000, !!w)
  const [picker, setPicker] = useState<null | { mode: 'add' } | { mode: 'replace'; exUid: string }>(null)
  const [renaming, setRenaming] = useState(false)
  const history = useLiveQuery(() => db.workouts.orderBy('startedAt').reverse().limit(60).toArray(), [], [])
  useWakeLock(!!w)

  const progress = useMemo(() => {
    if (!w) return { done: 0, total: 0 }
    const all = w.exercises.flatMap((e) => e.sets)
    return { done: all.filter((s) => s.done).length, total: all.length }
  }, [w])

  if (!w) {
    return (
      <div className="pt-safe">
        <div className="flex h-14 items-center px-2">
          <IconButton label="返回" onClick={() => nav('/')}>
            <ChevronDown className="size-6" />
          </IconButton>
        </div>
        <EmptyState
          icon={<Dumbbell className="size-10 text-ink-3" />}
          title="当前没有进行中的训练"
          action={<Button onClick={() => nav('/')}>回到首页</Button>}
        />
      </div>
    )
  }

  const finish = async () => {
    const remaining = progress.total - progress.done
    if (progress.done === 0) {
      const ok = await confirm({
        title: '还没有完成任何一组',
        message: '要放弃这次训练吗？放弃后不会保存记录。',
        confirmText: '放弃训练',
        cancelText: '继续练',
        danger: true,
      })
      if (ok) {
        store.discard()
        nav('/', { replace: true })
      }
      return
    }
    if (remaining > 0) {
      const ok = await confirm({
        title: '完成训练？',
        message: `还有 ${remaining} 组没有打勾，未完成的组不会被记录。`,
        confirmText: '完成',
        cancelText: '再练会儿',
      })
      if (!ok) return
    }
    const id = await store.finish()
    if (id) nav(`/summary/${id}`, { replace: true })
  }

  const discard = async () => {
    const ok = await confirm({ title: '放弃这次训练？', message: '本次训练的所有数据都不会保存。', confirmText: '放弃', danger: true })
    if (ok) {
      store.discard()
      nav('/', { replace: true })
    }
  }

  return (
    <div className="pb-48">
      <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 px-2">
          <IconButton label="收起" onClick={() => nav('/')}>
            <ChevronDown className="size-6" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <button className="flex max-w-full items-center gap-1 text-left" onClick={() => setRenaming(true)}>
              <span className="truncate text-[15px] font-bold">{w.name}</span>
              <Pencil className="size-3 shrink-0 text-ink-3" />
            </button>
            <div className="num flex items-center gap-1 text-sm font-semibold text-accent-text">
              <Timer className="size-3.5" />
              {fmtClock((now - w.startedAt) / 1000)}
            </div>
          </div>
          <Button size="sm" onClick={finish} className="h-10 px-5">
            完成
          </Button>
        </div>
        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-accent transition-[width] duration-500"
            style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      </header>

      <div className="num px-5 pt-3 text-xs text-ink-3">
        已完成 {progress.done} / {progress.total} 组 · {w.exercises.length} 个动作
      </div>

      <div className="space-y-3 px-3 pt-3">
        {w.exercises.map((we, i) => (
          <ExerciseBlock
            key={we.uid}
            we={we}
            ex={byId.get(we.exerciseId)}
            index={i}
            count={w.exercises.length}
            last={lastSetsFor(we.exerciseId, history)}
            onReplace={() => setPicker({ mode: 'replace', exUid: we.uid })}
          />
        ))}

        <button
          onClick={() => setPicker({ mode: 'add' })}
          className="pressable flex h-16 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-surface-3 font-semibold text-ink-2"
        >
          <Plus className="size-5" /> 添加动作
        </button>

        <NoteBox value={w.note ?? ''} onChange={store.setNote} />

        <div className="flex justify-center pt-2">
          <button onClick={discard} className="px-4 py-2 text-sm font-medium text-danger">
            放弃本次训练
          </button>
        </div>
      </div>

      <RestBar />

      <ExercisePicker
        open={!!picker}
        multiple={picker?.mode === 'add'}
        title={picker?.mode === 'replace' ? '替换动作' : '添加动作'}
        exclude={w.exercises.map((e) => e.exerciseId)}
        onClose={() => setPicker(null)}
        onPick={(ids) => {
          if (picker?.mode === 'replace') store.replaceExercise(picker.exUid, ids[0])
          else store.addExercises(ids, byId)
        }}
      />

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="训练名称">
        <div className="px-5 pb-6">
          <input
            defaultValue={w.name}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && setRenaming(false)}
            onChange={(e) => store.rename(e.target.value)}
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[15px] outline-none"
          />
          <Button block className="mt-4" onClick={() => setRenaming(false)}>
            完成
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

function NoteBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(!!value)
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-ink-3">
        <NotebookPen className="size-4" /> 添加训练备注
      </button>
    )
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      autoFocus={!value}
      placeholder="今天的状态、感受、需要注意的地方…"
      className="w-full rounded-3xl bg-surface p-4 text-sm outline-none placeholder:text-ink-3"
    />
  )
}

function ExerciseBlock({
  we,
  ex,
  index,
  count,
  last,
  onReplace,
}: {
  we: WorkoutExercise
  ex?: Exercise
  index: number
  count: number
  last: WorkoutSet[] | null
  onReplace: () => void
}) {
  const nav = useNavigate()
  const store = useWorkout()
  const { unit } = useSettings()
  const [menu, setMenu] = useState(false)
  const [setMenuFor, setSetMenuFor] = useState<WorkoutSet | null>(null)
  const t = ex?.tracking ?? 'weight'
  const doneCount = we.sets.filter((s) => s.done).length
  const allDone = doneCount === we.sets.length && we.sets.length > 0

  let normalIdx = 0
  const cols =
    t === 'weight'
      ? ['重量', '次数']
      : t === 'reps'
        ? ['负重', '次数']
        : t === 'time'
          ? ['时长(秒)']
          : ['时长(分)', '距离(km)']

  return (
    <section className={cx('overflow-hidden rounded-3xl bg-surface transition-opacity', allDone && 'opacity-80')}>
      <div className="flex items-center gap-3 p-3 pb-2">
        <button onClick={() => ex && nav(`/exercises/${encodeURIComponent(ex.id)}`)} className="shrink-0">
          {ex ? <ExerciseThumb ex={ex} className="size-12 rounded-xl" /> : <div className="size-12 rounded-xl bg-surface-2" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[16px] font-bold">{ex?.zh ?? '…'}</span>
            {allDone && <Check className="size-4 shrink-0 text-accent-text" strokeWidth={3} />}
          </div>
          <div className="num mt-0.5 flex items-center gap-2 text-xs text-ink-3">
            <span>
              {doneCount}/{we.sets.length} 组
            </span>
            <span className="flex items-center gap-0.5">
              <Timer className="size-3" /> 休息 {we.restSec}s
            </span>
          </div>
        </div>
        <IconButton label="动作操作" onClick={() => setMenu(true)}>
          <Ellipsis className="size-5" />
        </IconButton>
      </div>

      <div className="px-2 pb-2">
        <div className="grid grid-cols-[40px_1fr_72px_64px_44px] items-center gap-1.5 px-1 pb-1 text-[11px] font-medium text-ink-3">
          <span className="text-center">组</span>
          <span>上次</span>
          {cols.length === 1 ? (
            <span className="col-span-2 text-center">{cols[0]}</span>
          ) : (
            cols.map((c) => (
              <span key={c} className="text-center">
                {c}
              </span>
            ))
          )}
          <span className="text-center">✓</span>
        </div>
        {we.sets.map((s, i) => {
          const meta = SET_TYPE_META[s.type]
          const label = s.type === 'normal' ? String(++normalIdx) : meta.short
          const prev = last?.[i]
          return (
            <div
              key={s.id}
              className={cx(
                'grid grid-cols-[40px_1fr_72px_64px_44px] items-center gap-1.5 rounded-2xl px-1 py-1 transition-colors',
                s.done && 'bg-accent-soft',
              )}
            >
              <button
                onClick={() => setSetMenuFor(s)}
                className={cx('num mx-auto grid h-8 w-8 place-items-center rounded-lg text-sm font-bold', meta.cls)}
                aria-label={`第 ${i + 1} 组，${meta.label}`}
              >
                {label}
              </button>
              <button
                className="num truncate text-left text-xs text-ink-3"
                onClick={() =>
                  prev &&
                  store.updateSet(we.uid, s.id, { weight: prev.weight, reps: prev.reps, duration: prev.duration, distance: prev.distance })
                }
              >
                {prev ? fmtSet(prev, unit) : '—'}
              </button>
              {t === 'weight' || t === 'reps' ? (
                <>
                  <NumInput
                    value={s.weight}
                    placeholder={t === 'reps' ? '+0' : prev?.weight?.toString() ?? unit}
                    onChange={(v) => store.updateSet(we.uid, s.id, { weight: v })}
                    done={s.done}
                  />
                  <NumInput
                    value={s.reps}
                    placeholder={prev?.reps?.toString() ?? '次'}
                    integer
                    onChange={(v) => store.updateSet(we.uid, s.id, { reps: v })}
                    done={s.done}
                  />
                </>
              ) : t === 'time' ? (
                <div className="col-span-2">
                  <NumInput
                    value={s.duration}
                    placeholder={prev?.duration?.toString() ?? '秒'}
                    integer
                    onChange={(v) => store.updateSet(we.uid, s.id, { duration: v })}
                    done={s.done}
                  />
                </div>
              ) : (
                <>
                  <NumInput
                    value={s.duration !== undefined ? Math.round((s.duration / 60) * 10) / 10 : undefined}
                    placeholder={prev?.duration ? String(Math.round(prev.duration / 60)) : '分'}
                    onChange={(v) => store.updateSet(we.uid, s.id, { duration: v === undefined ? undefined : Math.round(v * 60) })}
                    done={s.done}
                  />
                  <NumInput
                    value={s.distance}
                    placeholder={prev?.distance?.toString() ?? 'km'}
                    onChange={(v) => store.updateSet(we.uid, s.id, { distance: v })}
                    done={s.done}
                  />
                </>
              )}
              <button
                aria-label={s.done ? '取消完成' : '完成这一组'}
                onClick={() => {
                  // 若未填写，则用占位（上次）数据补全
                  if (!s.done) {
                    const patch: Partial<WorkoutSet> = {}
                    if ((t === 'weight' || t === 'reps') && s.reps === undefined) patch.reps = prev?.reps
                    if (t === 'weight' && s.weight === undefined) patch.weight = prev?.weight
                    if ((t === 'time' || t === 'cardio') && s.duration === undefined) patch.duration = prev?.duration
                    if (t === 'cardio' && s.distance === undefined) patch.distance = prev?.distance
                    const missing =
                      (t === 'weight' || t === 'reps' ? (s.reps ?? patch.reps) === undefined : false) ||
                      (t === 'time' || t === 'cardio' ? (s.duration ?? patch.duration) === undefined : false)
                    if (missing) {
                      toast(t === 'time' || t === 'cardio' ? '先填写时长哦' : '先填写次数哦')
                      return
                    }
                    if (Object.keys(patch).length) store.updateSet(we.uid, s.id, patch)
                    vibrate(15)
                  }
                  store.toggleDone(we.uid, s.id)
                }}
                className={cx(
                  'pressable mx-auto grid size-9 place-items-center rounded-xl transition-colors',
                  s.done ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-3',
                )}
              >
                <Check className={cx('size-5', s.done && 'animate-pop')} strokeWidth={3} />
              </button>
            </div>
          )
        })}
        <button
          onClick={() => store.addSet(we.uid)}
          className="pressable mt-1 flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-sm font-semibold text-ink-2"
        >
          <Plus className="size-4" /> 添加一组
        </button>
      </div>

      {/* 动作菜单 */}
      <Sheet open={menu} onClose={() => setMenu(false)} title={ex?.zh}>
        <div className="space-y-4 px-4 pb-6">
          <div>
            <div className="mb-2 px-1 text-xs font-semibold text-ink-3">组间休息</div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 30, 45, 60, 90, 120, 180, 240].map((r) => (
                <button
                  key={r}
                  onClick={() => store.setExerciseRest(we.uid, r)}
                  className={cx(
                    'num h-9 rounded-full px-3.5 text-sm font-semibold',
                    we.restSec === r ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2',
                  )}
                >
                  {r === 0 ? '关闭' : `${r}s`}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MenuBtn icon={<Info className="size-4" />} onClick={() => ex && nav(`/exercises/${encodeURIComponent(ex.id)}`)}>
              动作说明
            </MenuBtn>
            <MenuBtn
              icon={<Replace className="size-4" />}
              onClick={() => {
                setMenu(false)
                onReplace()
              }}
            >
              替换动作
            </MenuBtn>
            <MenuBtn icon={<ArrowUp className="size-4" />} disabled={index === 0} onClick={() => store.moveExercise(we.uid, -1)}>
              上移
            </MenuBtn>
            <MenuBtn icon={<ArrowDown className="size-4" />} disabled={index === count - 1} onClick={() => store.moveExercise(we.uid, 1)}>
              下移
            </MenuBtn>
          </div>
          <Button
            variant="danger"
            block
            onClick={async () => {
              setMenu(false)
              if (!we.sets.some((s) => s.done) || (await confirm({ title: '删除这个动作？', message: '已完成的组也会一并删除', danger: true, confirmText: '删除' })))
                store.removeExercise(we.uid)
            }}
          >
            <Trash2 className="size-4" /> 删除动作
          </Button>
        </div>
      </Sheet>

      {/* 组类型菜单 */}
      <Sheet open={!!setMenuFor} onClose={() => setSetMenuFor(null)} title="这一组是…">
        <div className="space-y-2 px-4 pb-6">
          {(Object.keys(SET_TYPE_META) as SetType[]).map((k) => (
            <button
              key={k}
              onClick={() => {
                if (setMenuFor) store.updateSet(we.uid, setMenuFor.id, { type: k })
                setSetMenuFor(null)
              }}
              className={cx(
                'pressable flex w-full items-center gap-3 rounded-2xl p-3 text-left',
                setMenuFor?.type === k ? 'bg-accent-soft' : 'bg-surface-2',
              )}
            >
              <span className={cx('grid size-8 place-items-center rounded-lg text-sm font-bold', SET_TYPE_META[k].cls)}>
                {SET_TYPE_META[k].short || '1'}
              </span>
              <div className="flex-1">
                <div className="font-semibold">{SET_TYPE_META[k].label}</div>
                <div className="text-xs text-ink-3">
                  {k === 'normal' && '计入训练容量和个人记录'}
                  {k === 'warmup' && '轻重量热身，不计入容量和记录'}
                  {k === 'drop' && '力竭后立即降低重量继续'}
                  {k === 'failure' && '做到无法再完成一次'}
                </div>
              </div>
              {setMenuFor?.type === k && <Check className="size-5 text-accent-text" />}
            </button>
          ))}
          <Button
            variant="danger"
            block
            className="mt-2"
            onClick={() => {
              if (setMenuFor) store.removeSet(we.uid, setMenuFor.id)
              setSetMenuFor(null)
            }}
          >
            <Trash2 className="size-4" /> 删除这一组
          </Button>
        </div>
      </Sheet>
    </section>
  )
}

function MenuBtn({ icon, children, onClick, disabled }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="pressable flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-2 text-sm font-semibold disabled:opacity-40"
    >
      {icon}
      {children}
    </button>
  )
}

function NumInput({
  value,
  onChange,
  placeholder,
  integer,
  done,
}: {
  value?: number
  onChange: (v: number | undefined) => void
  placeholder?: string
  integer?: boolean
  done?: boolean
}) {
  const [text, setText] = useState(value?.toString() ?? '')
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value?.toString() ?? '')
  }, [value])
  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      placeholder={placeholder}
      onFocus={(e) => {
        focused.current = true
        e.target.select()
      }}
      onBlur={() => {
        focused.current = false
        setText(value?.toString() ?? '')
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '')
        setText(raw)
        if (raw === '') return onChange(undefined)
        const n = integer ? parseInt(raw, 10) : parseFloat(raw)
        if (!Number.isNaN(n)) onChange(n)
      }}
      className={cx(
        'num h-10 w-full min-w-0 rounded-xl text-center text-[16px] font-bold outline-none transition-colors placeholder:font-medium placeholder:text-ink-3/70 focus:ring-2 focus:ring-accent',
        done ? 'bg-transparent' : 'bg-surface-2',
      )}
    />
  )
}

/** 组间休息倒计时 */
function RestBar() {
  const rest = useWorkout((s) => s.rest)
  const { adjustRest, stopRest } = useWorkout()
  const { vibrate: vib, sound } = useSettings()
  const now = useNow(250, !!rest)
  const left = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0
  const firedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!rest || left > 0 || firedFor.current === rest.endsAt) return
    firedFor.current = rest.endsAt
    if (vib) vibrate([200, 100, 200])
    if (sound) beep()
    toast('休息结束，开始下一组！')
    stopRest()
  }, [rest, left, vib, sound, stopRest])

  if (!rest) return null
  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg animate-sheet-in px-3">
      <div className="mb-3 flex items-center gap-3 rounded-[28px] border border-line bg-surface/95 p-3 shadow-card backdrop-blur-xl">
        <Ring value={left / rest.total} size={60} stroke={5}>
          <Timer className="size-5 text-accent-text" />
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-3">组间休息</div>
          <div className="num text-3xl font-extrabold leading-tight tracking-tight">{fmtClock(Math.ceil(left))}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => adjustRest(-15)} className="pressable num h-10 rounded-xl bg-surface-2 px-2.5 text-sm font-semibold">
            -15
          </button>
          <button onClick={() => adjustRest(15)} className="pressable num h-10 rounded-xl bg-surface-2 px-2.5 text-sm font-semibold">
            +15
          </button>
          <button
            onClick={stopRest}
            aria-label="跳过休息"
            className="pressable grid size-10 place-items-center rounded-xl bg-accent text-accent-ink"
          >
            <SkipForward className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
