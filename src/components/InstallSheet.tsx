import { useState, type ReactNode } from 'react'
import {
  Share,
  SquarePlus,
  EllipsisVertical,
  Ellipsis,
  MonitorDown,
  Download,
  Copy,
  WifiOff,
  Maximize2,
  Zap,
  CircleCheck,
  Compass,
  X,
} from 'lucide-react'
import { Button, Segmented, Sheet, toast } from './ui'
import { Logo } from './icons'
import {
  closeInstallSheet,
  dismissBanner,
  openInstallSheet,
  promptInstall,
  useInstall,
  type InstallPlatform,
} from '../lib/install'
import { cx } from '../lib/utils'

/** 手机主屏幕插画：图标「飞」进主屏幕 */
function HomeScreenArt() {
  const apps = ['#4dabf7', '#ff6b6b', '#ffa94d', '#38d9a9', '#b197fc', '#ffd43b', '#f783ac', '#69db7c', '#4dabf7', '#ffa94d', '#38d9a9']
  return (
    <svg viewBox="0 0 220 150" className="h-36 w-full" aria-hidden>
      <defs>
        <radialGradient id="ins-glow">
          <stop offset="0" stopColor="#c6f432" stopOpacity="0.3" />
          <stop offset="1" stopColor="#c6f432" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="80" rx="100" ry="60" fill="url(#ins-glow)" />
      {/* 手机 */}
      <rect x="62" y="8" width="96" height="140" rx="16" fill="var(--surface-2)" stroke="var(--surface-3)" strokeWidth="3" />
      <rect x="96" y="14" width="28" height="5" rx="2.5" fill="var(--surface-3)" />
      {apps.map((c, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        return <rect key={i} x={72 + col * 20} y={28 + row * 22} width="14" height="14" rx="4" fill={c} opacity="0.55" />
      })}
      {/* GymGym 图标落位 */}
      <g transform="translate(132 72)">
        <rect x="0" y="0" width="14" height="14" rx="4" fill="#c6f432">
          <animate attributeName="opacity" values="0;1;1" dur="2.4s" repeatCount="indefinite" />
        </rect>
      </g>
      {/* 飞入的大图标 */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 74 34; 74 34" keyTimes="0;0.55;1" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.9;0" keyTimes="0;0.5;0.6" dur="2.4s" repeatCount="indefinite" />
        <rect x="20" y="24" width="44" height="44" rx="12" fill="#c6f432" />
        <g fill="#0b0d10" transform="translate(20 24) scale(0.6875)">
          <rect x="9" y="22" width="7" height="20" rx="2.5" />
          <rect x="48" y="22" width="7" height="20" rx="2.5" />
          <rect x="17" y="26" width="5" height="12" rx="2" />
          <rect x="42" y="26" width="5" height="12" rx="2" />
          <path d="M22 32h6l3-7 4 14 3-7h4" fill="none" stroke="#0b0d10" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
    </svg>
  )
}

function Step({ n, children, icon }: { n: number; children: ReactNode; icon?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
      <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">{n}</span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">{children}</div>
      {icon && <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-info">{icon}</span>}
    </li>
  )
}

const KBD = ({ children }: { children: ReactNode }) => (
  <b className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-px font-semibold text-ink">{children}</b>
)

function Guide({ platform }: { platform: InstallPlatform }) {
  const deferred = useInstall((s) => s.deferred)
  if (platform === 'inapp')
    return (
      <ol className="space-y-2">
        <Step n={1} icon={<Ellipsis className="size-5" />}>
          当前在微信 / QQ 等 App 内打开，无法直接安装。点击右上角 <KBD>···</KBD>
        </Step>
        <Step n={2} icon={<Compass className="size-5" />}>
          选择 <KBD>在浏览器中打开</KBD>（iPhone 用 Safari，安卓用 Chrome / Edge / 系统浏览器）
        </Step>
        <Step n={3}>在浏览器里再次点击「安装到桌面」，按提示添加</Step>
        <Button
          variant="secondary"
          block
          className="mt-2"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.href.split('#')[0])
              toast('链接已复制，去浏览器粘贴打开')
            } catch {
              toast('复制失败，请手动复制地址栏链接')
            }
          }}
        >
          <Copy className="size-4" /> 复制链接
        </Button>
      </ol>
    )
  if (platform === 'ios')
    return (
      <ol className="space-y-2">
        <Step n={1} icon={<Share className="size-5" />}>
          用 <b>Safari</b> 打开本页，点击底部工具栏中间的 <KBD>分享</KBD> 按钮
          <div className="text-xs text-ink-3">iOS 16.4+ 的 Chrome / Edge 在地址栏右侧也有分享按钮</div>
        </Step>
        <Step n={2} icon={<SquarePlus className="size-5" />}>
          在分享菜单中向下滑，选择 <KBD>添加到主屏幕</KBD>
        </Step>
        <Step n={3}>
          确认名称为「GymGym」，点击右上角 <KBD>添加</KBD>，在主屏幕找到图标打开即可
        </Step>
      </ol>
    )
  if (platform === 'android')
    return (
      <ol className="space-y-2">
        {deferred && (
          <Button block size="lg" className="mb-2" onClick={() => promptInstall()}>
            <Download className="size-5" /> 一键安装到桌面
          </Button>
        )}
        <Step n={1} icon={<EllipsisVertical className="size-5" />}>
          {deferred ? '或者手动：' : ''}点击浏览器右上角 <KBD>⋮</KBD> 菜单
        </Step>
        <Step n={2} icon={<SquarePlus className="size-5" />}>
          选择 <KBD>安装应用</KBD> 或 <KBD>添加到主屏幕</KBD>
        </Step>
        <Step n={3}>确认添加，回到桌面即可看到 GymGym 图标</Step>
        <p className="px-1 pt-1 text-xs leading-relaxed text-ink-3">
          推荐使用 Chrome、Edge 或手机自带浏览器。部分国产浏览器添加后只是普通书签，打开仍有地址栏；小米/华为等系统可能需要在设置里允许浏览器「创建桌面快捷方式」权限。
        </p>
      </ol>
    )
  return (
    <ol className="space-y-2">
      {deferred && (
        <Button block size="lg" className="mb-2" onClick={() => promptInstall()}>
          <MonitorDown className="size-5" /> 一键安装到电脑
        </Button>
      )}
      <Step n={1} icon={<MonitorDown className="size-5" />}>
        {deferred ? '或者手动：' : ''}<b>Chrome / Edge</b>：点击地址栏右侧的 <KBD>安装</KBD> 图标
      </Step>
      <Step n={2} icon={<EllipsisVertical className="size-5" />}>
        也可以打开浏览器菜单 → <KBD>投放、保存和分享</KBD> → <KBD>安装页面为应用</KBD>（Edge：<KBD>应用</KBD> → <KBD>将此站点作为应用安装</KBD>）
      </Step>
      <Step n={3} icon={<Share className="size-5" />}>
        <b>Mac Safari</b>（macOS 14+）：菜单栏 <KBD>文件</KBD> → <KBD>添加到程序坞</KBD>
      </Step>
    </ol>
  )
}

