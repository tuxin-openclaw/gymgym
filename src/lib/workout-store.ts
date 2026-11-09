import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from './db'
import type { Exercise, Plan, SetType, Workout, WorkoutExercise, WorkoutSet } from './types'
import { uid } from './utils'
import { lastSetsFor } from './stats'
import { useSettings } from './settings'

interface Rest {
  endsAt: number
  total: number
  exUid: string
}

interface WorkoutState {
  workout: Workout | null
  rest: Rest | null
  start: (opts: { plan?: Plan; name?: string; exercises?: { exerciseId: string; sets?: Partial<WorkoutSet>[]; restSec?: number }[] }, byId: Map<string, Exercise>) => Promise<void>
  rename: (name: string) => void
  setNote: (note: string) => void
  addExercises: (ids: string[], byId: Map<string, Exercise>) => Promise<void>
  removeExercise: (exUid: string) => void
  moveExercise: (exUid: string, dir: -1 | 1) => void
  replaceExercise: (exUid: string, exerciseId: string) => void
  setExerciseRest: (exUid: string, sec: number) => void
  addSet: (exUid: string) => void
  removeSet: (exUid: string, setId: string) => void
  updateSet: (exUid: string, setId: string, patch: Partial<WorkoutSet>) => void
  cycleSetType: (exUid: string, setId: string) => void
  toggleDone: (exUid: string, setId: string) => void
  startRest: (sec: number, exUid: string) => void
  adjustRest: (delta: number) => void
  stopRest: () => void
  finish: () => Promise<string | null>
  discard: () => void
}

const TYPE_CYCLE: SetType[] = ['normal', 'warmup', 'drop', 'failure']

async function recentHistory() {
  return db.workouts.orderBy('startedAt').reverse().limit(60).toArray()
}

function buildSets(target: Partial<WorkoutSet>[] | undefined, last: WorkoutSet[] | null, count: number): WorkoutSet[] {
  const n = target?.length ?? last?.length ?? count
  return Array.from({ length: Math.max(1, n) }, (_, i) => {
    const t = target?.[i]
    const l = last?.[Math.min(i, (last?.length ?? 1) - 1)]
    return {
      id: uid(),
      type: t?.type ?? 'normal',
      weight: t?.weight ?? l?.weight,
      reps: t?.reps ?? l?.reps,
      duration: t?.duration ?? l?.duration,
      distance: t?.distance ?? l?.distance,
      done: false,
    }
  })
}

const mapEx = (w: Workout, exUid: string, fn: (e: WorkoutExercise) => WorkoutExercise): Workout => ({
  ...w,
  exercises: w.exercises.map((e) => (e.uid === exUid ? fn(e) : e)),
})

