import { NavLink, useNavigate } from 'react-router'
import { House, ClipboardList, Dumbbell, ChartColumn, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWorkout } from '../lib/workout-store'
import { cx, fmtClock } from '../lib/utils'
import { openStartSheet } from './StartSheet'

const TABS = [
  { to: '/', label: '首页', icon: House },
  { to: '/plans', label: '计划', icon: ClipboardList },
  null,
  { to: '/exercises', label: '动作库', icon: Dumbbell },
  { to: '/records', label: '记录', icon: ChartColumn },
]

function useElapsed(start?: number) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!start) return
    const t = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [start])
  return start ? (Date.now() - start) / 1000 : 0
}

export function BottomNav() {
  const active = useWorkout((s) => s.workout)
  const nav = useNavigate()
  const elapsed = useElapsed(active?.startedAt)
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-line bg-bg/90 backdrop-blur-xl">
      <div className="grid h-16 grid-cols-5 items-center">
        {TABS.map((t, i) =>
          t ? (
            <NavLink
              key={t.to}
              to={t.to}
              end
              className={({ isActive }) =>
                cx('flex flex-col items-center gap-0.5 text-[11px] font-medium transition-colors', isActive ? 'text-ink' : 'text-ink-3')
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon className="size-6" strokeWidth={isActive ? 2.4 : 1.8} />
                  {t.label}
                </>
              )}
            </NavLink>
          ) : (
            <div key={i} className="flex justify-center">
              <button
                onClick={() => (active ? nav('/workout') : openStartSheet())}
                aria-label={active ? '继续训练' : '开始训练'}
                className={cx(
                  'pressable -mt-7 flex size-16 flex-col items-center justify-center rounded-full border-4 border-bg bg-accent text-accent-ink shadow-[0_8px_24px_-6px_rgb(198_244_50/0.6)]',
                )}
              >
                {active ? (
                  <>
                    <span className="relative mb-0.5 flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-ink opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-accent-ink" />
                    </span>
                    <span className="num text-[11px] font-bold leading-none">{fmtClock(elapsed)}</span>
                  </>
                ) : (
                  <Play className="ml-0.5 size-7 fill-current" />
                )}
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  )
}
