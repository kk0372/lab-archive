import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { SUBJECTS, parseInline, redactionStats } from '../data/subjects.js'
import { fetchSubjectPhoto, unlockRedactions, savedCode, imageUrl, pad2 } from '../data/api.js'
import { useAuth } from '../data/auth.js'
import './admin.css'          // 입력칸·버튼 스타일 재사용
import './subject.css'

/* 검은 줄 안을 채우는 투명 글자: 실제 한글처럼 폭을 차지하고 줄바꿈됨 */
const FILL = '가'

function Bar({ n, label = 'Redacted', restricted = false }) {
  return (
    <span
      className={`rf-redact${restricted ? ' rf-redact--restricted' : ''}`}
      role="img"
      aria-label={label}
    >
      {FILL.repeat(Math.max(1, n))}
    </span>
  )
}

/* 값이 검은 줄로만 이루어져 있는지 */
const onlyBars = (v) => /^(\s*\[\[\d+\]\]\s*)+$/.test(v ?? '')

function Inline({ v }) {
  return parseInline(v).map((s, i) =>
    s.t === 'bar' ? <Bar key={i} n={s.n} /> : <Fragment key={i}>{s.v}</Fragment>,
  )
}

/* 06 마지막 줄: 화면에 완전히 들어온 뒤에야 흐리게 떠오름 */
function FaintLine({ line }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [seen])

  return (
    <div ref={ref} className={`rf-sub__line is-faint${seen ? ' is-seen' : ''}`}>
      <span className="rf-sub__k">{line.k}</span>
      <span className="rf-sub__v">
        <Inline v={line.v} />
      </span>
    </div>
  )
}

/* 열리는 줄 */
function LockLine({ line, no, text, animate, firstRef }) {
  if (text == null) {
    return (
      <div ref={no === 1 ? firstRef : undefined} className="rf-sub__line rf-sub__line--lock">
        <span className="rf-sub__k rf-sub__rtag">R-{pad2(no)}</span>
        <span className="rf-sub__v">
          <Bar n={line.len} restricted label={`Restricted line R-${pad2(no)}`} />
        </span>
      </div>
    )
  }
  return (
    <div
      ref={no === 1 ? firstRef : undefined}
      className={`rf-sub__line rf-sub__line--lock is-open${animate ? ' is-anim' : ''}`}
      style={{ '--d': no - 1 }}
    >
      <span className="rf-sub__k rf-sub__rtag">R-{pad2(no)} · Declassified</span>
      <span className="rf-sub__v rf-sub__opentext">
        {text}
        {animate && <i className="rf-sub__lid" aria-hidden="true" />}
      </span>
    </div>
  )
}

function Line({ line }) {
  if (line.faint) return <FaintLine line={line} />
  const sealedRow = !line.k && onlyBars(line.v)   // 라벨 없는 가린 줄 → SEALED 표시
  const full = !line.k && !sealedRow              // 라벨 없는 일반 문장 → 한 줄 전체
  return (
    <div className={`rf-sub__line${full ? ' rf-sub__line--nok' : ''}`}>
      {line.k && <span className="rf-sub__k">{line.k}</span>}
      {sealedRow && <span className="rf-sub__k rf-sub__stag">Sealed</span>}
      <span className="rf-sub__v">
        <Inline v={line.v} />
      </span>
    </div>
  )
}

function Corners() {
  return (
    <>
      <span className="rf-sub__c rf-sub__c--tl" aria-hidden="true" />
      <span className="rf-sub__c rf-sub__c--tr" aria-hidden="true" />
      <span className="rf-sub__c rf-sub__c--bl" aria-hidden="true" />
      <span className="rf-sub__c rf-sub__c--br" aria-hidden="true" />
    </>
  )
}

