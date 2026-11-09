import { useMemo, useState, type ReactNode } from 'react'
import { cx } from '../lib/utils'

/**
 * 轻量 SVG 图表：单系列柱状图 / 折线图。
 * 设计规范：细柱 + 顶部 4px 圆角、2px 折线、≥8px 点、弱化网格；悬停/点按显示数值。
 */

export interface Datum {
  label: string // x 轴标签
  value: number
  tip?: string // tooltip 标题
}

function niceMax(v: number) {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return step * p
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl bg-ink px-2.5 py-1.5 text-xs font-medium text-bg shadow-card"
      style={{ left: `${x}%`, top: y - 8 }}
    >
      {children}
    </div>
  )
}

export function BarChart({
  data,
  height = 160,
  format = (v) => String(v),
  color = 'var(--chart)',
  highlightLast = true,
}: {
  data: Datum[]
  height?: number
  format?: (v: number) => string
  color?: string
  highlightLast?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const W = 100
  const padTop = 8
  const chartH = height - 22
  const bw = W / data.length
  const barW = Math.min(bw * 0.56, 7)
  const showEvery = Math.ceil(data.length / 7)
  return (
    <div className="relative select-none" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={0}
            x2={W}
            y1={padTop + (chartH - padTop) * (1 - t)}
            y2={padTop + (chartH - padTop) * (1 - t)}
            stroke="var(--line)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            strokeDasharray={t === 0 ? undefined : '3 4'}
          />
        ))}
      </svg>
      {/* 柱子用 HTML 绘制以保持圆角不被拉伸 */}
      <div className="absolute inset-x-0" style={{ top: padTop, height: chartH - padTop }}>
        {data.map((d, i) => {
          const h = (d.value / max) * 100
          const active = hover === i || (hover === null && highlightLast && i === data.length - 1)
          return (
            <button
              key={i}
              aria-label={`${d.tip ?? d.label}: ${format(d.value)}`}
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(hover === i ? null : i)}
              className="absolute bottom-0 top-0 flex items-end justify-center"
              style={{ left: `${i * bw}%`, width: `${bw}%` }}
            >
              <span
                className="block rounded-t-[4px] transition-[height,opacity] duration-500"
                style={{
                  width: `${(barW / bw) * 100}%`,
                  minWidth: 6,
                  maxWidth: 22,
                  height: d.value > 0 ? `max(${h}%, 3px)` : 0,
                  background: color,
                  opacity: active ? 1 : 0.45,
                }}
              />
            </button>
          )
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex h-4">
        {data.map((d, i) => (
          <div key={i} className="num flex-1 text-center text-[10px] text-ink-3">
            {(data.length - 1 - i) % showEvery === 0 ? d.label : ''}
          </div>
        ))}
      </div>
      {hover !== null && data[hover] && (
        <Tooltip x={(hover + 0.5) * bw} y={padTop + (chartH - padTop) * (1 - data[hover].value / max)}>
          <div className="text-[10px] opacity-70">{data[hover].tip ?? data[hover].label}</div>
          <div className="num">{format(data[hover].value)}</div>
        </Tooltip>
      )}
      <div className="num absolute right-0 top-0 -translate-y-1/2 text-[10px] text-ink-3">{format(max)}</div>
    </div>
  )
}

export function LineChart({
  data,
  height = 170,
  format = (v) => String(v),
  color = 'var(--chart)',
}: {
  data: Datum[]
  height?: number
  format?: (v: number) => string
  color?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const { min, max, pts } = useMemo(() => {
    const vals = data.map((d) => d.value)
    let lo = Math.min(...vals)
    let hi = Math.max(...vals)
    if (lo === hi) {
      lo = lo * 0.9
      hi = hi * 1.1 || 1
    }
    const pad = (hi - lo) * 0.15
    lo = Math.max(0, lo - pad)
    hi = hi + pad
    const pts = data.map((d, i) => ({
      x: data.length === 1 ? 50 : 4 + (i / (data.length - 1)) * 92,
      y: 1 - (d.value - lo) / (hi - lo),
    }))
    return { min: lo, max: hi, pts }
  }, [data])
  const H = height - 22
  const top = 10
  const py = (y: number) => top + y * (H - top)
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${py(p.y)}`).join(' ')
  const area = `${path} L${pts[pts.length - 1]?.x},${H} L${pts[0]?.x},${H} Z`
  const showEvery = Math.ceil(data.length / 6)
  const last = pts.length - 1
  const active = hover ?? last
  return (
    <div className="relative select-none" style={{ height }}>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => (
          <line key={t} x1={0} x2={100} y1={py(t)} y2={py(t)} stroke="var(--line)" vectorEffect="non-scaling-stroke" strokeDasharray={t === 1 ? undefined : '3 4'} />
        ))}
        {pts.length > 1 && <path d={area} fill="url(#lc-fill)" />}
        <path d={path} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {pts[active] && (
          <line x1={pts[active].x} x2={pts[active].x} y1={top} y2={H} stroke="var(--ink-3)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        )}
        {/* 透明命中区 */}
        {pts.map((p, i) => (
          <rect
            key={i}
            x={p.x - 50 / Math.max(pts.length, 1)}
            width={100 / Math.max(pts.length, 1)}
            y={0}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
          />
        ))}
      </svg>
      {/* 点用 HTML 画，避免被非等比缩放压扁 */}
      {pts.map((p, i) => (
        <span
          key={i}
          className={cx('pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface transition-all', i === active ? 'size-3' : 'size-2')}
          style={{ left: `${p.x}%`, top: py(p.y), background: color, opacity: i === active ? 1 : data.length > 20 ? 0 : 0.85 }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-4">
        {data.map((d, i) =>
          (last - i) % showEvery === 0 ? (
            <span key={i} className="num absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-ink-3" style={{ left: `${pts[i].x}%` }}>
              {d.label}
            </span>
          ) : null,
        )}
      </div>
      <div className="num absolute left-0 text-[10px] text-ink-3" style={{ top: py(0) - 14 }}>
        {format(max)}
      </div>
      <div className="num absolute left-0 text-[10px] text-ink-3" style={{ top: py(1) - 14 }}>
        {format(min)}
      </div>
      {hover !== null && pts[active] && (
        <Tooltip x={Math.min(88, Math.max(12, pts[active].x))} y={py(pts[active].y)}>
          <div className="text-[10px] opacity-70">{data[active].tip ?? data[active].label}</div>
          <div className="num">{format(data[active].value)}</div>
        </Tooltip>
      )}
    </div>
  )
}

/** 环形进度 */
export function Ring({
  value,
  size = 56,
  stroke = 6,
  color = 'var(--chart)',
  children,
}: {
  value: number // 0..1
  size?: number
  stroke?: number
  color?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
