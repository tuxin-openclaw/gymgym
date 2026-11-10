import { useRef } from 'react'
import { Download, Upload, Trash2, Moon, Sun, Monitor, ExternalLink, Database, MonitorSmartphone, ChevronRight } from 'lucide-react'
import { openInstallSheet, useInstall } from '../lib/install'
import { useSettings } from '../lib/settings'
import { clearAll, exportAll, importAll } from '../lib/db'
import { dayKey } from '../lib/utils'
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

        <Group title="数据" footer="所有数据只保存在本机浏览器中（IndexedDB），建议定期导出备份。换手机时导出再导入即可。">
          <ActionRow icon={<Download className="size-5" />} label="导出备份（JSON）" onClick={doExport} />
          <ActionRow icon={<Upload className="size-5" />} label="从备份导入" onClick={() => file.current?.click()} />
          <ActionRow
            icon={<Trash2 className="size-5" />}
            label="清空所有数据"
            danger
            onClick={async () => {
              if (await confirm({ title: '清空所有数据？', message: '计划、训练记录、体重和自定义动作都会被删除，且无法恢复。', danger: true, confirmText: '清空' })) {
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
