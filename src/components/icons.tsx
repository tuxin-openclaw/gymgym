import type { SVGProps } from 'react'
import type { Equipment } from '../lib/types'

/** 器械图标：与 lucide 风格一致（24×24、2px 描边、圆角端点） */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PATHS: Record<Equipment, React.ReactNode> = {
  barbell: (
    <>
      <path d="M2 12h20" />
      <rect x="4" y="7" width="3" height="10" rx="1" />
      <rect x="17" y="7" width="3" height="10" rx="1" />
      <path d="M8 9v6M16 9v6" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M8 12h8" />
      <rect x="3" y="8" width="5" height="8" rx="1.5" />
      <rect x="16" y="8" width="5" height="8" rx="1.5" />
    </>
  ),
  kettlebells: (
    <>
      <path d="M8.5 9.5A3.5 3.5 0 1 1 15.5 9.5" />
      <path d="M7 10h10l1.5 4a6 6 0 0 1-5.6 7h-1.8a6 6 0 0 1-5.6-7Z" />
    </>
  ),
  cable: (
    <>
      <path d="M4 3h16" />
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8v8" />
      <path d="M8 16h8l-1 4H9Z" />
    </>
  ),
  machine: (
    <>
      <path d="M5 21V3M19 21V3" />
      <rect x="8" y="5" width="8" height="6" rx="1" />
      <path d="M12 11v4M9 21v-3h6v3" />
    </>
  ),
  'body only': (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M5 9l7 1 7-1" />
      <path d="M12 10v5l-3 6M12 15l3 6" />
    </>
  ),
  bands: (
    <>
      <path d="M4 18c3-12 13-12 16 0" />
      <path d="M7 18c2-8 8-8 10 0" />
      <path d="M3 18h3M18 18h3" />
    </>
  ),
  'e-z curl bar': (
    <>
      <path d="M2 12h4l2-2 2 4 2-4 2 4 2-4 2 2h4" />
      <path d="M4 8v8M20 8v8" />
    </>
  ),
  'medicine ball': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9.5c5 2 12 2 17 0M3.5 14.5c5-2 12-2 17 0" />
    </>
  ),
  'exercise ball': (
    <>
      <circle cx="12" cy="11" r="8" />
      <path d="M7 6c2 3 2 7 0 10M17 6c-2 3-2 7 0 10" />
      <path d="M8 21h8" />
    </>
  ),
  'foam roll': (
    <>
      <ellipse cx="5" cy="12" rx="2" ry="5" />
      <path d="M5 7h14M5 17h14" />
      <path d="M19 7a2 5 0 0 1 0 10" />
      <path d="M10 7v10M15 7v10" />
    </>
  ),
  other: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <circle cx="17.5" cy="17.5" r="3.5" />
    </>
  ),
}

export function EquipmentIcon({ type, ...props }: { type: Equipment } & SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={20} height={20} {...props}>
      {PATHS[type] ?? PATHS.other}
    </svg>
  )
}

/** App 标志：杠铃 + 心跳线 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#c6f432" />
      <g fill="#0b0d10">
        <rect x="9" y="22" width="7" height="20" rx="2.5" />
        <rect x="48" y="22" width="7" height="20" rx="2.5" />
        <rect x="17" y="26" width="5" height="12" rx="2" />
        <rect x="42" y="26" width="5" height="12" rx="2" />
      </g>
      <path d="M22 32h6l3-7 4 14 3-7h4" fill="none" stroke="#0b0d10" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
