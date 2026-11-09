import { useId, type ReactNode } from 'react'
import type { Muscle } from '../lib/types'
import { MUSCLE_ZH } from '../lib/catalog'
import { cx } from '../lib/utils'

/**
 * 手绘风格的人体肌肉图（SVG）。只画左半边，右半边镜像得到。
 * 坐标系：viewBox 0 0 200 420，身体中线 x=100。
 */

type Shape = { d: string } | { rect: [number, number, number, number] }

const SILHOUETTE =
  'M100,50 L92,50 C92,56 90,60 86,63 C78,66 68,66 61,71 C53,77 50,88 50,102 C48,116 46,132 45,146 ' +
  'C43,160 40,176 38,192 C37,200 36,206 36,212 C33,221 35,233 40,235 C45,236 47,229 47,221 ' +
  'C49,206 53,190 56,176 C58,164 60,152 62,140 C63,130 65,122 67,116 C67,132 68,150 70,168 ' +
  'C70,178 68,186 68,196 C66,222 66,248 70,274 C72,286 72,294 72,302 C70,322 70,342 74,362 ' +
  'C76,374 76,384 74,392 C69,400 71,409 82,409 C89,409 92,404 90,396 C88,384 88,370 90,356 ' +
  'C92,338 94,318 92,302 C94,282 97,252 98,224 L100,214 Z'

const FRONT: Partial<Record<Muscle, Shape[]>> = {
  neck: [{ d: 'M92,52 C92,57 91,60 89,62 L99,64 L99,52 Z' }],
  traps: [{ d: 'M89,62 C84,65 78,67 72,68 C78,70 84,71 90,71 C92,68 92,65 89,62 Z' }],
  shoulders: [{ d: 'M70,69 C61,71 54,79 53,93 C53,100 54,105 56,109 C60,99 65,89 73,80 C76,76 76,71 70,69 Z' }],
  chest: [{ d: 'M98.5,73 C90,71 81,73 77,78 C71,86 67,96 68,106 C74,114 88,115 98.5,111 Z' }],
  biceps: [{ d: 'M55.5,113 C51.5,123 49.5,135 49.5,146 C52.5,150 57,150 60,146 C62,136 64,124 64.5,115 C62,110 58,110 55.5,113 Z' }],
  forearms: [{ d: 'M48,154 C45,166 42,180 40.5,195 C42.5,200 46.5,200 48.5,196 C52,184 56,170 58.5,156 C56,151 50,151 48,154 Z' }],
  abdominals: [
    { rect: [89.5, 116, 9, 14] },
    { rect: [89.5, 132, 9, 14] },
    { rect: [89.5, 148, 9, 14] },
    { rect: [90, 164, 8.5, 18] },
    { d: 'M86.5,118 C80,125 74.5,136 73,150 C72.5,162 74.5,172 78,181 L87,184 C85.5,166 84.5,140 86.5,118 Z' },
  ],
  abductors: [{ d: 'M70,186 C67.5,196 66.5,206 67.5,217 C70,208 74,199 78.5,191 Z' }],
  quadriceps: [{ d: 'M77,195 C70.5,214 68.5,240 72,266 C76,280 84,286 90,280 C94,262 95.5,238 95,215 C92,204 85,197 77,195 Z' }],
  adductors: [{ d: 'M97,207 C94,221 93,237 94.5,256 C96.5,248 98.5,232 99,215 Z' }],
  calves: [{ d: 'M74.5,306 C71.5,322 72,342 76,358 C80,361 84,359 86,355 C88,339 88.5,321 86.5,306 C82.5,301 77,301 74.5,306 Z' }],
}

const BACK: Partial<Record<Muscle, Shape[]>> = {
  neck: [{ d: 'M92,52 C92,56 91.5,58 90,60 L99,60 L99,52 Z' }],
  traps: [{ d: 'M99.5,56 L91,58 C88,63 80,67 70,70 C80,74 88,82 94,96 L99.5,114 Z' }],
  shoulders: [{ d: 'M69,70 C60,72 54,80 53,94 C53,100 54,105 56,109 C60,99 64,89 72,81 C75,77 75,72 69,70 Z' }],
  'middle back': [{ d: 'M95.5,98 C91,100 86,104 82.5,110 C86,119 92,125 98.5,129 L98.5,118 Z' }],
  lats: [{ d: 'M73,90 C69,104 70,121 74,139 C79,154 87,165 96,171 C97,160 97,148 95.5,136 C88,124 82,113 79.5,100 C78,95 76,91 73,90 Z' }],
  'lower back': [{ d: 'M98.5,140 C94.5,144 91.5,156 91,172 C93,180 96,184 98.5,186 Z' }],
  triceps: [{ d: 'M55.5,113 C51.5,123 49.5,135 49.5,146 C52.5,150 57,150 60,146 C62,136 64,124 64.5,115 C62,110 58,110 55.5,113 Z' }],
  forearms: [{ d: 'M48,154 C45,166 42,180 40.5,195 C42.5,200 46.5,200 48.5,196 C52,184 56,170 58.5,156 C56,151 50,151 48,154 Z' }],
  glutes: [{ d: 'M98.5,191 C90,187 77,189 71,199 C68,211 70.5,224 80,230 C88,233 95.5,229 98.5,222 Z' }],
  abductors: [{ d: 'M70,184 C68,190 67.5,196 68.5,202 C71,196 74,191 78,187 Z' }],
  hamstrings: [{ d: 'M74.5,236 C70.5,252 72,270 76,286 C82,291 88,291 92,285 C95,269 96,251 95,236 C88,232 80.5,232 74.5,236 Z' }],
  calves: [{ d: 'M74.5,304 C69,316 69,332 74,346 C80,351 86,349 88,341 C90,327 89.5,313 86.5,304 C82.5,298 77,298 74.5,304 Z' }],
}