export const useWorkout = create<WorkoutState>()(
  persist(
    (set, get) => ({
      workout: null,
      rest: null,

      async start(opts, byId) {
        const history = await recentHistory()
        const defaultRest = useSettings.getState().defaultRest
        const items =
          opts.plan?.exercises.map((pe) => ({
            exerciseId: pe.exerciseId,
            restSec: pe.restSec,
            sets: Array.from({ length: pe.sets }, () => ({
              reps: byId.get(pe.exerciseId)?.tracking === 'time' || byId.get(pe.exerciseId)?.tracking === 'cardio' ? undefined : pe.reps,
              weight: pe.weight,
              duration: pe.duration,
            })),
          })) ?? opts.exercises ?? []
        const exercises: WorkoutExercise[] = items.map((it) => {
          const last = lastSetsFor(it.exerciseId, history)
          // 计划里没写重量时，用上次的重量自动填充
          const target = it.sets?.map((s, i) => ({
            ...s,
            weight: s.weight ?? last?.[Math.min(i, last.length - 1)]?.weight,
            duration: s.duration ?? last?.[Math.min(i, last.length - 1)]?.duration,
          }))
          return { uid: uid(), exerciseId: it.exerciseId, restSec: it.restSec ?? defaultRest, sets: buildSets(target, last, 3) }
        })
        const now = new Date()
        set({
          rest: null,
          workout: {
            id: uid(),
            name: opts.plan?.name ?? opts.name ?? `${now.getMonth() + 1}月${now.getDate()}日 训练`,
            planId: opts.plan?.id,
            color: opts.plan?.color,
            startedAt: Date.now(),
            exercises,
          },
        })
        if (opts.plan) db.plans.update(opts.plan.id, { lastUsedAt: Date.now() })
      },

      rename: (name) => set((s) => (s.workout ? { workout: { ...s.workout, name } } : s)),
      setNote: (note) => set((s) => (s.workout ? { workout: { ...s.workout, note } } : s)),

      async addExercises(ids) {
        const history = await recentHistory()
        const defaultRest = useSettings.getState().defaultRest
        set((s) => {
          if (!s.workout) return s
          const added = ids.map<WorkoutExercise>((id) => ({
            uid: uid(),
            exerciseId: id,
            restSec: defaultRest,
            sets: buildSets(undefined, lastSetsFor(id, history), 3),
          }))
          return { workout: { ...s.workout, exercises: [...s.workout.exercises, ...added] } }
        })
      },

      removeExercise: (exUid) =>
        set((s) => (s.workout ? { workout: { ...s.workout, exercises: s.workout.exercises.filter((e) => e.uid !== exUid) } } : s)),

      moveExercise: (exUid, dir) =>
        set((s) => {
          if (!s.workout) return s
          const list = [...s.workout.exercises]
          const i = list.findIndex((e) => e.uid === exUid)
          const j = i + dir
          if (i < 0 || j < 0 || j >= list.length) return s
          ;[list[i], list[j]] = [list[j], list[i]]
          return { workout: { ...s.workout, exercises: list } }
        }),

      replaceExercise: (exUid, exerciseId) =>
        set((s) => (s.workout ? { workout: mapEx(s.workout, exUid, (e) => ({ ...e, exerciseId })) } : s)),

      setExerciseRest: (exUid, sec) =>
        set((s) => (s.workout ? { workout: mapEx(s.workout, exUid, (e) => ({ ...e, restSec: sec })) } : s)),

      addSet: (exUid) =>
        set((s) => {
          if (!s.workout) return s
          return {
            workout: mapEx(s.workout, exUid, (e) => {
              const prev = e.sets[e.sets.length - 1]
              return {
                ...e,
                sets: [
                  ...e.sets,
                  { id: uid(), type: 'normal', weight: prev?.weight, reps: prev?.reps, duration: prev?.duration, distance: prev?.distance, done: false },
                ],
              }
            }),
          }
        }),

      removeSet: (exUid, setId) =>
        set((s) => (s.workout ? { workout: mapEx(s.workout, exUid, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) })) } : s)),

      updateSet: (exUid, setId, patch) =>
        set((s) =>
          s.workout
            ? { workout: mapEx(s.workout, exUid, (e) => ({ ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)) })) }
            : s,
        ),

      cycleSetType: (exUid, setId) =>
        set((s) =>
          s.workout
            ? {
                workout: mapEx(s.workout, exUid, (e) => ({
                  ...e,
                  sets: e.sets.map((x) =>
                    x.id === setId ? { ...x, type: TYPE_CYCLE[(TYPE_CYCLE.indexOf(x.type) + 1) % TYPE_CYCLE.length] } : x,
                  ),
                })),
              }
            : s,
        ),

      toggleDone(exUid, setId) {
        const w = get().workout
        if (!w) return
        const ex = w.exercises.find((e) => e.uid === exUid)
        const st = ex?.sets.find((x) => x.id === setId)
        if (!ex || !st) return
        const done = !st.done
        get().updateSet(exUid, setId, { done, doneAt: done ? Date.now() : undefined })
        if (done && ex.restSec > 0) get().startRest(ex.restSec, exUid)
        if (!done && get().rest?.exUid === exUid) get().stopRest()
      },

      startRest: (sec, exUid) => set({ rest: { endsAt: Date.now() + sec * 1000, total: sec, exUid } }),
      adjustRest: (delta) =>
        set((s) => {
          if (!s.rest) return s
          const endsAt = Math.max(Date.now() + 1000, s.rest.endsAt + delta * 1000)
          return { rest: { ...s.rest, endsAt, total: Math.max(s.rest.total + delta, 1) } }
        }),
      stopRest: () => set({ rest: null }),

      async finish() {
        const w = get().workout
        if (!w) return null
        // 只保留完成了的组；没有任何完成组的动作被丢弃
        const exercises = w.exercises
          .map((e) => ({ ...e, sets: e.sets.filter((x) => x.done) }))
          .filter((e) => e.sets.length > 0)
        const saved: Workout = { ...w, exercises, endedAt: Date.now() }
        await db.workouts.put(saved)
        set({ workout: null, rest: null })
        return saved.id
      },

      discard: () => set({ workout: null, rest: null }),
    }),
    { name: 'gymgym-active-workout' },
  ),
)
