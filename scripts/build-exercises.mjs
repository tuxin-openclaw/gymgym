// 将开源动作库 free-exercise-db (Unlicense) 处理成 App 使用的精简数据，并合并中文名称。
// 用法：node scripts/build-exercises.mjs
// 更新源数据：curl -o data-src/free-exercise-db.json https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = JSON.parse(readFileSync(join(root, 'data-src/free-exercise-db.json'), 'utf8'))
const zh = Object.fromEntries(
  readFileSync(join(root, 'scripts/zh-names.txt'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i), l.slice(i + 1)]
    }),
)

// 常用动作：在动作库中优先展示，并打上「常用」标签
const POPULAR = [
  'Barbell Bench Press - Medium Grip', 'Barbell Incline Bench Press - Medium Grip', 'Dumbbell Bench Press',
  'Incline Dumbbell Press', 'Dumbbell Flyes', 'Cable Crossover', 'Butterfly', 'Pushups', 'Dips - Chest Version',
  'Machine Bench Press', 'Decline Barbell Bench Press', 'Leverage Chest Press',
  'Pullups', 'Chin-Up', 'Wide-Grip Lat Pulldown', 'Close-Grip Front Lat Pulldown', 'Seated Cable Rows',
  'Bent Over Barbell Row', 'One-Arm Dumbbell Row', 'T-Bar Row with Handle', 'Straight-Arm Pulldown',
  'Barbell Deadlift', 'Romanian Deadlift', 'Hyperextensions (Back Extensions)', 'Face Pull', 'Barbell Shrug',
  'Dumbbell Shoulder Press', 'Barbell Shoulder Press', 'Standing Military Press', 'Side Lateral Raise',
  'Front Dumbbell Raise', 'Reverse Flyes', 'Arnold Dumbbell Press', 'Machine Shoulder (Military) Press',
  'Cable Seated Lateral Raise', 'Upright Barbell Row', 'Reverse Machine Flyes',
  'Barbell Curl', 'Dumbbell Bicep Curl', 'Hammer Curls', 'Preacher Curl', 'EZ-Bar Curl', 'Concentration Curls',
  'Incline Dumbbell Curl', 'Standing Biceps Cable Curl',
  'Triceps Pushdown', 'Triceps Pushdown - Rope Attachment', 'EZ-Bar Skullcrusher', 'Close-Grip Barbell Bench Press',
  'Cable Rope Overhead Triceps Extension', 'Tricep Dumbbell Kickback', 'Bench Dips', 'Dips - Triceps Version',
  'Barbell Squat', 'Front Barbell Squat', 'Leg Press', 'Hack Squat', 'Goblet Squat', 'Dumbbell Lunges',
  'Barbell Walking Lunge', 'Leg Extensions', 'Lying Leg Curls', 'Seated Leg Curl', 'Barbell Hip Thrust',
  'Barbell Glute Bridge', 'Standing Calf Raises', 'Seated Calf Raise', 'Smith Machine Squat', 'Sumo Deadlift',
  'Split Squat with Dumbbells', 'Thigh Abductor', 'Thigh Adductor', 'Stiff-Legged Dumbbell Deadlift',
  'Plank', 'Crunches', 'Hanging Leg Raise', 'Cable Crunch', 'Russian Twist', 'Ab Roller', 'Reverse Crunch',
  'Mountain Climbers', 'Dead Bug', 'Side Bridge',
  'Running, Treadmill', 'Walking, Treadmill', 'Elliptical Trainer', 'Bicycling, Stationary', 'Rowing, Stationary',
  'Rope Jumping', 'Stairmaster', 'Battling Ropes',
  'One-Arm Kettlebell Swings', 'Kettlebell Turkish Get-Up (Squat style)', "Farmer's Walk", 'Power Clean',
]
const popularRank = new Map(POPULAR.map((n, i) => [n, i]))

const TIME_RE = /^(plank|side bridge)$|isometric|vacuum|one handed hang|crucifix/i

const TRACK_OVERRIDE = {
  'Ab Roller': 'reps',
  'Battling Ropes': 'time',
  'Dips - Chest Version': 'reps',
  'Hyperextensions (Back Extensions)': 'reps',
  'Wall Sit': 'time',
}

function trackingOf(x) {
  if (TRACK_OVERRIDE[x.name]) return TRACK_OVERRIDE[x.name]
  if (x.category === 'cardio') return 'cardio'
  if (x.category === 'stretching') return 'time'
  if (TIME_RE.test(x.name)) return 'time'
  if (!x.equipment || x.equipment === 'body only') return 'reps'
  return 'weight'
}

const out = src.map((x) => {
  if (!zh[x.name]) console.warn('缺少中文名：', x.name)
  const rank = popularRank.get(x.name)
  return {
    id: x.id,
    name: x.name,
    zh: zh[x.name] ?? x.name,
    primary: x.primaryMuscles,
    secondary: x.secondaryMuscles,
    equipment: x.equipment ?? 'other',
    category: x.category,
    level: x.level,
    mechanic: x.mechanic ?? undefined,
    force: x.force ?? undefined,
    tracking: trackingOf(x),
    images: x.images,
    instructions: x.instructions,
    ...(rank !== undefined ? { popular: rank } : {}),
  }
})

const missingPopular = POPULAR.filter((n) => !src.some((x) => x.name === n))
if (missingPopular.length) console.warn('常用动作未找到：', missingPopular)

mkdirSync(join(root, 'public/data'), { recursive: true })
writeFileSync(join(root, 'public/data/exercises.json'), JSON.stringify(out))
console.log(`已生成 ${out.length} 个动作 → public/data/exercises.json`)
