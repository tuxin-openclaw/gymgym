import { useState } from 'react'
import { useNavigate } from 'react-router'
import { db } from '../lib/db'
import { EQUIPMENT_ORDER, EQUIPMENT_ZH, MUSCLE_ZH, TRACKING_ZH } from '../lib/catalog'
import type { Equipment, Exercise, Muscle, Tracking } from '../lib/types'
import { cx, uid } from '../lib/utils'
import { Button, PageHeader, toast } from '../components/ui'
import { BodyMap } from '../components/BodyMap'
import { EquipmentIcon } from '../components/icons'

const MUSCLES = Object.keys(MUSCLE_ZH) as Muscle[]

export default function CustomExercise() {
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [primary, setPrimary] = useState<Muscle[]>([])
  const [equipment, setEquipment] = useState<Equipment>('dumbbell')
  const [tracking, setTracking] = useState<Tracking>('weight')
  const [note, setNote] = useState('')

  const toggle = (m: Muscle) => setPrimary((p) => (p.includes(m) ? p.filter((x) => x !== m) : [...p, m]))

  const save = async () => {
    const ex: Exercise = {
      id: 'custom_' + uid(),
      name: name.trim(),
      zh: name.trim(),
      primary,
      secondary: [],
      equipment,
      category: tracking === 'cardio' ? 'cardio' : 'strength',
      level: 'beginner',
      tracking,
      images: [],
      instructions: [],
      custom: true,
      note: note.trim() || undefined,
    }
    await db.customExercises.add(ex)
    toast('已创建自定义动作')
    nav(-1)
  }

  return (
    <div className="pb-32">
      <PageHeader title="自定义动作" back />
      <div className="space-y-6 px-4 pt-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="动作名称，如「器械坐姿推胸」"
          autoFocus
          className="w-full bg-transparent px-1 text-2xl font-extrabold outline-none placeholder:text-ink-3/60"
        />

        <section>
          <h3 className="mb-2 px-1 text-sm font-semibold text-ink-2">主要锻炼肌肉（点击人体或标签）</h3>
          <div className="rounded-3xl bg-surface p-4">
            <BodyMap className="h-60" fill={Object.fromEntries(primary.map((m) => [m, 1]))} selected={primary} onSelect={toggle} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <button
                  key={m}
                  onClick={() => toggle(m)}
                  className={cx(
                    'h-8 rounded-full px-3 text-xs font-medium',
                    primary.includes(m) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2',
                  )}
                >
                  {MUSCLE_ZH[m]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-sm font-semibold text-ink-2">器材</h3>
          <div className="grid grid-cols-4 gap-2">
            {EQUIPMENT_ORDER.map((e) => (
              <button
                key={e}
                onClick={() => setEquipment(e)}
                className={cx(
                  'pressable flex flex-col items-center gap-1.5 rounded-2xl border-2 py-3 text-xs font-medium',
                  equipment === e ? 'border-accent bg-accent-soft text-ink' : 'border-transparent bg-surface text-ink-2',
                )}
              >
                <EquipmentIcon type={e} width={22} height={22} />
                {EQUIPMENT_ZH[e]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-sm font-semibold text-ink-2">记录方式</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TRACKING_ZH) as Tracking[]).map((t) => (
              <button
                key={t}
                onClick={() => setTracking(t)}
                className={cx(
                  'pressable rounded-2xl border-2 px-3 py-3 text-sm font-semibold',
                  tracking === t ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface text-ink-2',
                )}
              >
                {TRACKING_ZH[t]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 px-1 text-sm font-semibold text-ink-2">备注 / 动作要领（可选）</h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="例如：座椅调到第 4 档，肩胛后收"
            className="w-full rounded-2xl bg-surface p-4 text-sm outline-none placeholder:text-ink-3"
          />
        </section>
      </div>
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        <Button block size="lg" className="mb-4" disabled={!name.trim() || !primary.length} onClick={save}>
          保存动作
        </Button>
      </div>
    </div>
  )
}
