import Dexie, { type EntityTable } from 'dexie'
import type { BodyWeight, Exercise, Plan, Workout } from './types'

export const db = new Dexie('gymgym') as Dexie & {
  plans: EntityTable<Plan, 'id'>
  workouts: EntityTable<Workout, 'id'>
  bodyweights: EntityTable<BodyWeight, 'id'>
  customExercises: EntityTable<Exercise, 'id'>
}

db.version(1).stores({
  plans: 'id, updatedAt, lastUsedAt',
  workouts: 'id, startedAt, planId',
  bodyweights: 'id, &date',
  customExercises: 'id, zh',
})

export async function exportAll() {
  const [plans, workouts, bodyweights, customExercises] = await Promise.all([
    db.plans.toArray(),
    db.workouts.toArray(),
    db.bodyweights.toArray(),
    db.customExercises.toArray(),
  ])
  return { app: 'gymgym', version: 1, exportedAt: new Date().toISOString(), plans, workouts, bodyweights, customExercises }
}

export async function importAll(data: Awaited<ReturnType<typeof exportAll>>) {
  if (data?.app !== 'gymgym') throw new Error('不是 GymGym 的备份文件')
  await db.transaction('rw', [db.plans, db.workouts, db.bodyweights, db.customExercises], async () => {
    await db.plans.bulkPut(data.plans ?? [])
    await db.workouts.bulkPut(data.workouts ?? [])
    await db.bodyweights.bulkPut(data.bodyweights ?? [])
    await db.customExercises.bulkPut(data.customExercises ?? [])
  })
}

export async function clearAll() {
  await Promise.all([db.plans.clear(), db.workouts.clear(), db.bodyweights.clear(), db.customExercises.clear()])
}
