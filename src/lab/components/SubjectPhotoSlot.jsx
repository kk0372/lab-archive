import { useEffect, useRef, useState } from 'react'
import { TLink } from '../Layout.jsx'
import {
  fetchSubjectPhoto,
  setSubjectPhoto,
  removeSubjectPhoto,
  checkImageFile,
  imageUrl,
  fmtBytes,
  MAX_BYTES,
} from '../data/api.js'
import { processImage } from '../data/resize.js'

/**
 * 프로필 사진 슬롯 하나
 * slot: { id: 'yeon', code: 'S-01', name: '서예온', path: '/subject/01' }
 */
export default function SubjectPhotoSlot({ slot, disabled = false }) {
  const [current, setCurrent] = useState(undefined) // undefined = 확인 중, null = 없음
  const [staged, setStaged] = useState(null)        // { file, preview, original, resized }
  const [status, setStatus] = useState('idle')      // idle | processing | saving | confirm | removing
  const [note, setNote] = useState(null)            // { text, alert }
  const inputRef = useRef(null)
  const previewRef = useRef(null)

  /* 지금 사진 불러오기 */
  useEffect(() => {
    let alive = true
    fetchSubjectPhoto(slot.id)
      .then((r) => {
        if (alive) setCurrent(r?.path ?? null)
      })
      .catch((err) => {
        console.warn('[RF-01] subject photo unavailable:', err)
        if (alive) setCurrent(null)
      })
    return () => {
      alive = false
    }
  }, [slot.id])

  /* 화면을 떠날 때 미리보기 임시 주소 정리 */
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )

  const clearStaged = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setStaged(null)
  }

  const pick = async (file) => {
    if (!file) return
    const problem = checkImageFile(file)
    if (problem) {
      setNote({ alert: true, text: `${file.name} — ${problem}` })
      return
    }
    clearStaged()
    setStatus('processing')
    setNote(null)
    try {
      const r = await processImage(file)
      if (r.file.size > MAX_BYTES) throw new Error('TOO_LARGE')
      const preview = URL.createObjectURL(r.file)
      previewRef.current = preview
      setStaged({ file: r.file, preview, original: r.original, resized: r.resized })
      setNote({
        alert: false,
        text: r.resized
          ? `${fmtBytes(r.original)} → ${fmtBytes(r.file.size)} — commit to file.`
          : `${fmtBytes(r.file.size)} · original — commit to file.`,
      })
    } catch (err) {
      console.warn('[RF-01] photo processing failed:', err)
      setNote({ alert: true, text: `${file.name} — Unreadable image` })
    } finally {
      setStatus('idle')
    }
  }

  const commit = async () => {
    if (!staged || status === 'saving') return
    setStatus('saving')
    setNote(null)
    try {
      const path = await setSubjectPhoto(slot.id, staged.file)
      clearStaged()
      setCurrent(path)
      setNote({ alert: false, text: 'Photograph filed.' })
    } catch (err) {
      console.warn('[RF-01] photo upload failed:', err)
      setNote({ alert: true, text: 'Upload failed — previous photograph retained.' })
    } finally {
      setStatus('idle')
    }
  }

  const remove = async () => {
    if (status !== 'confirm') {
      setStatus('confirm')
      return
    }
    setStatus('removing')
    setNote(null)
    try {
      await removeSubjectPhoto(slot.id)
      setCurrent(null)
      setNote({ alert: false, text: 'Photograph removed.' })
    } catch (err) {
      console.warn('[RF-01] photo removal failed:', err)
      setNote({ alert: true, text: 'Removal failed — photograph retained.' })
    } finally {
      setStatus('idle')
    }
  }

  const busy = status === 'processing' || status === 'saving' || status === 'removing'
  const src = staged ? staged.preview : current ? imageUrl(current) : null
  const stateText = staged
    ? 'Staged — not saved'
    : current
      ? 'On file'
      : current === null
        ? 'Not on file'
        : 'Checking…'

  return (
    <div className="rf-photo">
      <div className={`rf-photo__plate${staged ? ' is-staged' : ''}${src ? '' : ' is-empty'}`}>
        {src && <img src={src} alt="" draggable="false" />}
        <span className="rf-photo__tag">{slot.code}</span>
        {staged && <span className="rf-photo__tag rf-photo__tag--new">Staged</span>}
        {status === 'processing' && <span className="rf-photo__proc">Processing…</span>}
      </div>

      <div className="rf-photo__info">
        <span className="rf-admin__name">
          {slot.code} {slot.name}
        </span>
        <span className={`rf-label rf-mono${staged ? ' rf-photo__staged' : ''}`}>{stateText}</span>

        <div className="rf-photo__actions">
          {!staged ? (
            <>
              <button
                type="button"
                className="rf-label rf-photo__btn"
                onClick={() => inputRef.current?.click()}
                disabled={busy || disabled || status === 'confirm'}
              >
                {current ? 'Replace' : '+ Upload'}
              </button>
              {current && (
                <button
                  type="button"
                  className={`rf-label rf-photo__btn rf-photo__btn--del${status === 'confirm' ? ' is-warn' : ''}`}
                  onClick={remove}
                  disabled={busy || disabled}
                >
                  {status === 'confirm'
                    ? 'Confirm remove'
                    : status === 'removing'
                      ? 'Removing…'
                      : 'Remove'}
                </button>
              )}
              {status === 'confirm' && (
                <button
                  type="button"
                  className="rf-label rf-photo__btn"
                  onClick={() => setStatus('idle')}
                >
                  Cancel
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="rf-label rf-photo__btn rf-photo__btn--go"
                onClick={commit}
                disabled={status === 'saving' || disabled}
              >
                {status === 'saving' ? 'Filing…' : 'Commit →'}
              </button>
              <button
                type="button"
                className="rf-label rf-photo__btn"
                onClick={() => {
                  clearStaged()
                  setNote(null)
                }}
                disabled={status === 'saving'}
              >
                Cancel
              </button>
            </>
          )}
          <TLink to={slot.path} className="rf-label rf-photo__view">
            View page →
          </TLink>
        </div>

        {note && (
          <p className={`rf-label rf-photo__note${note.alert ? ' is-alert' : ''}`} role="status">
            {note.text}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''   // 같은 파일을 다시 골라도 작동하게
        }}
      />
    </div>
  )
}