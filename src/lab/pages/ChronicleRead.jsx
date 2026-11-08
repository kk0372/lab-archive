import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TLink, useGo } from '../Layout.jsx'
import {
  fetchPost,
  fetchStubs,
  unlockClassified,
  savedCode,
  classifiedCode,
  fmtDateTime,
  pad2,
  pad4,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import {
  narrativeCode,
  loadSerif,
  toBlocks,
  textStats,
  SIZES,
  loadPrefs,
  savePrefs,
  getProgress,
  setProgress,
} from '../data/reading.js'
import './admin.css'          // 입력칸·버튼 스타일 재사용
import './chronicles.css'

const SUBJECT_LABEL = { yeon: 'S-01 서예온', evie: 'S-02 이비' }
const codeOf = (s) => (s.access === 'classified' ? classifiedCode(s.id) : narrativeCode(s.id))

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
}

/* 입력 중이거나 메뉴가 열려 있으면 단축키 무시 */
function ignoreKey(e) {
  if (e.target?.closest?.('input, textarea, select')) return true
  return document.documentElement.classList.contains('rf-menu-open')
}

async function loadEntry(id) {
  const [post, stubs] = await Promise.all([fetchPost(id), fetchStubs()])
  const list = stubs.filter((s) => s.section === 'chronicles') // 최신순

  if (post) {
    return post.section === 'chronicles' ? { kind: 'open', post, list } : { kind: 'missing', list }
  }

  const stub = list.find((s) => s.id === id)
  if (!stub) return { kind: 'missing', list }

  const code = savedCode()
  if (code) {
    const r = await unlockClassified(code)
    const p = r.ok ? r.posts.find((x) => x.id === id) : null
    if (p) return { kind: 'open', post: p, list, unlocked: true }
  }
  return { kind: 'locked', stub, list }
}

/* 화면 가운데 기준으로 본문을 얼마나 읽었는지 (0~1) */
function readRatio(el) {
  const r = el.getBoundingClientRect()
  if (!r.height) return 0
  return Math.min(1, Math.max(0, (window.innerHeight * 0.5 - r.top) / r.height))
}

function scrollToRatio(el, p, behavior = 'auto') {
  const r = el.getBoundingClientRect()
  const top = r.top + window.scrollY + p * r.height - window.innerHeight * 0.5
  window.scrollTo({ top: Math.max(0, top), behavior })
}

