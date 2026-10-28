import { useEffect, useRef, useState } from 'react'
import { imageUrl, pad2, MAX_IMAGES, MAX_BYTES, checkImageFile, fmtBytes } from '../data/api.js'
import { processImage, RESIZE } from '../data/resize.js'

let seq = 0
const newKey = () => `new-${Date.now()}-${seq++}`

/* 썸네일 아래 용량 표시 */
function sizeText(it) {
  if (it.kind !== 'new') return 'On file'
  if (it.status === 'processing') return 'Processing…'
  if (it.resized) return `${fmtBytes(it.original)} → ${fmtBytes(it.file.size)}`
  return `${fmtBytes(it.file.size)} · Orig.`
}

/**
 * 이미지 칸
 * items: [{ key, kind: 'stored', path }
 *       | { key, kind: 'new', file, preview, status: 'processing' | 'ready', original, resized }]
 * 맨 앞 = 대표(COVER)
 * onChange: 새 목록 또는 (이전 목록 → 새 목록) 함수를 받음
 */
export default function ImageField({ items, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const itemsRef = useRef(items)
  const depth = useRef(0)
  const queue = useRef([])        // 처리 대기 { key, file }
  const running = useRef(false)
  const alive = useRef(true)
  const rejects = useRef([])      // 이번 묶음에서 거절된 파일

  const [over, setOver] = useState(false)
  const [note, setNote] = useState(null)   // { text, alert }
  const [moved, setMoved] = useState(null) // { key, n }

  itemsRef.current = items
  const full = items.length >= MAX_IMAGES

  /* 화면을 떠날 때: 처리 중단 + 미리보기용 임시 주소 정리 */
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      itemsRef.current.forEach((it) => it.preview && URL.revokeObjectURL(it.preview))
    }
  }, [])

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

  /* ── 처리 대기열: 한 장씩 차례로 줄이기 ── */
  const pump = async () => {
    if (running.current) return
    running.current = true
    let count = 0
    let before = 0
    let after = 0

    while (queue.current.length && alive.current) {
      const { key, file } = queue.current.shift()
      try {
        const r = await processImage(file)
        if (!alive.current) break
        if (r.file.size > MAX_BYTES) throw new Error('TOO_LARGE')
        count += 1
        before += r.original
        after += r.file.size
        onChange((prev) =>
          prev.map((x) =>
            x.key === key
              ? { ...x, file: r.file, original: r.original, resized: r.resized, status: 'ready' }
              : x,
          ),
        )
      } catch (err) {
        console.warn('[RF-01] image processing failed:', file.name, err)
        if (!alive.current) break
        rejects.current.push(`${file.name} — Unreadable image`)
        const gone = itemsRef.current.find((x) => x.key === key)
        if (gone?.preview) URL.revokeObjectURL(gone.preview)
        onChange((prev) => prev.filter((x) => x.key !== key))
      }
    }

    running.current = false
    if (!alive.current) return

    const fails = rejects.current
    rejects.current = []
    if (fails.length) {
      setNote({ alert: true, text: `${pad2(fails.length)} rejected: ${fails.join(' / ')}` })
    } else if (count) {
      setNote({
        alert: false,
        text: `${pad2(count)} staged · ${fmtBytes(before)} → ${fmtBytes(after)} — uploads on commit.`,
      })
    }
  }

  const addFiles = (list) => {
    if (disabled) return
    const files = Array.from(list ?? [])
    if (!files.length) return

    const room = MAX_IMAGES - itemsRef.current.length
    const accepted = []

    for (const f of files) {
      const problem = checkImageFile(f)
      if (problem) rejects.current.push(`${f.name} — ${problem}`)
      else if (accepted.length >= room) rejects.current.push(`${f.name} — Limit ${MAX_IMAGES}`)
      else
        accepted.push({
          key: newKey(),
          kind: 'new',
          file: f,
          preview: URL.createObjectURL(f),
          status: 'processing',
          original: f.size,
          resized: false,
        })
    }

    if (!accepted.length) {
      const fails = rejects.current
      rejects.current = []
      setNote({ alert: true, text: `${pad2(fails.length)} rejected: ${fails.join(' / ')}` })
      return
    }

    onChange((prev) => [...prev, ...accepted])
    accepted.forEach((a) => queue.current.push({ key: a.key, file: a.file }))
    setNote({ alert: false, text: `Processing ${pad2(accepted.length)} image(s)…` })
    pump()
  }

  const remove = (key) => {
    const it = itemsRef.current.find((x) => x.key === key)
    if (it?.preview) URL.revokeObjectURL(it.preview)
    queue.current = queue.current.filter((q) => q.key !== key)   // 대기 중이면 처리도 취소
    onChange((prev) => prev.filter((x) => x.key !== key))
    setNote(null)
  }

  /* ── 순서 바꾸기 ── */
  const flash = (key) => setMoved((m) => ({ key, n: (m?.n ?? 0) + 1 }))

  const move = (key, dir) => {
    const from = itemsRef.current.findIndex((x) => x.key === key)
    const to = from + dir
    if (from < 0 || to < 0 || to >= itemsRef.current.length) return
    onChange((prev) => {
      const i = prev.findIndex((x) => x.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = prev.slice()
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    flash(key)
    setNote({
      alert: false,
      text:
        to === 0
          ? `Cover set — ${pad2(from + 1)} → 01.`
          : `Moved ${pad2(from + 1)} → ${pad2(to + 1)}.`,
    })
  }

  const setCover = (key) => {
    const from = itemsRef.current.findIndex((x) => x.key === key)
    if (from <= 0) return
    onChange((prev) => {
      const i = prev.findIndex((x) => x.key === key)
      if (i <= 0) return prev
      const next = prev.slice()
      const [it] = next.splice(i, 1)
      next.unshift(it)
      return next
    })
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
          {pad2(items.length)} / {MAX_IMAGES} · ≤ 50 MB · Auto-resize ≤ {RESIZE.maxEdge}px
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
            const processing = it.status === 'processing'
            const flashStyle =
              moved?.key === it.key
                ? { animation: `rf-img-moved-${moved.n % 2 ? 'a' : 'b'} 700ms var(--ease-out)` }
                : undefined

            return (
              <li
                key={it.key}
                className={`rf-img__tile${first ? ' is-cover' : ''}${processing ? ' is-processing' : ''}`}
              >
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
                  {processing && (
                    <span className="rf-img__proc" aria-hidden="true">
                      <i />
                    </span>
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
                  <span className={it.resized ? 'is-shrunk' : undefined}>{sizeText(it)}</span>
                </div>

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