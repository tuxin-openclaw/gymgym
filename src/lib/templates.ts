import type { Plan } from './types'
import { uid } from './utils'

type Row = [exerciseId: string, sets: number, reps: number, restSec?: number, duration?: number]

interface TemplatePlan {
  name: string
  color: string
  days: number[]
  rows: Row[]
}

export interface Template {
  id: string
  name: string
  desc: string
  level: '新手' | '进阶' | '通用'
  perWeek: number
  tag: string
  plans: TemplatePlan[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'fullbody',
    name: '新手全身训练',
    desc: '每次练全身大肌群，A/B 交替，最适合刚开始健身的你。',
    level: '新手',
    perWeek: 3,
    tag: '全身',
    plans: [
      {
        name: '全身 A',
        color: '#c6f432',
        days: [1, 5],
        rows: [
          ['Barbell_Squat', 3, 8, 120],
          ['Barbell_Bench_Press_-_Medium_Grip', 3, 8, 120],
          ['Bent_Over_Barbell_Row', 3, 10, 90],
          ['Dumbbell_Shoulder_Press', 3, 10, 90],
          ['Plank', 3, 0, 60, 45],
        ],
      },
      {
        name: '全身 B',
        color: '#4dabf7',
        days: [3],
        rows: [
          ['Romanian_Deadlift', 3, 8, 120],
          ['Incline_Dumbbell_Press', 3, 10, 90],
          ['Wide-Grip_Lat_Pulldown', 3, 10, 90],
          ['Dumbbell_Lunges', 3, 10, 90],
          ['Crunches', 3, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: '推 / 拉 / 腿',
    desc: '经典三分化：推（胸肩三头）、拉（背二头）、腿（下肢）。',
    level: '进阶',
    perWeek: 3,
    tag: '分化',
    plans: [
      {
        name: '推日 · 胸肩三头',
        color: '#ff6b6b',
        days: [1],
        rows: [
          ['Barbell_Bench_Press_-_Medium_Grip', 4, 8, 120],
          ['Incline_Dumbbell_Press', 3, 10, 90],
          ['Dumbbell_Shoulder_Press', 3, 10, 90],
          ['Side_Lateral_Raise', 3, 15, 60],
          ['Cable_Crossover', 3, 12, 60],
          ['Triceps_Pushdown_-_Rope_Attachment', 3, 12, 60],
        ],
      },
      {
        name: '拉日 · 背二头',
        color: '#4dabf7',
        days: [3],
        rows: [
          ['Pullups', 4, 8, 120],
          ['Bent_Over_Barbell_Row', 4, 8, 120],
          ['Seated_Cable_Rows', 3, 10, 90],
          ['Face_Pull', 3, 15, 60],
          ['Barbell_Curl', 3, 10, 60],
          ['Hammer_Curls', 3, 12, 60],
        ],
      },
      {
        name: '腿日 · 下肢',
        color: '#69db7c',
        days: [5],
        rows: [
          ['Barbell_Squat', 4, 8, 150],
          ['Romanian_Deadlift', 3, 10, 120],
          ['Leg_Press', 3, 12, 90],
          ['Lying_Leg_Curls', 3, 12, 60],
          ['Standing_Calf_Raises', 4, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'upperlower',
    name: '上下肢分化',
    desc: '一周四练，上肢 / 下肢轮换，兼顾力量与围度。',
    level: '进阶',
    perWeek: 4,
    tag: '分化',
    plans: [
      {
        name: '上肢日',
        color: '#ffa94d',
        days: [1, 4],
        rows: [
          ['Barbell_Bench_Press_-_Medium_Grip', 4, 6, 150],
          ['Bent_Over_Barbell_Row', 4, 8, 120],
          ['Dumbbell_Shoulder_Press', 3, 10, 90],
          ['Wide-Grip_Lat_Pulldown', 3, 10, 90],
          ['EZ-Bar_Curl', 3, 12, 60],
          ['EZ-Bar_Skullcrusher', 3, 12, 60],
        ],
      },
      {
        name: '下肢日',
        color: '#b197fc',
        days: [2, 5],
        rows: [
          ['Barbell_Squat', 4, 6, 150],
          ['Barbell_Hip_Thrust', 3, 10, 120],
          ['Split_Squat_with_Dumbbells', 3, 10, 90],
          ['Seated_Leg_Curl', 3, 12, 60],
          ['Seated_Calf_Raise', 4, 15, 60],
          ['Hanging_Leg_Raise', 3, 12, 60],
        ],
      },
    ],
  },
  {
    id: 'home',
    name: '居家徒手',
    desc: '不需要任何器械，在家就能完成的全身燃脂训练。',
    level: '通用',
    perWeek: 3,
    tag: '徒手',
    plans: [
      {
        name: '居家徒手训练',
        color: '#38d9a9',
        days: [2, 4, 6],
        rows: [
          ['Bodyweight_Squat', 4, 20, 60],
          ['Pushups', 4, 12, 60],
          ['Bodyweight_Walking_Lunge', 3, 12, 60],
          ['Mountain_Climbers', 3, 30, 45],
          ['Plank', 3, 0, 45, 60],
          ['Russian_Twist', 3, 20, 45],
        ],
      },
    ],
  },
  {
    id: 'cardio',
    name: '有氧燃脂',
    desc: '中低强度有氧 + 核心，提升心肺、帮助减脂。',
    level: '通用',
    perWeek: 2,
    tag: '有氧',
    plans: [
      {
        name: '有氧 + 核心',
        color: '#ffd43b',
        days: [0, 3],
        rows: [
          ['Running_Treadmill', 1, 0, 60, 1200],
          ['Rowing_Stationary', 1, 0, 60, 600],
          ['Crunches', 3, 20, 45],
          ['Plank', 3, 0, 45, 60],
        ],
      },
    ],
  },
]

export function planFromTemplate(t: TemplatePlan): Plan {
  const now = Date.now()
  return {
    id: uid(),
    name: t.name,
    color: t.color,
    days: t.days,
    createdAt: now,
    updatedAt: now,
    exercises: t.rows.map(([exerciseId, sets, reps, restSec = 90, duration]) => ({
      uid: uid(),
      exerciseId,
      sets,
      reps,
      restSec,
      duration,
    })),
  }
}