/* ── 열람 칸 ── */
function AccessPanel({ count, mode, onUnlock }) {
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle') // idle | busy | error
  const [attempts, setAttempts] = useState(0)
  const busy = status === 'busy'

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !code.trim()) return
    setStatus('busy')
    const ok = await onUnlock(code.trim())
    if (!ok) {
      setAttempts((n) => n + 1)
      setStatus('error')
      setCode('')
      return
    }
    setStatus('idle')
  }

  return (
    <section id="rf-sub-access" className="rf-sub__access" aria-label="Restricted lines">
      <p className="rf-label">(Restricted lines — {pad2(count)})</p>

      {mode === 'owner' && (
        <p className="rf-sub__accesstext">
          Owner view — all restricted lines visible. Sealed entries hold no source text.
        </p>
      )}

      {mode === 'granted' && (
        <p className="rf-sub__accesstext">
          Clearance granted — {pad2(count)} lines declassified. Sealed entries remain sealed.
        </p>
      )}

      {(mode === 'sealed' || mode === 'checking') && (
        <form onSubmit={submit} noValidate>
          <p className="rf-sub__accesstext">
            Restricted lines are sealed. Enter the access code to declassify.
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
            <span>{busy ? 'Verifying…' : 'Declassify'}</span>
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
      )}
    </section>
  )
}

