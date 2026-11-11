import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Download, Upload, Trash2, Moon, Sun, Monitor, ExternalLink, Database, MonitorSmartphone, ChevronRight, RefreshCw, LogOut, Cloud, CloudOff, AlertCircle, Users, Link2, Unlink } from 'lucide-react'
import { authClient, authError, isAdmin, useAuth, useServerConfig } from '../lib/auth'
import { signOut, syncNow, useSync } from '../lib/sync'
import { openInstallSheet, useInstall } from '../lib/install'
import { useSettings } from '../lib/settings'
import { clearAll, exportAll, importAll } from '../lib/db'
import { dayKey } from '../lib/utils'
import { beep, canVibrate, haptic } from '../lib/feedback'
import { PageHeader, Segmented, Stepper, Toggle, confirm, toast } from '../components/ui'
import { Logo } from '../components/icons'

export default function SettingsPage() {
  const s = useSettings()
  const file = useRef<HTMLInputElement>(null)
  const installedNow = useInstall((x) => x.standalone || x.installed)

  const doExport = async () => {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `gymgym-backup-${dayKey(Date.now())}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('备份已导出')
  }

  const doImport = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      await importAll(data)
      toast(`已导入 ${data.workouts?.length ?? 0} 条训练记录`)
    } catch (e) {
      toast(e instanceof Error ? e.message : '导入失败')
    }
  }

  return (
    <div className="pb-10">
      <PageHeader title="设置" back />
      <div className="space-y-6 px-4 pt-2">
        <div className="flex items-center gap-4 rounded-3xl bg-surface p-4">
          <Logo size={52} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-ink-3">怎么称呼你？</div>
            <input
              value={s.nickname}
              onChange={(e) => s.set({ nickname: e.target.value })}
              placeholder="输入昵称"
              className="w-full bg-transparent text-lg font-bold outline-none placeholder:text-ink-3/60"
            />
          </div>
        </div>

        <AccountGroup />

        <Group title="应用">
          <button onClick={openInstallSheet} className="flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-surface-2">
            <MonitorSmartphone className="size-5" />
            <span className="flex-1">安装到桌面 / 主屏幕</span>
            <span className={installedNow ? 'text-xs font-semibold text-accent-text' : 'text-xs text-ink-3'}>{installedNow ? '已安装' : '未安装'}</span>
            <ChevronRight className="size-4 text-ink-3" />
          </button>
        </Group>

        <Group title="训练">
          <Row label="重量单位" desc="只影响显示，不会换算已有数据">
            <Segmented
              className="w-32"
              value={s.unit}
              onChange={(unit) => s.set({ unit })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </Row>
          <Row label="默认组间休息">
            <div className="w-40">
              <Stepper value={s.defaultRest} step={15} min={0} max={600} onChange={(defaultRest) => s.set({ defaultRest })} unit="秒" />
            </div>
          </Row>
          <Row label="休息结束振动">
            <Toggle checked={s.vibrate} onChange={(vibrate) => s.set({ vibrate })} label="休息结束振动" />
          </Row>
          <Row label="休息结束提示音">
            <Toggle checked={s.sound} onChange={(sound) => s.set({ sound })} label="休息结束提示音" />
          </Row>
          <Row
            label="试一下提醒效果"
            desc={canVibrate() ? '听不到声音时，请检查手机音量与静音模式' : 'iPhone 网页只支持轻触感（需 iOS 18+）；听不到声音时请检查音量与静音键'}
          >
            <button
              onClick={() => {
                if (s.vibrate) haptic([300, 120, 300])
                if (s.sound) beep()
                if (!s.vibrate && !s.sound) toast('振动和提示音都已关闭')
              }}
              className="pressable h-9 shrink-0 rounded-xl bg-surface-2 px-3.5 text-sm font-semibold"
            >
              试一下
            </button>
          </Row>
          <Row label="每周第一天">
            <Segmented
              className="w-32"
              value={String(s.weekStart) as '0' | '1'}
              onChange={(v) => s.set({ weekStart: Number(v) as 0 | 1 })}
              options={[
                { value: '1', label: '周一' },
                { value: '0', label: '周日' },
              ]}
            />
          </Row>
        </Group>

        <Group title="外观">
          <div className="p-3">
            <Segmented
              value={s.theme}
              onChange={(theme) => s.set({ theme })}
              options={[
                { value: 'dark', label: <span className="flex items-center justify-center gap-1.5"><Moon className="size-4" />深色</span> },
                { value: 'light', label: <span className="flex items-center justify-center gap-1.5"><Sun className="size-4" />浅色</span> },
                { value: 'system', label: <span className="flex items-center justify-center gap-1.5"><Monitor className="size-4" />跟随系统</span> },
              ]}
            />
          </div>
        </Group>

        <Group title="数据" footer="数据先保存在本机，联网时自动同步到服务器，登录同一账号的设备都能看到。清空会同时删除服务器上的数据。">
          <ActionRow icon={<Download className="size-5" />} label="导出备份（JSON）" onClick={doExport} />
          <ActionRow icon={<Upload className="size-5" />} label="从备份导入" onClick={() => file.current?.click()} />
          <ActionRow
            icon={<Trash2 className="size-5" />}
            label="清空所有数据"
            danger
            onClick={async () => {
              if (await confirm({ title: '清空所有数据？', message: '计划、训练记录、体重和自定义动作都会被删除（包括服务器和其他设备上的），且无法恢复。', danger: true, confirmText: '清空' })) {
                await clearAll()
                toast('已清空')
              }
            }}
          />
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </Group>

        <Group title="关于">
          <div className="space-y-2 p-4 text-sm leading-relaxed text-ink-2">
            <p>
              <b className="text-ink">GymGym</b> 是一个为自己打造的健身记录应用：制定计划、记录每一组、回顾进步。
            </p>
            <p className="flex items-start gap-1.5 text-xs text-ink-3">
              <Database className="mt-0.5 size-3.5 shrink-0" />
              <span>
                动作库与示范图来自开源项目{' '}
                <a className="inline-flex items-center gap-0.5 text-accent-text" href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">
                  free-exercise-db <ExternalLink className="size-3" />
                </a>
                （Unlicense），中文名称为本应用翻译。图标来自 Lucide（ISC）。
              </span>
            </p>
          </div>
        </Group>
      </div>
    </div>
  )
}

function AccountGroup() {
  const user = useAuth((s) => s.user)
  const github = useServerConfig((s) => s.github)
  const nav = useNavigate()
  const sync = useSync()
  const [leaving, setLeaving] = useState(false)
  const status =
    sync.state === 'syncing'
      ? '同步中…'
      : sync.state === 'offline'
        ? '离线，联网后自动同步'
        : sync.state === 'error'
          ? sync.error ?? '同步失败'
          : sync.lastSyncAt
            ? `已同步 · ${new Date(sync.lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : '尚未同步'
  const Icon = sync.state === 'offline' ? CloudOff : sync.state === 'error' ? AlertCircle : Cloud
  return (
    <Group title="账号">
      <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <Icon className={`size-5 ${sync.state === 'error' ? 'text-danger' : ''}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{user?.username}</div>
          <div className="truncate text-[11px] text-ink-3">
            {status}
            {sync.pending > 0 && sync.state !== 'syncing' && ` · ${sync.pending} 条待上传`}
          </div>
        </div>
        <button
          onClick={() => syncNow()}
          disabled={sync.state === 'syncing'}
          className="flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 disabled:opacity-40"
          aria-label="立即同步"
        >
          <RefreshCw className={`size-5 ${sync.state === 'syncing' ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {isAdmin(user) && (
        <button onClick={() => nav('/admin')} className="flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-surface-2">
          <Users className="size-5" />
          <span className="flex-1">用户管理</span>
          <ChevronRight className="size-4 text-ink-3" />
        </button>
      )}
      {github && <GitHubRow />}
      <ActionRow
        icon={<LogOut className="size-5" />}
        label={leaving ? '正在退出…' : '退出登录'}
        danger
        onClick={async () => {
          if (leaving) return
          const unsynced = useSync.getState().pending
          const ok = await confirm({
            title: '退出登录？',
            message:
              unsynced > 0 && !navigator.onLine
                ? `当前离线，还有 ${unsynced} 条修改没有上传，退出后会丢失。`
                : '退出后会清除本机上的数据，重新登录即可从服务器恢复。',
            danger: true,
            confirmText: '退出',
          })
          if (!ok) return
          setLeaving(true)
          try {
            await signOut()
          } finally {
            setLeaving(false)
          }
        }}
      />
    </Group>
  )
}

function GitHubRow() {
  // GitHub 账号记录的 id；'' = 未绑定，null = 加载中
  const [linked, setLinked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    authClient
      .listAccounts()
      .then((r) => setLinked(r.data?.find((a) => a.providerId === 'github')?.id ?? ''))
      .catch(() => setLinked(null))
  }, [])
  const onClick = async () => {
    setBusy(true)
    if (linked) {
      if (!(await confirm({ title: '解绑 GitHub？', message: '解绑后不能再用 GitHub 登录这个账号。', confirmText: '解绑', danger: true }))) return setBusy(false)
      const r = await authClient.unlinkAccount({ accountId: linked })
      if (r.error) toast(authError(r.error))
      else {
        setLinked('')
        toast('已解绑 GitHub')
      }
      setBusy(false)
    } else {
      // 跳到 GitHub 授权，完成后回到设置页
      const r = await authClient.linkSocial({ provider: 'github', callbackURL: '/#/settings', errorCallbackURL: '/#/settings' })
      if (r.error) {
        toast(authError(r.error, '绑定失败'))
        setBusy(false)
      }
    }
  }
  return (
    <button onClick={onClick} disabled={busy || linked === null} className="flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-surface-2 disabled:opacity-60">
      {linked ? <Unlink className="size-5" /> : <Link2 className="size-5" />}
      <span className="flex-1">GitHub 登录</span>
      <span className={linked ? 'text-xs font-semibold text-accent-text' : 'text-xs text-ink-3'}>
        {linked === null ? '…' : linked ? '已绑定 · 点击解绑' : '未绑定 · 点击绑定'}
      </span>
    </button>
  )
}

function Group({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  return (
    <section>
      <h3 className="mb-2 px-2 text-xs font-semibold text-ink-3">{title}</h3>
      <div className="divide-y divide-line overflow-hidden rounded-3xl bg-surface">{children}</div>
      {footer && <p className="mt-2 px-2 text-xs leading-relaxed text-ink-3">{footer}</p>}
    </section>
  )
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
      <div>
        <div className="text-[15px]">{label}</div>
        {desc && <div className="text-[11px] text-ink-3">{desc}</div>}
      </div>
      {children}
    </div>
  )
}

function ActionRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] hover:bg-surface-2 ${danger ? 'text-danger' : ''}`}>
      {icon}
      {label}
    </button>
  )
}
