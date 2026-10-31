import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TLink } from '../Layout.jsx'
import {
  fetchSection,
  imageUrl,
  coverPath,
  classifiedCode,
  pad2,
  pad4,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import './visual.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'yeon', label: '서예온', code: 'S-01' },
  { id: 'evie', label: '이비', code: 'S-02' },
]

const specimenCode = (id) => `RF-01-V/${pad4(id)}`

/* '2025-06-12' 또는 ISO 시각 → 2025.06.12 */
function fmtDate(v) {
  if (!v) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v.replaceAll('-', '.')
  const d = new Date(v)
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
}

function Corners() {
  return (
    <>
      <span className="rf-spc__c rf-spc__c--tl" aria-hidden="true" />
      <span className="rf-spc__c rf-spc__c--tr" aria-hidden="true" />
      <span className="rf-spc__c rf-spc__c--bl" aria-hidden="true" />
      <span className="rf-spc__c rf-spc__c--br" aria-hidden="true" />
    </>
  )
}

/* ── 공개 표본 카드 ── */
function Specimen({ post, index }) {
  const [loaded, setLoaded] = useState(false)
  const cover = coverPath(post)
  const n = post.images?.length ?? 0
  const classified = post.access === 'classified'
  const code = classified ? classifiedCode(post.id) : specimenCode(post.id)

  return (
    <li className="rf-spc" style={{ '--i': Math.min(index, 12) }}>
      <TLink to={`/visual/${post.id}`} className="rf-spc__link">
        <div className={`rf-spc__frame${loaded ? ' is-loaded' : ''}`}>
          <div className="rf-spc__plate">
            {cover && (
              <img
                ref={(el) => {
                  // 이미 캐시에 있던 이미지도 바로 나타나게
                  if (el && el.complete && el.naturalWidth) setLoaded(true)
                }}
                src={imageUrl(cover)}
                alt={post.title || code}
                loading="lazy"
                decoding="async"
                draggable="false"
                onLoad={() => setLoaded(true)}
                onError={() => setLoaded(true)}
              />
            )}
          </div>
          <span className="rf-spc__code">{code}</span>
          {n > 1 && <span className="rf-spc__count">{pad2(n)} plates</span>}
          {classified && <span className="rf-spc__flag">Classified · owner view</span>}
          <Corners />
        </div>

        <div className="rf-spc__meta">
          <span className="rf-spc__title">{post.title || '(Untitled)'}</span>
          <span className="rf-label rf-mono rf-spc__row">
            <span className="rf-spc__artist">{post.artist || 'Artist unknown'}</span>
            <span>{fmtDate(post.drawn_on)}</span>
          </span>
          {post.subjects?.length > 0 && (
            <span className="rf-spc__subjects">
              {post.subjects.map((s) => (
                <i key={s} className={`rf-spc__sw rf-spc__sw--${s}`} title={s} />
              ))}
            </span>
          )}
        </div>
      </TLink>
    </li>
  )
}

/* ── 잠긴 카드 (방문자에게 보이는 CLASSIFIED) ── */
function Locked({ stub, index }) {
  const code = classifiedCode(stub.id)
  return (
    <li className="rf-spc rf-spc--locked" style={{ '--i': Math.min(index, 12) }}>
      <TLink
        to={`/visual/${stub.id}`}
        className="rf-spc__link"
        aria-label={`Classified specimen ${code} — access restricted`}
      >
        <div className="rf-spc__frame is-loaded">
          <div className="rf-spc__plate rf-spc__hatch" />
          <div className="rf-spc__seal">
            <span className="rf-spc__sealtag">[Classified]</span>
            <b>{code}</b>
            <span>Access restricted</span>
          </div>
          <Corners />
        </div>

        <div className="rf-spc__meta">
          <span className="rf-spc__bar" aria-hidden="true" />
          <span className="rf-label rf-mono rf-spc__row">
            <span>Artist withheld</span>
            <span>{fmtDate(stub.created_at)}</span>
          </span>
        </div>
      </TLink>
    </li>
  )
}

export default function Visual() {
  const { loading, user } = useAuth()
  const userId = user?.id ?? null

  const [rows, setRows] = useState(null) // null = 불러오는 중
  const [failed, setFailed] = useState(false)
  const [params, setParams] = useSearchParams()

  const raw = params.get('s')
  const filter = FILTERS.some((f) => f.id === raw) ? raw : 'all'

  /* 불러오기 (로그인 상태가 정해진 뒤, 로그인/로그아웃하면 다시) */
  useEffect(() => {
    if (loading) return
    let alive = true
    setFailed(false)
    fetchSection('visual')
      .then((r) => {
        if (alive) setRows(r)
      })
      .catch((err) => {
        console.warn('[RF-01] visual data unavailable:', err)
        if (alive) {
          setRows([])
          setFailed(true)
        }
      })
    return () => {
      alive = false
    }
  }, [loading, userId])

  const counts = useMemo(() => {
    const c = { all: 0, yeon: 0, evie: 0, classified: 0 }
    for (const r of rows ?? []) {
      c.all += 1
      if (r.locked || r.access === 'classified') c.classified += 1
      if (!r.locked) for (const s of r.subjects ?? []) if (s in c) c[s] += 1
    }
    return c
  }, [rows])

  const shown = useMemo(() => {
    if (!rows) return []
    if (filter === 'all') return rows
    return rows.filter((r) => !r.locked && r.subjects?.includes(filter))
  }, [rows, filter])

  const pick = (id) => setParams(id === 'all' ? {} : { s: id }, { replace: true })

  return (
    <main className="rf-vis">
      <div className="rf-vis__top">
        <span className="rf-label">(05) Commissions</span>
        <span className="rf-label">RF-01 / Specimen archive</span>
      </div>
      <h1 className="rf-display rf-vis__title">Visual data</h1>

      <div className="rf-vis__bar">
        <div className="rf-filter" role="group" aria-label="Filter by subject">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`rf-filter__opt${filter === f.id ? ' is-on' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => pick(f.id)}
            >
              {f.code && <i className={`rf-filter__sw rf-filter__sw--${f.id}`} aria-hidden="true" />}
              <span>{f.code ? `${f.code} ${f.label}` : f.label}</span>
              <small>{rows ? `(${pad2(counts[f.id])})` : '(··)'}</small>
            </button>
          ))}
        </div>

        <span className="rf-label rf-mono">
          Specimens {rows ? pad2(counts.all) : '··'} · Classified{' '}
          {rows ? pad2(counts.classified) : '··'}
        </span>
      </div>

      {rows === null ? (
        <p className="rf-label rf-vis__state rf-vis__blink">Retrieving specimens…</p>
      ) : shown.length === 0 ? (
        <p className={`rf-label rf-vis__state${failed ? ' is-alert' : ''}`}>
          {failed
            ? 'Retrieval failed — reload to retry.'
            : filter === 'all'
              ? 'No specimens — awaiting first observation.'
              : 'No specimens for this subject.'}
        </p>
      ) : (
        <ul key={filter} className="rf-vis__grid">
          {shown.map((r, i) =>
            r.locked ? (
              <Locked key={`c-${r.id}`} stub={r} index={i} />
            ) : (
              <Specimen key={r.id} post={r} index={i} />
            ),
          )}
        </ul>
      )}

      <p className="rf-label rf-vis__foot">
        Plates cropped to 3:4 for indexing — full frame on inspection.
      </p>
    </main>
  )
}