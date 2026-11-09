import type { Category, Equipment, Muscle, Tracking } from './types'

export const MUSCLE_ZH: Record<Muscle, string> = {
  abdominals: '腹肌',
  abductors: '髋外展肌',
  adductors: '内收肌',
  biceps: '肱二头肌',
  calves: '小腿',
  chest: '胸肌',
  forearms: '前臂',
  glutes: '臀肌',
  hamstrings: '腘绳肌',
  lats: '背阔肌',
  'lower back': '下背',
  'middle back': '中背',
  neck: '颈部',
  quadriceps: '股四头肌',
  shoulders: '三角肌',
  traps: '斜方肌',
  triceps: '肱三头肌',
}

export const EQUIPMENT_ZH: Record<Equipment, string> = {
  barbell: '杠铃',
  dumbbell: '哑铃',
  cable: '绳索',
  machine: '器械',
  'body only': '徒手',
  kettlebells: '壶铃',
  bands: '弹力带',
  'e-z curl bar': '曲杆',
  'medicine ball': '药球',
  'exercise ball': '瑞士球',
  'foam roll': '泡沫轴',
  other: '其他',
}

export const EQUIPMENT_ORDER: Equipment[] = [
  'barbell', 'dumbbell', 'machine', 'cable', 'body only', 'kettlebells', 'e-z curl bar', 'bands',
  'medicine ball', 'exercise ball', 'foam roll', 'other',
]

export const CATEGORY_ZH: Record<Category, string> = {
  strength: '力量',
  stretching: '拉伸',
  plyometrics: '增强式',
  powerlifting: '力量举',
  'olympic weightlifting': '举重',
  strongman: '大力士',
  cardio: '有氧',
}

export const LEVEL_ZH = { beginner: '入门', intermediate: '进阶', expert: '高阶' } as const

export const TRACKING_ZH: Record<Tracking, string> = {
  weight: '重量 × 次数',
  reps: '自重次数',
  time: '计时',
  cardio: '时长 + 距离',
}

export type BodyPart = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core' | 'cardio'

export const BODY_PARTS: { key: BodyPart; zh: string; muscles: Muscle[]; color: string }[] = [
  { key: 'chest', zh: '胸部', muscles: ['chest'], color: '#ff6b6b' },
  { key: 'back', zh: '背部', muscles: ['lats', 'middle back', 'lower back', 'traps'], color: '#4dabf7' },
  { key: 'shoulders', zh: '肩部', muscles: ['shoulders', 'neck'], color: '#ffa94d' },
  { key: 'arms', zh: '手臂', muscles: ['biceps', 'triceps', 'forearms'], color: '#b197fc' },
  { key: 'legs', zh: '腿部', muscles: ['quadriceps', 'hamstrings', 'calves', 'adductors', 'abductors'], color: '#69db7c' },
  { key: 'glutes', zh: '臀部', muscles: ['glutes'], color: '#f783ac' },
  { key: 'core', zh: '核心', muscles: ['abdominals'], color: '#ffd43b' },
  { key: 'cardio', zh: '有氧', muscles: [], color: '#38d9a9' },
]

export const MUSCLE_TO_PART: Record<Muscle, BodyPart> = Object.fromEntries(
  BODY_PARTS.flatMap((p) => p.muscles.map((m) => [m, p.key])),
) as Record<Muscle, BodyPart>

export const PLAN_COLORS = ['#c6f432', '#4dabf7', '#ff6b6b', '#ffa94d', '#b197fc', '#38d9a9', '#f783ac', '#ffd43b']

const IMG_CDN = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'
const IMG_RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
export const imageUrl = (path: string, mirror = 0) => (mirror ? IMG_RAW : IMG_CDN) + path