export function InstallSheetHost() {
  const { sheetOpen, platform, standalone, installed } = useInstall()
  const [tab, setTab] = useState<InstallPlatform | null>(null)
  const current = tab ?? platform
  return (
    <Sheet open={sheetOpen} onClose={closeInstallSheet} title="安装到桌面">
      <div className="px-5 pb-8">
        <HomeScreenArt />
        {standalone || installed ? (
          <div className="mt-2 flex flex-col items-center text-center">
            <CircleCheck className="size-10 text-accent-text" />
            <div className="mt-2 text-lg font-bold">{standalone ? '已经在以 App 模式运行' : '安装成功！'}</div>
            <p className="mt-1 text-sm text-ink-3">{standalone ? '以后从桌面图标打开就好' : '在桌面或应用列表里找到 GymGym 图标打开'}</p>
          </div>
        ) : (
          <>
            <p className="mt-1 text-center text-sm leading-relaxed text-ink-2">像原生 App 一样从桌面一键打开，训练时更专注</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-ink-2">
              <div className="rounded-2xl bg-surface-2 px-1 py-2.5">
                <Maximize2 className="mx-auto mb-1 size-4 text-accent-text" />
                全屏无地址栏
              </div>
              <div className="rounded-2xl bg-surface-2 px-1 py-2.5">
                <WifiOff className="mx-auto mb-1 size-4 text-accent-text" />
                断网也能记录
              </div>
              <div className="rounded-2xl bg-surface-2 px-1 py-2.5">
                <Zap className="mx-auto mb-1 size-4 text-accent-text" />
                桌面一键直达
              </div>
            </div>
            <Segmented
              className="mt-5"
              value={current === 'inapp' ? 'inapp' : current}
              onChange={(v) => setTab(v)}
              options={[
                { value: 'ios', label: 'iPhone / iPad' },
                { value: 'android', label: '安卓' },
                { value: 'desktop', label: '电脑' },
                ...(platform === 'inapp' ? [{ value: 'inapp' as const, label: '微信内' }] : []),
              ]}
            />
            <div className="mt-4">
              <Guide platform={current} />
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

/** 首页顶部的安装提示条 */
export function InstallBanner({ onDismiss }: { onDismiss: () => void }) {
  const { deferred, platform } = useInstall()
  return (
    <div className="mt-3 flex animate-rise items-center gap-3 rounded-3xl border border-accent/30 bg-accent-soft p-3 pr-2">
      <Logo size={40} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">安装 GymGym 到{platform === 'desktop' ? '电脑' : '桌面'}</div>
        <div className="text-xs text-ink-3">全屏、离线可用，打开更快</div>
      </div>
      <Button size="sm" onClick={() => (deferred ? promptInstall() : openInstallSheet())}>
        {deferred ? '安装' : '怎么装'}
      </Button>
      <button
        aria-label="不再提示"
        onClick={() => {
          dismissBanner()
          onDismiss()
        }}
        className={cx('grid size-8 place-items-center rounded-full text-ink-3')}
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
