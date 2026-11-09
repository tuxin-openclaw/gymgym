export type Muscle =
  | 'abdominals' | 'abductors' | 'adductors' | 'biceps' | 'calves' | 'chest' | 'forearms' | 'glutes'
  | 'hamstrings' | 'lats' | 'lower back' | 'middle back' | 'neck' | 'quadriceps' | 'shoulders' | 'traps' | 'triceps'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'body only' | 'kettlebells' | 'bands' | 'e-z curl bar'
  | 'medicine ball' | 'exercise ball' | 'foam roll' | 'other'

export type Category =
  | 'strength' | 'stretching' | 'plyometrics' | 'powerlifting' | 'olympic weightlifting' | 'strongman' | 'cardio'

/** 记录方式：weight=重量×次数，reps=自重次数(可加负重)，time=计时，cardio=时长+距离 */
export type Tracking = 'weight' | 'reps' | 'time' | 'cardio'

export interface Exercise {
  id: string
  name: string
  zh: string
  primary: Muscle[]
  secondary: Muscle[]
  equipment: Equipment
  category: Category
  level: 'beginner' | 'intermediate' | 'expert'
  mechanic?: 'compound' | 'isolation'
  force?: 'push' | 'pull' | 'static'
  tracking: Tracking
  images: string[]
  instructions: string[]
  popular?: number
  custom?: boolean
  note?: string
}

export interface PlanExercise {
  uid: string
  exerciseId: string
  sets: number
  reps: number
  weight?: number
  duration?: number // 秒
  restSec: number
  note?: string
}

export interface Plan {
  id: string
  name: string
  note?: string
  color: string
  days: number[] // 0=周日 … 6=周六
  exercises: PlanExercise[]
  createdAt: number
  updatedAt: number
  lastUsedAt?: number
}

export type SetType = 'warmup' | 'normal' | 'drop' | 'failure'

export interface WorkoutSet {
  id: string
  type: SetType
  weight?: number
  reps?: number
  duration?: number // 秒
  distance?: number // km
  done: boolean
  doneAt?: number
}

export interface WorkoutExercise {
  uid: string
  exerciseId: string
  restSec: number
  note?: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  name: string
  planId?: string
  color?: string
  startedAt: number
  endedAt?: number
  note?: string
  feeling?: number // 1-5
  exercises: WorkoutExercise[]
}

export interface BodyWeight {
  id: string
  date: string // YYYY-MM-DD
  weight: number
}

export interface Settings {
  unit: 'kg' | 'lb'
  defaultRest: number
  theme: 'dark' | 'light' | 'system'
  weekStart: 0 | 1
  vibrate: boolean
  sound: boolean
  nickname: string
}