export type MuscleFill = Partial<Record<Muscle, number>> // 0..1 intensity

function ShapeEl({ s, ...rest }: { s: Shape } & React.SVGProps<SVGPathElement & SVGRectElement>) {
  if ('rect' in s) {
    const [x, y, w, h] = s.rect
    return <rect x={x} y={y} width={w} height={h} rx={3} {...(rest as React.SVGProps<SVGRectElement>)} />
  }
  return <path d={s.d} {...(rest as React.SVGProps<SVGPathElement>)} />
}

function Figure({
  view,
  fill,
  color,
  onSelect,
  selected,
}: {
  view: 'front' | 'back'
  fill: MuscleFill
  color: string
  onSelect?: (m: Muscle) => void
  selected?: Muscle[]
}) {
  const map = view === 'front' ? FRONT : BACK
  const entries = Object.entries(map) as [Muscle, Shape[]][]
  const renderHalf = (mirror: boolean) => (
    <g transform={mirror ? 'translate(200,0) scale(-1,1)' : undefined}>
      <path d={SILHOUETTE} fill="var(--body)" />
      {entries.map(([m, shapes]) => {
        const v = fill[m] ?? 0
        const isSel = selected?.includes(m)
        return shapes.map((s, i) => (
          <ShapeEl
            key={m + i}
            s={s}
            fill={v > 0 ? color : 'var(--muscle)'}
            fillOpacity={v > 0 ? 0.28 + 0.72 * Math.min(1, v) : 1}
            stroke={isSel ? 'var(--ink)' : 'none'}
            strokeWidth={isSel ? 1.2 : 0}
            className={cx(onSelect && 'cursor-pointer transition-[fill-opacity] hover:opacity-80')}
            onClick={onSelect ? () => onSelect(m) : undefined}
          >
            <title>{MUSCLE_ZH[m]}</title>
          </ShapeEl>
        ))
      })}
    </g>
  )
  return (
    <>
      {renderHalf(false)}
      {renderHalf(true)}
      <ellipse cx={100} cy={29} rx={16.5} ry={20.5} fill="var(--body)" />
      {view === 'back' && <path d="M100,60 L100,186" stroke="var(--bg)" strokeWidth={1} opacity={0.5} />}
    </>
  )
}

export function BodyMap({
  fill = {},
  color = 'var(--chart)',
  onSelect,
  selected,
  views = ['front', 'back'],
  className,
  labels = true,
}: {
  fill?: MuscleFill
  color?: string
  onSelect?: (m: Muscle) => void
  selected?: Muscle[]
  views?: ('front' | 'back')[]
  className?: string
  labels?: boolean
}) {
  return (
    <div className={cx('flex justify-center gap-2', className)}>
      {views.map((v) => (
        <figure key={v} className="flex min-w-0 flex-1 flex-col items-center">
          <svg viewBox="22 0 156 416" className="h-full max-h-80 w-full" role="img" aria-label={v === 'front' ? '正面肌肉图' : '背面肌肉图'}>
            <Figure view={v} fill={fill} color={color} onSelect={onSelect} selected={selected} />
          </svg>
          {labels && <figcaption className="mt-1 text-[11px] font-medium text-ink-3">{v === 'front' ? '正面' : '背面'}</figcaption>}
        </figure>
      ))}
    </div>
  )
}

/** 主要/次要肌群高亮 */
export function musclesFill(primary: Muscle[], secondary: Muscle[] = []): MuscleFill {
  const f: MuscleFill = {}
  for (const m of secondary) f[m] = 0.25
  for (const m of primary) f[m] = 1
  return f
}

/** 迷你人体图标：用于部位选择、缩略图兜底 */
export function MiniBody({
  muscles,
  view,
  color = 'var(--accent)',
  className,
}: {
  muscles: Muscle[]
  view?: 'front' | 'back'
  color?: string
  className?: string
}) {
  const id = useId()
  const backOnly: Muscle[] = ['lats', 'middle back', 'lower back', 'glutes', 'hamstrings', 'triceps']
  const v = view ?? (muscles.length && muscles.every((m) => backOnly.includes(m) || m === 'traps') ? 'back' : 'front')
  const fill: MuscleFill = Object.fromEntries(muscles.map((m) => [m, 1]))
  return (
    <svg viewBox="30 0 140 416" className={className} aria-hidden id={id}>
      <Figure view={v} fill={fill} color={color} />
    </svg>
  )
}

export function MuscleLegend({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-ink-3">{children}</div>
}
