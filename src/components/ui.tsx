import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { ChevronLeft, X, Check, AlertTriangle, Minus, Plus } from 'lucide-react'
import { create } from 'zustand'
import { cx } from '../lib/utils'

/* ---------------- Button ---------------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg'; block?: boolean }) {
  return (
    <button
      {...rest}
      className={cx(
        'pressable inline-flex items-center justify-center gap-2 rounded-2xl font-semibold select-none disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'h-9 px-3.5 text-sm rounded-xl',
        size === 'md' && 'h-12 px-5 text-[15px]',
        size === 'lg' && 'h-14 px-6 text-base',
        variant === 'primary' && 'bg-accent text-accent-ink shadow-[0_8px_24px_-8px_rgb(198_244_50/0.55)]',
        variant === 'secondary' && 'bg-surface-2 text-ink',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2',
        variant === 'danger' && 'bg-danger/12 text-danger',
        block && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  className,
  children,
  label,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'pressable grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface-2 active:bg-surface-3',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------------- Chip ---------------- */
export function Chip({
  active,
  children,
  className,
  color,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; color?: string }) {
  return (
    <button
      {...rest}
      style={active && color ? { background: color, color: '#0b0d10' } : undefined}
      className={cx(
        'pressable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap',
        active ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Tag({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span style={style} className={cx('inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 text-[11px] font-medium text-ink-2', className)}>
      {children}
    </span>
  )
}

/* ---------------- Card ---------------- */
export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx('rounded-3xl bg-surface p-4', onClick && 'pressable cursor-pointer', className)}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-end justify-between px-1">
      <h2 className="text-[17px] font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  )
}

/* ---------------- Page header ---------------- */
export function PageHeader({
  title,
  back,
  actions,
  large,
  subtitle,
}: {
  title: ReactNode
  back?: boolean | string
  actions?: ReactNode
  large?: boolean
  subtitle?: ReactNode
}) {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <>
      <header
        className={cx(
          'pt-safe sticky top-0 z-30 transition-colors',
          scrolled ? 'border-b border-line bg-bg/85 backdrop-blur-xl' : 'border-b border-transparent bg-bg',
        )}
      >
        <div className="flex h-14 items-center gap-1 px-2">
          {back ? (
            <IconButton label="返回" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
              <ChevronLeft className="size-6" />
            </IconButton>
          ) : (
            <div className="w-2" />
          )}
          <div
            className={cx(
              'min-w-0 flex-1 truncate text-[17px] font-semibold transition-opacity',
              large && !scrolled && 'opacity-0',
            )}
          >
            {title}
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </header>
      {large && (
        <div className="px-5 pb-2 pt-1">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-3">{subtitle}</p>}
        </div>
      )}
    </>
  )
}

/* ---------------- Bottom sheet ---------------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
  full,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  full?: boolean
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx(
          'relative flex w-full max-w-lg animate-sheet-in flex-col rounded-t-[28px] bg-surface shadow-card',
          full ? 'h-[94dvh]' : 'max-h-[88dvh]',
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-surface-3" />
        {title !== undefined && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <div className="text-lg font-bold">{title}</div>
            <IconButton label="关闭" onClick={onClose} className="-mr-2 bg-surface-2">
              <X className="size-5" />
            </IconButton>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="pb-safe shrink-0 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------- Confirm dialog (imperative) ---------------- */
interface ConfirmOpts {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}
const useConfirmStore = create<{ opts: ConfirmOpts | null; resolve?: (v: boolean) => void }>(() => ({ opts: null }))

export function confirm(opts: ConfirmOpts) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ opts, resolve }))
}

export function ConfirmHost() {
  const { opts, resolve } = useConfirmStore()
  const close = (v: boolean) => {
    resolve?.(v)
    useConfirmStore.setState({ opts: null, resolve: undefined })
  }
  if (!opts) return null
  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center p-6">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={() => close(false)} />
      <div className="relative w-full max-w-xs animate-pop rounded-3xl bg-surface p-6 text-center shadow-card">
        {opts.danger && (
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-danger/15 text-danger">
            <AlertTriangle className="size-6" />
          </div>
        )}
        <h3 className="text-lg font-bold">{opts.title}</h3>
        {opts.message && <p className="mt-2 text-sm leading-relaxed text-ink-2">{opts.message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => close(false)}>
            {opts.cancelText ?? '取消'}
          </Button>
          <Button
            variant={opts.danger ? 'danger' : 'primary'}
            className={opts.danger ? '!bg-danger !text-white' : ''}
            onClick={() => close(true)}
          >
            {opts.confirmText ?? '确定'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/* ---------------- Toast ---------------- */
const useToastStore = create<{ msg: string | null; key: number }>(() => ({ msg: null, key: 0 }))
let toastTimer: ReturnType<typeof setTimeout> | undefined
export function toast(msg: string) {
  clearTimeout(toastTimer)
  useToastStore.setState((s) => ({ msg, key: s.key + 1 }))
  toastTimer = setTimeout(() => useToastStore.setState({ msg: null }), 2200)
}
export function ToastHost() {
  const { msg, key } = useToastStore()
  if (!msg) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] z-[70] flex justify-center px-6">
      <div key={key} className="flex animate-rise items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-bg shadow-card">
        <Check className="size-4" />
        {msg}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cx('flex rounded-2xl bg-surface-2 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 flex-1 rounded-xl text-sm font-semibold transition-colors',
            o.value === value ? 'bg-surface text-ink shadow-sm light:shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-ink-3',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Stepper ---------------- */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  format,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  format?: (v: number) => string
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-surface-2 p-1">
      <button
        aria-label="减少"
        onClick={() => onChange(clamp(value - step))}
        className="pressable grid size-9 place-items-center rounded-xl bg-surface text-ink-2"
      >
        <Minus className="size-4" />
      </button>
      <div className="num min-w-14 flex-1 text-center text-[15px] font-semibold">
        {format ? format(value) : value}
        {unit && <span className="ml-0.5 text-xs font-normal text-ink-3">{unit}</span>}
      </div>
      <button
        aria-label="增加"
        onClick={() => onChange(clamp(value + step))}
        className="pressable grid size-9 place-items-center rounded-xl bg-surface text-ink-2"
      >
        <Plus className="size-4" />
      </button>
    </div>
  )
}

/* ---------------- Toggle ---------------- */
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-3')}
    >
      <span
        className={cx(
          'absolute top-1 size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode
  title: string
  desc?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center">
      <div className="mb-4">{icon}</div>
      <div className="text-base font-semibold">{title}</div>
      {desc && <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