export default function SubjectProfile({ id }) {
  const s = SUBJECTS[id]
  const stats = useMemo(() => redactionStats(s), [s])
  const { loading, user, owner } = useAuth()
  const userId = user?.id ?? null

  const [map, setMap] = useState(null)          // 열린 줄 { 키: 문장 }
  const [mode, setMode] = useState('checking')  // checking | sealed | granted | owner
  const [animate, setAnimate] = useState(false)
  const [photo, setPhoto] = useState(undefined) // undefined = 확인 중, null = 없음
  const [photoLoaded, setPhotoLoaded] = useState(false)

  const firstLockRef = useRef(null)
  const sectionRefs = useRef({})

  /* 열리는 줄 번호 (R-01 ~) */
  const lockNo = useMemo(() => {
    const m = {}
    let n = 0
    for (const sec of s.sections) for (const l of sec.lines) if (l.lock) m[l.lock] = ++n
    return m
  }, [s])

  /* 사진 */
  useEffect(() => {
    let alive = true
    fetchSubjectPhoto(id)
      .then((r) => {
        if (alive) setPhoto(r?.path ?? null)
      })
      .catch((err) => {
        console.warn('[RF-01] subject photo unavailable:', err)
        if (alive) setPhoto(null)
      })
    return () => {
      alive = false
    }
  }, [id])

  /* 열리는 줄: 주인이면 코드 없이, 이 탭에서 코드를 맞힌 적 있으면 자동으로 */
  useEffect(() => {
    if (loading) return
    if (userId && owner === null) return   // 주인 확인 중
    let alive = true
    setAnimate(false)
    ;(async () => {
      if (owner === true) {
        const r = await unlockRedactions(null)
        if (!alive) return
        if (r.ok) {
          setMap(r.map)
          setMode('owner')
          return
        }
      }
      const code = savedCode()
      if (code) {
        const r = await unlockRedactions(code)
        if (!alive) return
        if (r.ok) {
          setMap(r.map)
          setMode('granted')
          return
        }
      }
      if (alive) {
        setMap(null)
        setMode('sealed')
      }
    })()
    return () => {
      alive = false
    }
  }, [loading, userId, owner])

  const onUnlock = async (code) => {
    const r = await unlockRedactions(code)
    if (!r.ok) return false
    firstLockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setAnimate(true)
    setMap(r.map)
    setMode('granted')
    return true
  }

  const jump = (no) =>
    sectionRefs.current[no]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const toAccess = () =>
    document.getElementById('rf-sub-access')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const clearance = { checking: 'Checking…', sealed: 'None', granted: 'Granted', owner: 'Owner' }[mode]

  return (
    <main className="rf-sub">
      <div className="rf-sub__top">
        <span className="rf-label">({s.no}) Profile</span>
        <span className="rf-label">RF-01 / Subject file</span>
      </div>
      <h1 className="rf-display rf-sub__title">Subject {s.no}</h1>
      <p className="rf-sub__name">
        <b>{s.name}</b>
        <span className="rf-sub__hanja">{s.hanja}</span>
        <span className="rf-label rf-mono">{s.latin}</span>
      </p>

      <div className="rf-sub__bar">
        <span className="rf-label">
          {s.kind} · Recorder {s.recorder} / Observed {s.observed}
        </span>
        <span className="rf-sub__barend">
          <span className="rf-label rf-mono">
            Sealed {pad2(stats.sealed)} · Restricted {pad2(stats.locks)} · Clearance {clearance}
          </span>
          {mode === 'sealed' && (
            <button type="button" className="rf-label rf-sub__req" onClick={toAccess}>
              Request access ↓
            </button>
          )}
        </span>
      </div>

      <div className="rf-sub__grid">
        {/* ── 왼쪽: 사진 + 표본 정보 ── */}
        <aside className="rf-sub__side">
          <figure className="rf-sub__photo">
            <div
              className={`rf-sub__plate${photo ? '' : ' is-empty'}${photoLoaded ? ' is-loaded' : ''}`}
            >
              {photo && (
                <img
                  ref={(el) => {
                    if (el && el.complete && el.naturalWidth) setPhotoLoaded(true)
                  }}
                  src={imageUrl(photo)}
                  alt={`${s.code} ${s.name}`}
                  decoding="async"
                  draggable="false"
                  onLoad={() => setPhotoLoaded(true)}
                  onError={() => setPhotoLoaded(true)}
                />
              )}
              {photo === null && (
                <span className="rf-sub__nophoto">
                  Photograph
                  <br />— not on file
                </span>
              )}
              <span className="rf-sub__ptag">{s.code}</span>
              <Corners />
            </div>
            <figcaption className="rf-label rf-mono rf-sub__cap">
              Fig. {s.no} — {photo ? 'On file' : photo === null ? 'Not on file' : '··'}
            </figcaption>
          </figure>

          <ul className="rf-spec">
            <li>
              <span className="rf-label">Code</span>
              <span className="rf-spec__value rf-mono">{s.code}</span>
            </li>
            <li>
              <span className="rf-label">Record</span>
              <span className="rf-spec__value rf-mono">{s.kind}</span>
            </li>
            <li>
              <span className="rf-label">Recorder / Observed</span>
              <span className="rf-spec__value rf-mono">
                {s.recorder} / {s.observed}
              </span>
            </li>
            <li>
              <span className="rf-label">Sealed</span>
              <span className="rf-spec__value rf-mono">{pad2(stats.sealed)}</span>
            </li>
            <li>
              <span className="rf-label">Restricted</span>
              <span className="rf-spec__value rf-mono">{pad2(stats.locks)}</span>
            </li>
            <li>
              <span className="rf-label">Clearance</span>
              <span className="rf-spec__value rf-mono">{clearance}</span>
            </li>
          </ul>

          <nav className="rf-sub__index" aria-label="Sections">
            {s.sections.map((sec) => (
              <button key={sec.no} type="button" className="rf-label" onClick={() => jump(sec.no)}>
                <span className="rf-mono">{sec.no}</span> {sec.title}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── 오른쪽: 기록 ── */}
        <div className="rf-sub__main">
          {s.sections.map((sec) => (
            <section
              key={sec.no}
              ref={(el) => (sectionRefs.current[sec.no] = el)}
              className="rf-sub__sec"
              aria-label={`${sec.no} ${sec.title}`}
            >
              <header className="rf-sub__sechead">
                <b>{sec.no}</b>
                <span className="rf-label">{sec.title}</span>
              </header>

              <div className="rf-sub__lines">
                {sec.lines.map((line, i) =>
                  line.lock ? (
                    <LockLine
                      key={line.lock}
                      line={line}
                      no={lockNo[line.lock]}
                      text={map?.[line.lock]}
                      animate={animate}
                      firstRef={firstLockRef}
                    />
                  ) : (
                    <Line key={i} line={line} />
                  ),
                )}
              </div>
            </section>
          ))}

          <footer className="rf-sub__sign">
            {s.signature.map((t) => (
              <p key={t} className="rf-label">{t}</p>
            ))}
          </footer>

          <AccessPanel count={stats.locks} mode={mode} onUnlock={onUnlock} />
        </div>
      </div>
    </main>
  )
}