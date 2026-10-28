import { useEffect, useRef, useState } from 'react'
import { imageUrl, pad2, MAX_IMAGES, checkImageFile, fmtBytes } from '../data/api.js'

let seq = 0
const newKey = () => `new-${Date.now()}-${seq++}`

/**
 * 이미지 칸
 * items: [{ key, kind: 'stored', path } | { key, kind: 'new', file, preview }]
 * 맨 앞 = 대표(COVER)
 */
export default function ImageField({ items, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const itemsRef = useRef(items)
  const depth = useRef(0)
  const [over, setOver] = useState(false)
  const [note, setNote] = useState(null)   // { text, alert }
  const [moved, setMoved] = useState(null) // { key, n } 방금 옮긴 장 (반짝임용)

  itemsRef.current = items
  const full = items.length >= MAX_IMAGES

  /* 화면을 떠날 때 미리보기용 임시 주소 정리 */
  useEffect(
    () => () => {
      itemsRef.current.forEach((it) => it.preview && URL.revokeObjectURL(it.preview))
    },
    [],
  )

  /* 칸 밖에 파일을 잘못 놓아도 브라우저가 그 파일을 열지 않게 */
  useEffect(() => {
    const stop = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
    }
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragover', stop)
      window.removeEventListener('drop', stop)
    }
  }, [])

  const addFiles = (list) => {
    if (disabled) return
    const files = Array.from(list ?? [])
    if (!files.length) return

    const room = MAX_IMAGES - items.length
    const accepted = []
    const rejected = []

    for (const f of files) {
      const problem = checkImageFile(f)
      if (problem) rejected.push(`${f.name} — ${problem}`)
      else if (accepted.length >= room) rejected.push(`${f.name} — Limit ${MAX_IMAGES}`)
      else accepted.push({ key: newKey(), kind: 'new', file: f, preview: URL.createObjectURL(f) })
    }

    if (accepted.length) onChange([...items, ...accepted])

    setNote(
      rejected.length
        ? { alert: true, text: `${pad2(rejected.length)} rejected: ${rejected.join(' / ')}` }
        : { alert: false, text: `${pad2(accepted.length)} staged — uploads on commit.` },
    )
  }

  const remove = (key) => {
    const it = items.find((x) => x.key === key)
    if (it?.preview) URL.revokeObjectURL(it.preview)
    onChange(items.filter((x) => x.key !== key))
    setNote(null)
  }

  /* ── 순서 바꾸기 ── */
  const flash = (key) => setMoved((m) => ({ key, n: (m?.n ?? 0) + 1 }))

  /* 한 칸 앞(-1) / 뒤(+1) */
  const move = (key, dir) => {
    const from = items.findIndex((x) => x.key === key)
    const to = from + dir
    if (from < 0 || to < 0 || to >= items.length) return
    const next = items.slice()
    ;[next[from], next[to]] = [next[to], next[from]]
    onChange(next)
    flash(key)
    setNote({
      alert: false,
      text:
        to === 0
          ? `Cover set — ${pad2(from + 1)} → 01.`
          : `Moved ${pad2(from + 1)} → ${pad2(to + 1)}.`,
    })
  }

  /* 맨 앞으로 보내서 대표로 */
  const setCover = (key) => {
    const from = items.findIndex((x) => x.key === key)
    if (from <= 0) return
    const next = items.slice()
    const [it] = next.splice(from, 1)
    next.unshift(it)
    onChange(next)
    flash(key)
    setNote({ alert: false, text: `Cover set — ${pad2(from + 1)} → 01.` })
  }

  /* 끌어다 놓기 (PC, 파일 넣기용) */
  const onDragEnter = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    depth.current += 1
    setOver(true)
  }
  const onDragOver = (e) => {
    if (!e.dataTransfer?.types?.includes('Files')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = disabled || full ? 'none' : 'copy'
  }
  const onDragLeave = () => {
    depth.current = Math.max(0, depth.current - 1)
    if (depth.current === 0) setOver(false)
  }
  const onDrop = (e) => {
    e.preventDefault()
    depth.current = 0
    setOver(false)
    addFiles(e.dataTransfer?.files)
  }

  const zoneCls = ['rf-img__drop', over ? 'is-over' : '', full || disabled ? 'is-full' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className="rf-img">
      <div
        className={zoneCls}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <span className="rf-label rf-img__droptext">
          {full ? `Limit reached — ${MAX_IMAGES} images` : 'Drop images here'}
        </span>
        <button
          type="button"
          className="rf-label rf-img__pick"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || full}
        >
          + Select files
        </button>
        <span className="rf-label rf-mono rf-img__limit">
          {pad2(items.length)} / {MAX_IMAGES} · JPG PNG WEBP GIF · ≤ 50 MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''   // 같은 파일을 다시 골라도 작동하게
          }}
        />
      </div>

      {items.length > 0 && (
        <ol className="rf-img__grid">
          {items.map((it, i) => {
            const first = i === 0
            const last = i === items.length - 1
            const flashing = moved?.key === it.key
            // 같은 장을 연달아 옮겨도 반짝임이 매번 다시 재생되게 이름을 번갈아 씀
            const flashStyle = flashing
              ? { animation: `rf-img-moved-${moved.n % 2 ? 'a' : 'b'} 700ms var(--ease-out)` }
              : undefined

            return (
              <li key={it.key} className={`rf-img__tile${first ? ' is-cover' : ''}`}>
                <div className="rf-img__frame" style={flashStyle}>
                  <img
                    src={it.kind === 'new' ? it.preview : imageUrl(it.path)}
                    alt=""
                    loading="lazy"
                    draggable="false"
                  />
                  {first && <span className="rf-img__badge">Cover</span>}
                  {it.kind === 'new' && (
                    <span className="rf-img__badge rf-img__badge--new">New</span>
                  )}
                  <button
                    type="button"
                    className="rf-img__x"
                    onClick={() => remove(it.key)}
                    disabled={disabled}
                    aria-label={`Remove image ${pad2(i + 1)}`}
                  >
                    ×
                  </button>
                </div>

                <div className="rf-label rf-mono rf-img__meta">
                  <span>{pad2(i + 1)}</span>
                  <span>{it.kind === 'new' ? fmtBytes(it.file.size) : 'On file'}</span>
                </div>

                {/* 순서 조작 */}
                <div className="rf-img__ctrl">
                  <button
                    type="button"
                    className="rf-img__step"
                    onClick={() => move(it.key, -1)}
                    disabled={disabled || first}
                    aria-label={`Move image ${pad2(i + 1)} earlier`}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="rf-img__step"
                    onClick={() => move(it.key, 1)}
                    disabled={disabled || last}
                    aria-label={`Move image ${pad2(i + 1)} later`}
                  >
                    →
                  </button>
                  {first ? (
                    <span className="rf-label rf-img__cover is-on">Cover</span>
                  ) : (
                    <button
                      type="button"
                      className="rf-label rf-img__cover"
                      onClick={() => setCover(it.key)}
                      disabled={disabled}
                    >
                      Set cover
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {note && (
        <p className={`rf-label rf-img__note${note.alert ? ' is-alert' : ''}`} role="status">
          {note.text}
        </p>
      )}
    </div>
  )
}