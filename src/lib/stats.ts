import type { Exercise, Muscle, Workout, WorkoutSet } from './types'

export const isWorkingSet = (s: WorkoutSet) => s.done && s.type !== 'warmup'

export const setVolume = (s: WorkoutSet) => (isWorkingSet(s) ? (s.weight ?? 0) * (s.reps ?? 0) : 0)

/** Epley 公式估算 1RM */
export const e1rm = (weight = 0, reps = 0) => (reps <= 0 || weight <= 0 ? 0 : reps === 1 ? weight : weight * (1 + Math.min(reps, 12) / 30))

export function workoutDuration(w: Workout) {
  return Math.max(0, ((w.endedAt ?? Date.now()) - w.startedAt) / 1000)
}

export function workoutStats(w: Workout) {
  let volume = 0
  let sets = 0
  let reps = 0
  for (const ex of w.exercises)
    for (const s of ex.sets) {
      if (!isWorkingSet(s)) continue
      sets++
      reps += s.reps ?? 0
      volume += setVolume(s)
    }
  return {
    volume,
    sets,
    reps,
    exercises: w.exercises.filter((e) => e.sets.some((s) => s.done)).length,
    duration: workoutDuration(w),
  }
}

/** 每块肌肉完成的有效组数（主要肌群计 1，次要肌群计 0.5） */
export function muscleLoad(workouts: Workout[], byId: Map<string, Exercise>) {
  const load: Partial<Record<Muscle, number>> = {}
  for (const w of workouts)
    for (const ex of w.exercises) {
      const e = byId.get(ex.exerciseId)
      if (!e) continue
      const n = ex.sets.filter(isWorkingSet).length
      if (!n) continue
      for (const m of e.primary) load[m] = (load[m] ?? 0) + n
      for (const m of e.secondary) load[m] = (load[m] ?? 0) + n * 0.5
    }
  return load
}

export interface ExerciseBest {
  maxWeight: number
  maxE1rm: number
  maxReps: number
  maxDuration: number
  maxVolume: number // 单组
}

export function bestOfSets(sets: WorkoutSet[]): ExerciseBest {
  const b: ExerciseBest = { maxWeight: 0, maxE1rm: 0, maxReps: 0, maxDuration: 0, maxVolume: 0 }
  for (const s of sets) {
    if (!isWorkingSet(s)) continue
    b.maxWeight = Math.max(b.maxWeight, s.weight ?? 0)
    b.maxE1rm = Math.max(b.maxE1rm, e1rm(s.weight, s.reps))
    b.maxReps = Math.max(b.maxReps, s.reps ?? 0)
    b.maxDuration = Math.max(b.maxDuration, s.duration ?? 0)
    b.maxVolume = Math.max(b.maxVolume, setVolume(s))
  }
  return b
}

export function bestByExercise(workouts: Workout[]) {
  const map = new Map<string, ExerciseBest>()
  for (const w of workouts)
    for (const ex of w.exercises) {
      const b = bestOfSets(ex.sets)
      const prev = map.get(ex.exerciseId)
      map.set(
        ex.exerciseId,
        prev
          ? {
              maxWeight: Math.max(prev.maxWeight, b.maxWeight),
              maxE1rm: Math.max(prev.maxE1rm, b.maxE1rm),
              maxReps: Math.max(prev.maxReps, b.maxReps),
              maxDuration: Math.max(prev.maxDuration, b.maxDuration),
              maxVolume: Math.max(prev.maxVolume, b.maxVolume),
            }
          : b,
      )
    }
  return map
}

export interface PR {
  exerciseId: string
  kind: 'weight' | 'e1rm' | 'reps' | 'duration'
  value: number
  prev: number
}

/** 与历史对比，找出本次训练打破的个人记录 */
export function detectPRs(workout: Workout, history: Workout[], byId: Map<string, Exercise>): PR[] {
  const before = bestByExercise(history.filter((w) => w.id !== workout.id && w.startedAt < workout.startedAt))
  const prs: PR[] = []
  for (const ex of workout.exercises) {
    const prev = before.get(ex.exerciseId)
    if (!prev) continue // 第一次做这个动作不算 PR
    const cur = bestOfSets(ex.sets)
    const t = byId.get(ex.exerciseId)?.tracking ?? 'weight'
    if (t === 'weight') {
      if (cur.maxWeight > prev.maxWeight) prs.push({ exerciseId: ex.exerciseId, kind: 'weight', value: cur.maxWeight, prev: prev.maxWeight })
      else if (cur.maxE1rm > prev.maxE1rm + 0.01) prs.push({ exerciseId: ex.exerciseId, kind: 'e1rm', value: cur.maxE1rm, prev: prev.maxE1rm })
    } else if (t === 'reps') {
      if (cur.maxReps > prev.maxReps) prs.push({ exerciseId: ex.exerciseId, kind: 'reps', value: cur.maxReps, prev: prev.maxReps })
    } else if (cur.maxDuration > prev.maxDuration) {
      prs.push({ exerciseId: ex.exerciseId, kind: 'duration', value: cur.maxDuration, prev: prev.maxDuration })
    }
  }
  return prs
}

/** 找到某个动作最近一次的完成组，用于「上次」提示和自动填充 */
export function lastSetsFor(exerciseId: string, history: Workout[]) {
  const sorted = [...history].sort((a, b) => b.startedAt - a.startedAt)
  for (const w of sorted) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done))
    if (ex) {
      const working = ex.sets.filter(isWorkingSet)
      return working.length ? working : ex.sets.filter((s) => s.done)
    }
  }
  return null
}
