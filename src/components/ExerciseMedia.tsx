import { useEffect, useState } from 'react'
import type { Exercise } from '../lib/types'
import { imageUrl } from '../lib/catalog'
import { cx } from '../lib/utils'
import { MiniBody } from './BodyMap'
import { BODY_PARTS } from '../lib/catalog'
import { partOf } from '../lib/exercises'

/** 带镜像回退的图片：jsDelivr → GitHub Raw → 兜底插画 */
function useMirrorSrc(path?: string) {
  const [mirror, setMirror] = useState(0)
  useEffect(() => {
    setMirror(0)
  }, [path])
  return {
    src: path && mirror < 2 ? imageUrl(path, mirror) : undefined,
    onError: () => setMirror((m) => m + 1),
  }
}

function Fallback({ ex, className }: { ex: Exercise; className?: string }) {
  const part = BODY_PARTS.find((p) => p.key === partOf(ex))
  return (
    <div className={cx('grid place-items-center bg-surface-2', className)}>
      <MiniBody muscles={ex.primary} color={part?.color} className="h-[86%]" />
    </div>
  )
}

/** 列表缩略图 */
export function ExerciseThumb({ ex, className }: { ex: Exercise; className?: string }) {
  const { src, onError } = useMirrorSrc(ex.images[0])
  const [loaded, setLoaded] = useState(false)
  if (!src) return <Fallback ex={ex} className={cx('overflow-hidden', className)} />
  return (
    <div className={cx('relative overflow-hidden bg-white', className)}>
      {!loaded && <Fallback ex={ex} className="absolute inset-0" />}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onError}
        className={cx('size-full object-cover transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
      />
    </div>
  )
}

/** 详情页动图：两张示范图交替播放，模拟动作起止 */
export function ExerciseAnimation({ ex, className }: { ex: Exercise; className?: string }) {
  const [frame, setFrame] = useState(0)
  const [failed, setFailed] = useState<number[]>([])
  const frames = ex.images.slice(0, 2)
  useEffect(() => {
    if (frames.length < 2) return
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1100)
    return () => clearInterval(t)
  }, [frames.length])
  if (!frames.length || failed.length >= frames.length * 2) return <Fallback ex={ex} className={className} />
  return (
    <div className={cx('relative overflow-hidden bg-white', className)}>
      {frames.map((p, i) => {
        const mirror = failed.filter((x) => x === i).length
        return (
          <img
            key={p + mirror}
            src={imageUrl(p, mirror)}
            alt={`${ex.zh} 动作示范 ${i + 1}`}
            onError={() => setFailed((f) => [...f, i])}
            className={cx(
              'absolute inset-0 size-full object-contain transition-opacity duration-500',
              frame === i ? 'opacity-100' : 'opacity-0',
            )}
          />
        )
      })}
      {frames.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {frames.map((_, i) => (
            <span key={i} className={cx('h-1.5 rounded-full transition-all', frame === i ? 'w-5 bg-black/70' : 'w-1.5 bg-black/25')} />
          ))}
        </div>
      )}
    </div>
  )
}