/* ── 읽기 화면 ── */
function Reader({ post, owner, unlocked }) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [pct, setPct] = useState(0)
  const [resume, setResume] = useState(() => {
    const p = getProgress(post.id)
    return p != null && p > 0.03 && p < 0.97 ? p : null
  })

  const textRef = useRef(null)
  const barRef = useRef(null)

  const blocks = useMemo(() => toBlocks(post.body), [post.body])
  const stats = textStats(post.body)
  const code = codeOf(post)
  const classified = post.access === 'classified'
  const subjects = (post.subjects ?? []).map((s) => SUBJECT_LABEL[s] ?? s)

  useEffect(() => savePrefs(prefs), [prefs])

  /* 스크롤 → 진행선 + 퍼센트 + 읽은 위치 저장 */
  useEffect(() => {
    let raf = 0
    let last = -1
    let saveTimer = 0

    const measure = (save) => {
      raf = 0
      const el = textRef.current
      if (!el) return
      const p = readRatio(el)
      barRef.current?.style.setProperty('--p', p.toFixed(4))
      const n = Math.round(p * 100)
      if (n !== last) {
        last = n
        setPct(n)
      }
      // 맨 위(0%)는 저장 안 함: 페이지를 열자마자 이전 기록이 지워지지 않게
      if (save && p >= 0.02) {
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => setProgress(post.id, p >= 0.98 ? 1 : p), 400)
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => measure(true))
    }
    const onResize = () => {
      if (!raf) raf = requestAnimationFrame(() => measure(false))
    }

    measure(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(saveTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [post.id, prefs.face, prefs.size])

  /* 글꼴·크기를 바꿔도 읽던 문장을 화면 가운데에 유지 */
  const adjust = (next) => {
    const el = textRef.current
    const p = el ? readRatio(el) : 0
    setPrefs((cur) => ({ ...cur, ...next }))
    if (p > 0 && p < 1) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => textRef.current && scrollToRatio(textRef.current, p)),
      )
    }
  }

  const onResume = () => {
    if (textRef.current && resume != null) scrollToRatio(textRef.current, resume, 'smooth')
    setResume(null)
  }

  return (
    <>
      <div className="rf-read__progress" ref={barRef} aria-hidden="true">
        <i />
      </div>

      <div className="rf-read__grid">
        {/* ── 왼쪽: 읽기 설정 + 기록표 ── */}
        <aside className="rf-read__side">
          <p className="rf-label">(Reader)</p>

          <div className="rf-read__ctrls">
            <div className="rf-read__ctrl">
              <span className="rf-label">Face</span>
              <div className="rf-read__seg" role="radiogroup" aria-label="Typeface">
                {[
                  ['serif', '명조 Serif'],
                  ['sans', '고딕 Sans'],
                ].map(([f, label]) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={prefs.face === f}
                    className={`rf-read__opt${prefs.face === f ? ' is-on' : ''}`}
                    onClick={() => prefs.face !== f && adjust({ face: f })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rf-read__ctrl">
              <span className="rf-label">Size</span>
              <div className="rf-read__size">
                <button
                  type="button"
                  className="rf-read__step"
                  onClick={() => adjust({ size: prefs.size - 1 })}
                  disabled={prefs.size === 0}
                  aria-label="Smaller text"
                >
                  A−
                </button>
                <span className="rf-label rf-mono rf-read__px">{SIZES[prefs.size]}px</span>
                <button
                  type="button"
                  className="rf-read__step"
                  onClick={() => adjust({ size: prefs.size + 1 })}
                  disabled={prefs.size === SIZES.length - 1}
                  aria-label="Larger text"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="rf-read__ctrl">
              <span className="rf-label">Progress</span>
              <span className="rf-label rf-mono rf-read__pct">
                {String(pct).padStart(3, '0')}%
              </span>
            </div>
          </div>

          {resume != null && (
            <button type="button" className="rf-label rf-read__resume" onClick={onResume}>
              Resume at {pad2(Math.round(resume * 100))}% ↓
            </button>
          )}

          <ul className="rf-spec rf-read__spec">
            <li>
              <span className="rf-label">Code</span>
              <span className="rf-spec__value rf-mono">{code}</span>
            </li>
            <li>
              <span className="rf-label">Subjects</span>
              <span className="rf-spec__value rf-mono">
                {subjects.length ? subjects.join(' · ') : '—'}
              </span>
            </li>
            <li>
              <span className="rf-label">Length</span>
              <span className="rf-spec__value rf-mono">
                {stats.chars.toLocaleString()} · ≈ {pad2(stats.minutes)} min
              </span>
            </li>
            <li>
              <span className="rf-label">Logged</span>
              <span className="rf-spec__value rf-mono">{fmtDateTime(post.created_at)}</span>
            </li>
            <li>
              <span className="rf-label">Revised</span>
              <span className="rf-spec__value rf-mono">{fmtDateTime(post.updated_at)}</span>
            </li>
            <li>
              <span className="rf-label">Access</span>
              <span className="rf-spec__value rf-mono">{post.access}</span>
            </li>
          </ul>

          {owner === true && (
            <TLink
              to={`/admin/chronicles/${post.id}?from=${encodeURIComponent(`/chronicles/${post.id}`)}`}
              className="rf-label rf-read__edit"
            >
              Edit record →
            </TLink>
          )}
        </aside>

        {/* ── 오른쪽: 본문 ── */}
        <article className="rf-read__article">
          {classified && (
            <span className="rf-read__flag">
              Classified · {unlocked ? 'clearance granted' : 'owner view'}
            </span>
          )}
          <h1 className="rf-read__title">{post.title || '(Untitled)'}</h1>
          <p className="rf-label rf-mono rf-read__byline">
            {code} · ≈ {pad2(stats.minutes)} min read
          </p>

          <div
            ref={textRef}
            className={`rf-read__text is-${prefs.face}`}
            style={{ '--rf-size': `${SIZES[prefs.size]}px` }}
          >
            {blocks.length ? (
              blocks.map((b, k) =>
                b.type === 'break' ? (
                  <hr key={k} className="rf-read__break" />
                ) : (
                  <p key={k}>{b.text}</p>
                ),
              )
            ) : (
              <p className="rf-read__empty">—</p>
            )}
          </div>

          <div className="rf-read__end">
            <span className="rf-label">— End of record —</span>
            <span className="rf-label rf-mono">{code}</span>
          </div>
        </article>
      </div>
    </>
  )
}

/* ── 잠긴 글: 열람 코드 입력 ── */
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
    <div className="rf-read__grid">
      <div className="rf-read__sealed">
        <div className="rf-read__seal">
          <span className="rf-read__sealtag">[Classified]</span>
          <b>{classifiedCode(stub.id)}</b>
          <span>Narrative sealed</span>
        </div>
      </div>

      <form className="rf-read__gate" onSubmit={onSubmit} noValidate>
        <p className="rf-label">(Access code required)</p>
        <span className="rf-read__redact" aria-hidden="true" />
        <p className="rf-read__lead">
          This record is sealed. Enter the access code to read.
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
            : `Logged ${fmtDate(stub.created_at)} · all access attempts are logged.`}
        </p>
      </form>
    </div>
  )
}

