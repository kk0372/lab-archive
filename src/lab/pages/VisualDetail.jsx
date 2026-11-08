import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TLink, useGo } from '../Layout.jsx'
import {
  fetchPost,
  fetchStubs,
  unlockClassified,
  savedCode,
  imageUrl,
  classifiedCode,
  fmtDateTime,
  pad2,
  pad4,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import './admin.css'          // 입력칸·버튼 스타일 재사용
import './visual-detail.css'

const SUBJECT_LABEL = { yeon: 'S-01 서예온', evie: 'S-02 이비' }
const specimenCode = (id) => `RF-01-V/${pad4(id)}`
const codeOf = (s) => (s.access === 'classified' ? classifiedCode(s.id) : specimenCode(s.id))
const safeUrl = (u) => (u && /^https?:\/\//i.test(u) ? u : null)

function fmtDate(v) {
  if (!v) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.replaceAll('-', '.')
  const d = new Date(v)
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
}

/* 입력 중이거나 메뉴가 열려 있으면 단축키 무시 */
function ignoreKey(e) {
  if (e.target?.closest?.('input, textarea, select')) return true
  return document.documentElement.classList.contains('rf-menu-open')
}

/**
 * 표본 하나 불러오기
 * - open: 볼 수 있음 (공개 글 / 로그인한 나 / 저장된 열람 코드로 열림)
 * - locked: CLASSIFIED, 코드 필요
 * - missing: 없음
 */
async function loadEntry(id) {
  const [post, stubs] = await Promise.all([fetchPost(id), fetchStubs()])
  const list = stubs.filter((s) => s.section === 'visual')   // 최신순

  if (post) {
    return post.section === 'visual' ? { kind: 'open', post, list } : { kind: 'missing', list }
  }

  const stub = list.find((s) => s.id === id)
  if (!stub) return { kind: 'missing', list }

  // 이 탭에서 이미 코드를 맞혔다면 다시 묻지 않음
  const code = savedCode()
  if (code) {
    const r = await unlockClassified(code)
    const p = r.ok ? r.posts.find((x) => x.id === id) : null
    if (p) return { kind: 'open', post: p, list, unlocked: true }
  }
  return { kind: 'locked', stub, list }
}

function Corners() {
  return (
    <>
      <span className="rf-insp__c rf-insp__c--tl" aria-hidden="true" />
      <span className="rf-insp__c rf-insp__c--tr" aria-hidden="true" />
      <span className="rf-insp__c rf-insp__c--bl" aria-hidden="true" />
      <span className="rf-insp__c rf-insp__c--br" aria-hidden="true" />
    </>
  )
}

/* ── 관찰대: 원본 비율로 보기 + 넘기기 ── */
function Viewer({ post, code }) {
  const images = post.images ?? []
  const n = images.length
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(0)
  const [loadedSrc, setLoadedSrc] = useState(null)
  const start = useRef(null)

  const src = n ? imageUrl(images[i]) : ''
  const loaded = loadedSrc === src

  const step = useCallback(
    (d) => {
      if (n < 2) return
      setDir(d)
      setI((x) => (x + d + n) % n)
    },
    [n],
  )

  const jump = (k) => {
    if (k === i) return
    setDir(k > i ? 1 : -1)
    setI(k)
  }

  /* 키보드 ← → */
  useEffect(() => {
    const onKey = (e) => {
      if (ignoreKey(e)) return
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  /* 앞뒤 장 미리 불러오기 */
  useEffect(() => {
    if (n < 2) return
    ;[i + 1, i - 1].forEach((k) => {
      const img = new Image()
      img.src = imageUrl(images[(k + n) % n])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n])

  /* 폰: 좌우로 밀어서 넘기기 */
  const onDown = (e) => {
    start.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = (e) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
  }

  if (!n) {
    return (
      <div className="rf-insp__viewer">
        <div className="rf-insp__stage">
          <span className="rf-label rf-insp__wait">No plate on file</span>
          <Corners />
        </div>
      </div>
    )
  }

  return (
    <div className="rf-insp__viewer">
      <div
        className="rf-insp__stage"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => (start.current = null)}
      >
        <div
          key={src}
          className={`rf-insp__slide${loaded ? ' is-loaded' : ''}`}
          style={{ '--dir': dir }}
        >
          <img
            ref={(el) => {
              if (el && el.complete && el.naturalWidth) setLoadedSrc(src)
            }}
            src={src}
            alt={`${post.title || code} — plate ${pad2(i + 1)}`}
            decoding="async"
            draggable="false"
            onLoad={() => setLoadedSrc(src)}
            onError={() => setLoadedSrc(src)}
          />
        </div>

        {!loaded && <span className="rf-label rf-insp__wait">Developing plate…</span>}

        <span className="rf-insp__tag rf-insp__tag--code">{code}</span>
        {n > 1 && (
          <span className="rf-insp__tag rf-insp__tag--plate">
            Plate {pad2(i + 1)} / {pad2(n)}
          </span>
        )}

        {n > 1 && (
          <>
            <button
              type="button"
              className="rf-insp__nav rf-insp__nav--prev"
              onClick={() => step(-1)}
              aria-label="Previous plate"
            >
              ←
            </button>
            <button
              type="button"
              className="rf-insp__nav rf-insp__nav--next"
              onClick={() => step(1)}
              aria-label="Next plate"
            >
              →
            </button>
          </>
        )}
        <Corners />
      </div>

      {n > 1 && (
        <ol className="rf-insp__strip">
          {images.map((p, k) => (
            <li key={p}>
              <button
                type="button"
                className={`rf-insp__thumb${k === i ? ' is-on' : ''}`}
                onClick={() => jump(k)}
                aria-label={`Plate ${pad2(k + 1)}`}
                aria-current={k === i ? 'true' : undefined}
              >
                <img src={imageUrl(p)} alt="" loading="lazy" draggable="false" />
                <span>{pad2(k + 1)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="rf-label rf-mono rf-insp__under">
        <span>Full frame · original ratio</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="rf-insp__ext">
          Open original ↗
        </a>
      </div>
    </div>
  )
}

/* ── 기록표 ── */
function Record({ post, code, owner, unlocked }) {
  const url = safeUrl(post.artist_url)
  const classified = post.access === 'classified'
  const subjects = (post.subjects ?? []).map((s) => SUBJECT_LABEL[s] ?? s)

  return (
    <aside className="rf-insp__info">
      <p className="rf-label">(Specimen record)</p>
      <h2 className="rf-insp__name">{post.title || '(Untitled)'}</h2>

      {classified && (
        <span className="rf-insp__flag">
          Classified · {unlocked ? 'clearance granted' : 'owner view'}
        </span>
      )}

      <ul className="rf-spec">
        <li>
          <span className="rf-label">Code</span>
          <span className="rf-spec__value rf-mono">{code}</span>
        </li>
        <li>
          <span className="rf-label">Artist</span>
          <span className="rf-spec__value rf-mono">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" className="rf-insp__ext">
                {post.artist || new URL(url).hostname} ↗
              </a>
            ) : (
              post.artist || 'Unknown'
            )}
          </span>
        </li>
        <li>
          <span className="rf-label">Drawn on</span>
          <span className="rf-spec__value rf-mono">{fmtDate(post.drawn_on)}</span>
        </li>
        <li>
          <span className="rf-label">Subjects</span>
          <span className="rf-spec__value rf-mono">{subjects.length ? subjects.join(' · ') : '—'}</span>
        </li>
        <li>
          <span className="rf-label">Plates</span>
          <span className="rf-spec__value rf-mono">{pad2(post.images?.length ?? 0)}</span>
        </li>
        <li>
          <span className="rf-label">Logged</span>
          <span className="rf-spec__value rf-mono">{fmtDateTime(post.created_at)}</span>
        </li>
        <li>
          <span className="rf-label">Access</span>
          <span className="rf-spec__value rf-mono">{post.access}</span>
        </li>
      </ul>

      {post.body?.trim() && (
        <div className="rf-insp__note">
          <p className="rf-label">(Note)</p>
          <p className="rf-insp__text">{post.body}</p>
        </div>
      )}

      {owner === true && (
        <TLink
          to={`/admin/visual/${post.id}?from=${encodeURIComponent(`/visual/${post.id}`)}`}
          className="rf-label rf-insp__edit"
        >
          Edit record →
        </TLink>
      )}
    </aside>
  )
}

/* ── 잠긴 표본: 열람 코드 입력 ── */
function LockGate({ stub, onUnlocked }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle') // idle | busy | error
  const [attempts, setAttempts] = useState(0)
  const busy = status === 'busy'

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy || !code.trim()) return
    setStatus('busy')
    const r = await unlockClassified(code.trim())
    const p = r.ok ? r.posts.find((x) => x.id === stub.id) : null
    if (!p) {
      setAttempts((n) => n + 1)
      setStatus('error')
      setCode('')
      return
    }
    onUnlocked(p)
  }

  return (
    <div className="rf-insp__grid">
      <div className="rf-insp__viewer">
        <div className="rf-insp__stage rf-insp__hatch">
          <div className="rf-insp__seal">
            <span className="rf-insp__sealtag">[Classified]</span>
            <b>{classifiedCode(stub.id)}</b>
            <span>Access restricted</span>
          </div>
          <Corners />
        </div>
        <div className="rf-label rf-mono rf-insp__under">
          <span>Plate withheld</span>
          <span>Logged {fmtDate(stub.created_at)}</span>
        </div>
      </div>

      <form className="rf-insp__info" onSubmit={onSubmit} noValidate>
        <p className="rf-label">(Access code required)</p>
        <span className="rf-insp__bar-redact" aria-hidden="true" />
        <p className="rf-insp__text rf-insp__lead">
          This specimen is sealed. Enter the access code to inspect.
        </p>

        <label className="rf-field">
          <span className="rf-label rf-field__label">(Access code)</span>
          <input
            className="rf-field__input"
            type="password"
            name="access-code"
            autoComplete="off"
            spellCheck="false"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (status === 'error') setStatus('idle')
            }}
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          className={`rf-btn${busy ? ' is-busy' : ''}`}
          disabled={busy || !code.trim()}
        >
          <span>{busy ? 'Verifying…' : 'Request access'}</span>
          <span aria-hidden="true">→</span>
          <i className="rf-btn__progress" aria-hidden="true" />
        </button>

        <p
          className={`rf-label rf-admin__msg${status === 'error' ? ' is-alert' : ''}`}
          role="status"
          aria-live="polite"
        >
          {status === 'error'
            ? `Access denied — code rejected · attempt ${pad2(attempts)}`
            : 'All access attempts are logged.'}
        </p>
      </form>
    </div>
  )
}

/* ── 앞뒤 표본 ── */
function Pager({ list, id }) {
  const k = list.findIndex((s) => s.id === id)
  if (k < 0 || list.length < 2) return null
  const newer = list[k - 1]
  const older = list[k + 1]

  return (
    <nav className="rf-insp__pager" aria-label="Adjacent specimens">
      {newer ? (
        <TLink to={`/visual/${newer.id}`} className="rf-insp__pg">
          <span className="rf-label">← Newer</span>
          <b>{codeOf(newer)}</b>
        </TLink>
      ) : (
        <span />
      )}
      <span className="rf-label rf-mono">
        {pad2(k + 1)} / {pad2(list.length)}
      </span>
      {older ? (
        <TLink to={`/visual/${older.id}`} className="rf-insp__pg rf-insp__pg--older">
          <span className="rf-label">Older →</span>
          <b>{codeOf(older)}</b>
        </TLink>
      ) : (
        <span />
      )}
    </nav>
  )
}

export default function VisualDetail() {
  const { id } = useParams()
  const postId = Number(id)
  const valid = Number.isInteger(postId) && postId > 0
  const go = useGo()
  const { loading, user, owner } = useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState({ kind: 'loading' })

  useEffect(() => {
    if (!valid || loading) return
    let alive = true
    setState({ kind: 'loading' })
    loadEntry(postId)
      .then((r) => {
        if (alive) setState(r)
      })
      .catch((err) => {
        console.warn('[RF-01] specimen unavailable:', err)
        if (alive) setState({ kind: 'failed' })
      })
    return () => {
      alive = false
    }
  }, [postId, valid, loading, userId])

  /* Esc → 목록으로 */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || ignoreKey(e)) return
      go('/visual')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const kind = valid ? state.kind : 'missing'
  const code =
    kind === 'open' ? codeOf(state.post) : kind === 'locked' ? classifiedCode(postId) : '—'

  const statusText = {
    loading: 'Retrieving…',
    open: 'Specimen on file',
    locked: 'Sealed',
    missing: 'Not found',
    failed: 'Retrieval failed',
  }[kind]

  return (
    <main className="rf-insp">
      <div className="rf-insp__top">
        <span className="rf-label">(05) Inspection</span>
        <span className="rf-label rf-mono">{code}</span>
      </div>
      <h1 className="rf-display rf-insp__title">
        {kind === 'missing' ? 'No record' : `Specimen ${valid ? pad4(postId) : ''}`}
      </h1>

      <div className="rf-insp__bar">
        <TLink to="/visual" className="rf-label rf-insp__back">← Visual data</TLink>
        <span className={`rf-label rf-mono${kind === 'failed' ? ' rf-admin__alert' : ''}`}>
          {statusText}
        </span>
      </div>

      {kind === 'loading' && <p className="rf-label rf-admin__loading">Developing plate…</p>}

      {kind === 'failed' && (
        <p className="rf-label rf-insp__state rf-admin__alert">Retrieval failed — reload to retry.</p>
      )}

      {kind === 'missing' && (
        <p className="rf-label rf-insp__state">
          {valid ? `Specimen #${pad4(postId)} not found in archive.` : 'Unknown address.'}
        </p>
      )}

      {kind === 'locked' && (
        <LockGate
          stub={state.stub}
          onUnlocked={(p) => setState((s) => ({ kind: 'open', post: p, list: s.list, unlocked: true }))}
        />
      )}

      {kind === 'open' && (
        <div className="rf-insp__grid">
          <Viewer key={state.post.id} post={state.post} code={code} />
          <Record post={state.post} code={code} owner={owner} unlocked={state.unlocked} />
        </div>
      )}

      {(kind === 'open' || kind === 'locked') && <Pager list={state.list} id={postId} />}
    </main>
  )
}