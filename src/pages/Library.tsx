import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, SearchX, X } from 'lucide-react'
import { useExercises } from '../lib/exercises'
import { MUSCLE_ZH } from '../lib/catalog'
import { IconButton, PageHeader, Segmented, EmptyState, Button } from '../components/ui'
import { BodyMap } from '../components/BodyMap'
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
} from '../components/ExerciseBrowser'

let savedFilter: ExerciseFilter = emptyFilter
let savedMode: 'list' | 'body' = 'list'

export default function Library() {
  const nav = useNavigate()
  const { list, ready } = useExercises()
  const [f, setF0] = useState<ExerciseFilter>(savedFilter)
  const [mode, setMode0] = useState<'list' | 'body'>(savedMode)
  const setF = (v: ExerciseFilter) => setF0((savedFilter = v))
  const setMode = (v: 'list' | 'body') => setMode0((savedMode = v))
  const items = useMemo(() => filterExercises(list, f), [list, f])
  const { counts, equipment } = useFilterCounts(list, f)

  return (
    <div>
      <PageHeader
        large
        title="动作库"
        subtitle={ready ? `${list.length} 个动作 · 含示范图与要领` : '加载中…'}
        actions={
          <IconButton label="自定义动作" onClick={() => nav('/exercises/new')} className="bg-surface">
            <Plus className="size-5" />
          </IconButton>
        }
      />
      <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-20 space-y-3 bg-bg px-4 pb-3 pt-1">
        <SearchBox value={f.q} onChange={(q) => setF({ ...f, q })} />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'list', label: '按部位' },
            { value: 'body', label: '点选肌肉' },
          ]}
        />
      </div>

      <div className="space-y-3 px-4">
        {mode === 'list' ? (
          <BodyPartPicker value={f.part} onChange={(part) => setF({ ...f, part, muscle: undefined })} counts={counts} />
        ) : (
          <div className="rounded-3xl bg-surface p-4">
            <BodyMap
              className="h-72"
              fill={f.muscle ? { [f.muscle]: 1 } : {}}
              selected={f.muscle ? [f.muscle] : []}
              onSelect={(m) => setF({ ...f, part: 'all', muscle: f.muscle === m ? undefined : m })}
            />
            <div className="mt-3 flex h-8 items-center justify-center">
              {f.muscle ? (
                <button
                  onClick={() => setF({ ...f, muscle: undefined })}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink"
                >
                  {MUSCLE_ZH[f.muscle]} <X className="size-3.5" />
                </button>
              ) : (
                <span className="text-xs text-ink-3">点击身体上的肌肉，查看锻炼它的动作</span>
              )}
            </div>
          </div>
        )}
        <EquipmentPicker value={f.equipment} onChange={(equipment) => setF({ ...f, equipment })} available={equipment} />
        <div className="num px-1 pt-1 text-xs text-ink-3">共 {items.length} 个动作，⭐ 为常用动作</div>
      </div>

      <div className="px-2 pb-4 pt-1">
        {!ready ? (
          <LoadingRow />
        ) : items.length ? (
          <ExerciseList items={items} onItem={(e) => nav(`/exercises/${encodeURIComponent(e.id)}`)} />
        ) : (
          <EmptyState
            icon={<SearchX className="size-10 text-ink-3" />}
            title="没有找到相关动作"
            desc="试试别的关键词，或者创建一个自定义动作"
            action={
              <Button variant="secondary" size="sm" onClick={() => nav('/exercises/new')}>
                <Plus className="size-4" /> 自定义动作
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