/* ── 앞뒤 글 ── */
function Pager({ list, id }) {
  const k = list.findIndex((s) => s.id === id)
  if (k < 0 || list.length < 2) return null
  const newer = list[k - 1]
  const older = list[k + 1]

  return (
    <nav className="rf-read__pager" aria-label="Adjacent records">
      {newer ? (
        <TLink to={`/chronicles/${newer.id}`} className="rf-read__pg">
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
        <TLink to={`/chronicles/${older.id}`} className="rf-read__pg rf-read__pg--older">
          <span className="rf-label">Older →</span>
          <b>{codeOf(older)}</b>
        </TLink>
      ) : (
        <span />
      )}
    </nav>
  )
}

export default function ChronicleRead() {
  const { id } = useParams()
  const postId = Number(id)
  const valid = Number.isInteger(postId) && postId > 0
  const go = useGo()
  const { loading, user, owner } = useAuth()
  const userId = user?.id ?? null

  const [state, setState] = useState({ kind: 'loading' })

  useEffect(() => {
    loadSerif()
  }, [])

  useEffect(() => {
    if (!valid || loading) return
    let alive = true
    setState({ kind: 'loading' })
    loadEntry(postId)
      .then((r) => {
        if (alive) setState(r)
      })
      .catch((err) => {
        console.warn('[RF-01] chronicle unavailable:', err)
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
      go('/chronicles')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const kind = valid ? state.kind : 'missing'
  const code =
    kind === 'open' ? codeOf(state.post) : kind === 'locked' ? classifiedCode(postId) : '—'

  const statusText = {
    loading: 'Retrieving…',
    open: 'Record on file',
    locked: 'Sealed',
    missing: 'Not found',
    failed: 'Retrieval failed',
  }[kind]

  return (
    <main className="rf-read">
      <div className="rf-read__top">
        <span className="rf-label">(04) Reading</span>
        <span className="rf-label rf-mono">{code}</span>
      </div>

      <div className="rf-read__bar">
        <TLink to="/chronicles" className="rf-label rf-read__back">← Chronicles</TLink>
        <span className={`rf-label rf-mono${kind === 'failed' ? ' rf-admin__alert' : ''}`}>
          {statusText}
        </span>
      </div>

      {kind === 'loading' && <p className="rf-label rf-admin__loading">Retrieving record…</p>}

      {kind === 'failed' && (
        <p className="rf-label rf-read__state rf-admin__alert">Retrieval failed — reload to retry.</p>
      )}

      {kind === 'missing' && (
        <>
          <h1 className="rf-display rf-read__missing">No record</h1>
          <p className="rf-label rf-read__state">
            {valid ? `Record #${pad4(postId)} not found in archive.` : 'Unknown address.'}
          </p>
        </>
      )}

      {kind === 'locked' && (
        <LockGate
          stub={state.stub}
          onUnlocked={(p) => setState((s) => ({ kind: 'open', post: p, list: s.list, unlocked: true }))}
        />
      )}

      {kind === 'open' && (
        <Reader key={state.post.id} post={state.post} owner={owner} unlocked={state.unlocked} />
      )}

      {(kind === 'open' || kind === 'locked') && <Pager list={state.list} id={postId} />}
    </main>
  )
}