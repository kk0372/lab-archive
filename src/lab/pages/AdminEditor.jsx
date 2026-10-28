import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PAGES, TLink, useGo } from '../Layout.jsx'
import {
  SECTIONS,
  fetchPost,
  savePost,
  commitPost,
  setFlash,
  pad2,
  pad4,
  fmtDateTime,
  dayLabel,
  DAY_ONE,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import ImageField from '../components/ImageField.jsx'
import './admin.css'
import './editor.css'

const SUBJECTS = [
  { id: 'yeon', label: '서예온', code: 'S-01' },
  { id: 'evie', label: '이비', code: 'S-02' },
]

/* 구역별 입력칸 설정 */
const SPEC = {
  visual: { title: 'Title', titleRequired: true, body: 'Note', bodyRows: 4, bodyRequired: false },
  chronicles: { title: 'Title', titleRequired: true, body: 'Narrative', bodyRows: 16, bodyRequired: true },
  logs: { title: 'Heading — optional', titleRequired: false, body: 'Observation', bodyRows: 8, bodyRequired: true },
}

const EMPTY = {
  title: '',
  body: '',
  subjects: [],
  artist: '',
  artist_url: '',
  drawn_on: '',
  observed_at: '',
  access: 'public',
}

/* ISO 시각 ↔ datetime-local 입력값 */
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null)

function fromPost(p) {
  return {
    title: p.title ?? '',
    body: p.body ?? '',
    subjects: p.subjects ?? [],
    artist: p.artist ?? '',
    artist_url: p.artist_url ?? '',
    drawn_on: p.drawn_on ?? '',
    observed_at: toLocalInput(p.observed_at),
    access: p.access ?? 'public',
  }
}

/* 저장된 이미지 경로 → 이미지 칸 항목 */
const toItems = (paths) => (paths ?? []).map((path) => ({ key: path, kind: 'stored', path }))

/* 화면 입력값 → DB에 보낼 값 (구역에 해당하는 칸만) */
function toFields(form, section) {
  const f = {
    title: form.title.trim(),
    body: form.body,
    subjects: form.subjects,
    access: form.access,
  }
  if (section === 'visual') {
    let url = form.artist_url.trim()
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
    f.artist = form.artist.trim() || null
    f.artist_url = url || null
    f.drawn_on = form.drawn_on || null
  }
  if (section === 'logs') f.observed_at = fromLocalInput(form.observed_at)
  return f
}

function validate(form, section, imageCount) {
  const s = SPEC[section]
  if (s.titleRequired && !form.title.trim()) return 'Title required.'
  if (section === 'logs' && !form.observed_at) return 'Observation time required.'
  if (s.bodyRequired && !form.body.trim()) return `${s.body} required.`
  if (section === 'visual' && imageCount === 0) return 'At least one image required.'
  return null
}

function Gate({ note, title, text, blink = false, to, linkText }) {
  return (
    <main className="rf-admin">
      <div className="rf-admin__top">
        <span className="rf-label">(00) {note}</span>
        <span className="rf-label">RF-01 / Records</span>
      </div>
      <h1 className="rf-display rf-admin__title">{title}</h1>
      {to && (
        <div className="rf-recs__bar">
          <TLink to={to} className="rf-label rf-recs__back">{linkText}</TLink>
        </div>
      )}
      <p className={`rf-label ${blink ? 'rf-admin__loading' : 'rf-recs__empty'}`}>{text}</p>
    </main>
  )
}

