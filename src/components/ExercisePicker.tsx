import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, SearchX } from 'lucide-react'
import { Sheet, Button, EmptyState } from './ui'
import { useExercises } from '../lib/exercises'
import {
  BodyPartPicker,
  EquipmentPicker,
  ExerciseList,
  LoadingRow,
  SearchBox,
  emptyFilter,
  filterExercises,
  useFilterCounts,
  type ExerciseFilter,
} from './ExerciseBrowser'

/**
 * 动作选择器：选部位 → 选器材 → 选动作（可多选，按选择顺序编号）
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  multiple = true,
  title = '添加动作',
  exclude,
}: {
  open: boolean
  onClose: () => void
  onPick: (ids: string[]) => void
  multiple?: boolean
  title?: string
  exclude?: string[]
}) {
  const { list, ready } = useExercises()
  const nav = useNavigate()
  const [f, setF] = useState<ExerciseFilter>(emptyFilter)
  const [selected, setSelected] = useState<string[]>([])
  const excludeKey = exclude?.join('|') ?? ''
  const available = useMemo(() => {
    const ex = new Set(excludeKey.split('|'))
    return list.filter((e) => !ex.has(e.id))
  }, [list, excludeKey])
  const items = useMemo(() => filterExercises(available, f), [available, f])
  const { counts, equipment } = useFilterCounts(available, f)

  const close = () => {
    setSelected([])
    onClose()
  }
  const confirm = (ids = selected) => {
    onPick(ids)
    setSelected([])
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      full
      title={title}
      footer={
        multiple ? (
          <div className="flex items-center gap-3">
            {selected.length > 0 && (
              <button className="shrink-0 whitespace-nowrap px-1 text-sm font-medium text-ink-3" onClick={() => setSelected([])}>
                清空
              </button>
            )}
            <Button block disabled={!selected.length} onClick={() => confirm()}>
              {selected.length ? `添加 ${selected.length} 个动作` : '请选择动作'}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="sticky top-0 z-10 bg-surface px-4 pb-2 pt-1">
        <SearchBox value={f.q} onChange={(q) => setF({ ...f, q })} />
      </div>
      <div className="space-y-3 px-4 pb-1 pt-1">
        <div>
          <div className="mb-2 px-1 text-xs font-semibold text-ink-3">① 选部位</div>
          <BodyPartPicker compact value={f.part} onChange={(part) => setF({ ...f, part })} counts={counts} />
        </div>
        <div>
          <div className="mb-2 px-1 text-xs font-semibold text-ink-3">② 选器材</div>
          <EquipmentPicker value={f.equipment} onChange={(equipment) => setF({ ...f, equipment })} available={equipment} />
        </div>
        <div className="px-1 pt-1 text-xs font-semibold text-ink-3">
          ③ 选动作 <span className="num font-normal">· {items.length} 个</span>
        </div>
      </div>
      <div className="px-2 pb-6">
        {!ready ? (
          <LoadingRow />
        ) : items.length ? (
          <ExerciseList
            items={items}
            mode={multiple ? 'pick' : 'browse'}
            selected={selected}
            onItem={(e) =>
              multiple
                ? setSelected((s) => (s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id]))
                : confirm([e.id])
            }
          />
        ) : (
          <EmptyState
            icon={<SearchX className="size-10 text-ink-3" />}
            title="没有找到相关动作"
            desc="换个关键词或筛选条件试试，也可以创建自己的动作"
            action={
              <Button variant="secondary" size="sm" onClick={() => nav('/exercises/new')}>
                <Plus className="size-4" /> 自定义动作
              </Button>
            }
          />
        )}
      </div>
    </Sheet>
  )
}
