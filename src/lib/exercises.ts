import { useEffect } from 'react'
import { create } from 'zustand'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Exercise } from './types'
import { EQUIPMENT_ZH, MUSCLE_ZH, BODY_PARTS, type BodyPart } from './catalog'

const EMPTY: Exercise[] = []

interface LibState {
  base: Exercise[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  load: () => Promise<void>
}

const useLib = create<LibState>((set, get) => ({
  base: [],
  status: 'idle',
  async load() {
    if (get().status === 'loading' || get().status === 'ready') return
    set({ status: 'loading' })
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'data/exercises.json')
      const base = (await res.json()) as Exercise[]
      set({ base, status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
}))

/** 动作库：内置开源动作 + 自定义动作 */
export function useExercises() {
  const { base, status, load } = useLib()
  const custom = useLiveQuery(() => db.customExercises.toArray(), [], EMPTY)
  useEffect(() => {
    load()
  }, [load])
  const { list, byId } = memoList(base, custom)
  return { list, byId, status, ready: status === 'ready' }
}

let memo: { base: Exercise[]; custom: Exercise[]; list: Exercise[]; byId: Map<string, Exercise> } | null = null
function memoList(base: Exercise[], custom: Exercise[]) {
  if (!memo || memo.base !== base || memo.custom !== custom) {
    const list = [...custom, ...base].sort(sortExercises)
    memo = { base, custom, list, byId: new Map(list.map((e) => [e.id, e])) }
  }
  return memo
}

const CAT_RANK: Record<string, number> = { strength: 0, powerlifting: 1, cardio: 2, plyometrics: 3, 'olympic weightlifting': 4, strongman: 5, stretching: 6 }
function sortExercises(a: Exercise, b: Exercise) {
  const pa = a.custom ? -1 : a.popular ?? 999
  const pb = b.custom ? -1 : b.popular ?? 999
  if (pa !== pb) return pa - pb
  const ca = CAT_RANK[a.category] ?? 9
  const cb = CAT_RANK[b.category] ?? 9
  if (ca !== cb) return ca - cb
  return a.zh.localeCompare(b.zh, 'zh-CN')
}

export function partOf(e: Exercise): BodyPart {
  if (e.category === 'cardio') return 'cardio'
  const m = e.primary[0]
  return BODY_PARTS.find((p) => p.muscles.includes(m))?.key ?? 'core'
}

export function matchesPart(e: Exercise, part: BodyPart) {
  if (part === 'cardio') return e.category === 'cardio'
  const muscles = BODY_PARTS.find((p) => p.key === part)!.muscles
  return e.category !== 'cardio' && e.primary.some((m) => muscles.includes(m))
}

export function matchesQuery(e: Exercise, q: string) {
  if (!q) return true
  const s = q.trim().toLowerCase()
  if (!s) return true
  return (
    e.zh.toLowerCase().includes(s) ||
    e.name.toLowerCase().includes(s) ||
    EQUIPMENT_ZH[e.equipment]?.includes(s) ||
    e.primary.some((m) => MUSCLE_ZH[m]?.includes(s))
  )
}

export function preloadExercises() {
  useLib.getState().load()
}