export default function AdminEditor() {
  const { section, id } = useParams()
  const isNew = !id
  const postId = isNew ? null : Number(id)
  const valid = SECTIONS.includes(section) && (isNew || Number.isInteger(postId))
  const page = PAGES.find((p) => p.section === section)
  const spec = SPEC[section]
  const listPath = `/admin/${section}`
  const hasImages = section === 'visual'

  const go = useGo()
  const { loading, user, owner } = useAuth()
  const userId = user?.id ?? null

  const [form, setForm] = useState(null)       // null = 불러오는 중
  const [savedJson, setSavedJson] = useState('')
  const [items, setItems] = useState([])       // 이미지 칸 (화면 순서 = 저장 순서)
  const [savedImages, setSavedImages] = useState([])
  const [meta, setMeta] = useState(null)       // 저장된 글 정보 (번호, 날짜)
  const [missing, setMissing] = useState(false)
  const [status, setStatus] = useState('idle') // idle | saving | error
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(null) // { done, total }
  const [discard, setDiscard] = useState(false)

  const formRef = useRef(null)
  const bodyRef = useRef(null)

  const imagesDirty =
    items.length !== savedImages.length ||
    items.some((it, i) => it.kind !== 'stored' || it.path !== savedImages[i])
  const dirty = form !== null && (JSON.stringify(form) !== savedJson || imagesDirty)

  /* 불러오기 */
  useEffect(() => {
    if (!valid || !userId) return
    let alive = true
    setMissing(false)
    setStatus('idle')
    setMessage('')
    setProgress(null)
    setDiscard(false)

    if (isNew) {
      const init = {
        ...EMPTY,
        observed_at: section === 'logs' ? toLocalInput(new Date().toISOString()) : '',
      }
      setForm(init)
      setSavedJson(JSON.stringify(init))
      setItems([])
      setSavedImages([])
      setMeta(null)
      return
    }

    setForm(null)
    fetchPost(postId)
      .then((p) => {
        if (!alive) return
        if (!p || p.section !== section) {
          setMissing(true)
          return
        }
        const f = fromPost(p)
        setForm(f)
        setSavedJson(JSON.stringify(f))
        setItems(toItems(p.images))
        setSavedImages(p.images ?? [])
        setMeta(p)
      })
      .catch((err) => {
        console.warn('[RF-01] record unavailable:', err)
        if (alive) setMissing(true)
      })
    return () => {
      alive = false
    }
  }, [section, postId, isNew, valid, userId])

  /* 저장 안 한 변경이 있으면 탭 닫기·새로고침 때 경고 */
  useEffect(() => {
    if (!dirty) return
    const onUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [dirty])

  /* Cmd/Ctrl + S = 저장 */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* 본문 칸 자동으로 늘어나기 */
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [form?.body])

  /* ── 들어올 수 없는 경우 ── */
  if (!valid) {
    return <Gate note="Not found" title="No record" text="Unknown address." to="/admin" linkText="← Console" />
  }
  if (loading) {
    return <Gate note="Records" title={page.title} text="Verifying session…" blink />
  }
  if (!user) {
    return (
      <Gate
        note="Restricted"
        title="Restricted"
        text="Session required — authenticate to edit records."
        to="/admin"
        linkText="← Authenticate"
      />
    )
  }
  if (missing) {
    return (
      <Gate
        note="Not found"
        title="No record"
        text={`Record #${pad4(postId)} not found in ${page.title}.`}
        to={listPath}
        linkText={`← ${page.title}`}
      />
    )
  }
  if (!form) {
    return <Gate note="Revision" title={`Entry ${pad4(postId)}`} text="Retrieving record…" blink />
  }

  /* ── 입력 ── */
  const set = (key) => (e) => {
    const v = e.target.value
    setForm((f) => ({ ...f, [key]: v }))
    setDiscard(false)
  }

  const toggleSubject = (sid) => {
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(sid)
        ? f.subjects.filter((x) => x !== sid)
        : SUBJECTS.map((s) => s.id).filter((x) => x === sid || f.subjects.includes(x)),
    }))
  }

  const onImages = (next) => {
    setItems(next)
    setDiscard(false)
  }

  const onCancel = () => {
    if (dirty && !discard) {
      setDiscard(true)
      return
    }
    go(listPath)
  }

  const onSave = async (e) => {
    e?.preventDefault()
    if (status === 'saving') return
    if (items.some((it) => it.status === 'processing')) {
      setStatus('error')
      setMessage('Images still processing — wait a moment.')
      return
    }
    const problem = validate(form, section, items.length)
    if (problem) {
      setStatus('error')
      setMessage(problem)
      return
    }
    setStatus('saving')
    setMessage('')
    setProgress(null)
    try {
      const fields = toFields(form, section)
      const row = hasImages
        ? await commitPost(postId, section, fields, items, savedImages, setProgress)
        : await savePost(postId, section, fields)

      setFlash(section, `Record #${pad4(row.id)} ${isNew ? 'committed' : 'revised'}.`)
      // 떠날 때 '저장 안 함' 경고가 안 뜨게 저장된 상태로 맞춤
      setSavedJson(JSON.stringify(form))
      if (hasImages) {
        setItems(toItems(row.images))
        setSavedImages(row.images ?? [])
      }
      go(listPath)
    } catch (err) {
      console.warn('[RF-01] commit failed:', err)
      setStatus('error')
      setProgress(null)
      setMessage('Commit failed — record not saved. Uploaded files rolled back.')
    }
  }

  const saving = status === 'saving'
  const recNo = isNew ? 'New' : `#${pad4(postId)}`

  const savingText =
    progress && progress.total > 0 && progress.done < progress.total
      ? `Uploading ${pad2(progress.done + 1)} / ${pad2(progress.total)}`
      : 'Committing…'

  return (
    <main className="rf-admin rf-edit">
      <div className="rf-admin__top">
        <span className="rf-label">(00) {isNew ? 'New entry' : 'Revision'}</span>
        <span className="rf-label">RF-01 / {page.no}. {page.title}</span>
      </div>
      <h1 className="rf-display rf-admin__title">
        {isNew ? 'New entry' : `Entry ${pad4(postId)}`}
      </h1>

      <div className="rf-recs__bar">
        <button
          type="button"
          className={`rf-label rf-recs__back${discard ? ' is-warn' : ''}`}
          onClick={onCancel}
          disabled={saving}
        >
          {discard ? 'Discard changes? — click again' : `← ${page.title}`}
        </button>
        <span className={`rf-label rf-mono rf-edit__state${dirty ? ' is-dirty' : ''}`}>
          {dirty ? '● Unsaved changes' : 'No changes'}
        </span>
      </div>

      <form ref={formRef} className="rf-edit__grid" onSubmit={onSave} noValidate>
        {/* ── 왼쪽: 기록 정보 ── */}
        <aside className="rf-edit__side">
          <p className="rf-label rf-admin__caption">(Record)</p>
          <ul className="rf-spec">
            <li>
              <span className="rf-label">Record</span>
              <span className="rf-spec__value rf-mono">{recNo}</span>
            </li>
            <li>
              <span className="rf-label">Section</span>
              <span className="rf-spec__value rf-mono">{page.no}. {page.title}</span>
            </li>
            <li>
              <span className="rf-label">Created</span>
              <span className="rf-spec__value rf-mono">{fmtDateTime(meta?.created_at)}</span>
            </li>
            <li>
              <span className="rf-label">Revised</span>
              <span className="rf-spec__value rf-mono">{fmtDateTime(meta?.updated_at)}</span>
            </li>
            {hasImages && (
              <li>
                <span className="rf-label">Images</span>
                <span className="rf-spec__value rf-mono">{pad2(items.length)}</span>
              </li>
            )}
          </ul>

          {section === 'logs' && (
            <div className="rf-edit__day">
              <span className="rf-label">(Log stamp)</span>
              <b>{dayLabel(fromLocalInput(form.observed_at))}</b>
              {!DAY_ONE && (
                <span className="rf-label rf-edit__hint">
                  DAY 001 not set — api.js → DAY_ONE
                </span>
              )}
            </div>
          )}
        </aside>

        {/* ── 오른쪽: 입력 ── */}
        <div className="rf-edit__main">
          {/* 등급 */}
          <fieldset className="rf-edit__group">
            <legend className="rf-label rf-field__label">(Access)</legend>
            <div className="rf-seg" role="radiogroup" aria-label="Access">
              {['public', 'classified'].map((a) => (
                <button
                  key={a}
                  type="button"
                  role="radio"
                  aria-checked={form.access === a}
                  className={`rf-seg__opt${form.access === a ? ' is-on' : ''}`}
                  onClick={() => setForm((f) => ({ ...f, access: a }))}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="rf-label rf-edit__hint">
              {form.access === 'classified'
                ? `Visitors see only [CLASSIFIED] RF-01-C/${isNew ? '····' : pad4(postId)} and date. Access code required.`
                : 'Visible to all visitors.'}
            </p>
          </fieldset>

          {/* 관찰 시각 (RESEARCH LOGS) */}
          {section === 'logs' && (
            <div className="rf-field">
              <label className="rf-label rf-field__label" htmlFor="rf-observed">
                (Observed at)
              </label>
              <div className="rf-field__row">
                <input
                  id="rf-observed"
                  className="rf-field__input"
                  type="datetime-local"
                  value={form.observed_at}
                  onChange={set('observed_at')}
                />
                <button
                  type="button"
                  className="rf-label rf-field__toggle"
                  onClick={() =>
                    setForm((f) => ({ ...f, observed_at: toLocalInput(new Date().toISOString()) }))
                  }
                >
                  Now
                </button>
              </div>
            </div>
          )}

          {/* 제목 */}
          <label className="rf-field">
            <span className="rf-label rf-field__label">({spec.title})</span>
            <input
              className="rf-field__input rf-edit__title"
              type="text"
              value={form.title}
              onChange={set('title')}
              placeholder={section === 'logs' ? '—' : 'Untitled'}
            />
          </label>

          {/* 이미지 (VISUAL DATA) */}
          {hasImages && (
            <div className="rf-edit__group">
              <span className="rf-label rf-field__label">(Images — first = cover)</span>
              <ImageField items={items} onChange={onImages} disabled={saving} />
            </div>
          )}

          {/* 작가·날짜·링크 (VISUAL DATA) */}
          {hasImages && (
            <>
              <div className="rf-edit__row">
                <label className="rf-field">
                  <span className="rf-label rf-field__label">(Artist)</span>
                  <input
                    className="rf-field__input"
                    type="text"
                    value={form.artist}
                    onChange={set('artist')}
                    placeholder="@artist"
                  />
                </label>
                <label className="rf-field">
                  <span className="rf-label rf-field__label">(Drawn on)</span>
                  <input
                    className="rf-field__input"
                    type="date"
                    value={form.drawn_on}
                    onChange={set('drawn_on')}
                  />
                </label>
              </div>
              <label className="rf-field">
                <span className="rf-label rf-field__label">(Artist link)</span>
                <input
                  className="rf-field__input"
                  type="url"
                  inputMode="url"
                  spellCheck="false"
                  value={form.artist_url}
                  onChange={set('artist_url')}
                  placeholder="https://"
                />
              </label>
            </>
          )}

          {/* 등장인물 */}
          <fieldset className="rf-edit__group">
            <legend className="rf-label rf-field__label">(Subjects)</legend>
            <div className="rf-chips">
              {SUBJECTS.map((s) => {
                const on = form.subjects.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`rf-chip rf-chip--${s.id}${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleSubject(s.id)}
                  >
                    <i aria-hidden="true" />
                    ({s.code}) {s.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* 본문 */}
          <label className="rf-field">
            <span className="rf-label rf-field__label">({spec.body})</span>
            <textarea
              ref={bodyRef}
              className="rf-edit__body"
              rows={spec.bodyRows}
              value={form.body}
              onChange={set('body')}
              placeholder={hasImages ? '—' : 'Begin record.'}
            />
            <span className="rf-label rf-mono rf-edit__count">
              {form.body.length.toLocaleString()} chars
            </span>
          </label>

          {/* 저장·취소 */}
          <div className="rf-edit__actions">
            <button
              type="submit"
              className={`rf-btn${saving ? ' is-busy' : ''}`}
              disabled={saving || owner === false}
            >
              <span>{saving ? savingText : isNew ? 'Commit record' : 'Commit revision'}</span>
              <span aria-hidden="true">→</span>
              <i className="rf-btn__progress" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`rf-btn rf-btn--ghost${discard ? ' is-warn' : ''}`}
              onClick={onCancel}
              disabled={saving}
            >
              <span>{discard ? 'Discard?' : 'Cancel'}</span>
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <p
            className={`rf-label rf-admin__msg${status === 'error' || owner === false ? ' is-alert' : ''}`}
            role="status"
            aria-live="polite"
          >
            {owner === false
              ? 'This account is not the registered operator. Write access denied.'
              : message || 'Cmd / Ctrl + S to commit.'}
          </p>
        </div>
      </form>
    </main>
  )
}