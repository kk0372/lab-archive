import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TLink } from '../Layout.jsx'
import {
  fetchSection,
  unlockClassified,
  savedCode,
  classifiedCode,
  pad2,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import {
  narrativeCode,
  loadSerif,
  textStats,
  excerpt,
  progressLabel,
} from '../data/reading.js'
import './chronicles.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'yeon', label: '서예온', code: 'S-01' },
  { id: 'evie', label: '이비', code: 'S-02' },
]

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
}

/* 열람 코드로 연 글을 잠긴 자리에 바꿔 끼움 */
function merge(rows, opened) {
  const map = new Map(opened.filter((p) => p.section === 'chronicles').map((p) => [p.id, p]))
  return rows.map((r) => (r.locked && map.has(r.id) ? { ...map.get(r.id), unlocked: true } : r))
}

function Swatches({ subjects }) {
  if (!subjects?.length) return null
  return (
    <span className="rf-chr__sw">
      {subjects.map((s) => (
        <i key={s} className={`rf-chr__swi rf-chr__swi--${s}`} title={s} />
      ))}
    </span>
  )
}

/* ── 공개(또는 열린) 글 ── */
function Row({ r, index }) {
  const classified = r.access === 'classified'
  const code = classified ? classifiedCode(r.id) : narrativeCode(r.id)
  const { chars, minutes } = textStats(r.body)
  const ex = excerpt(r.body)
  const state = progressLabel(r.id)

  return (
    <li className="rf-chr" style={{ '--i': Math.min(index, 10) }}>
      <TLink to={`/chronicles/${r.id}`} className="rf-chr__link">
        <span className="rf-label rf-mono rf-chr__no">{code}</span>

        <div className="rf-chr__main">
          <h2 className="rf-chr__title">{r.title || '(Untitled)'}</h2>
          {ex && <p className="rf-chr__excerpt">{ex}</p>}
        </div>

        <div className="rf-chr__meta">
          {classified && (
            <span className="rf-chr__flag">
              Classified · {r.unlocked ? 'granted' : 'owner view'}
            </span>
          )}
          <span className="rf-label rf-mono">
            {chars.toLocaleString()} chars · ≈ {pad2(minutes)} min
          </span>
          <span className="rf-label rf-mono">{fmtDate(r.created_at)}</span>
          <span className="rf-chr__foot">
            <Swatches subjects={r.subjects} />
            <span
              className={`rf-label rf-mono rf-chr__state${state === 'Completed' ? ' is-done' : ''}`}
            >
              {state} <i aria-hidden="true">→</i>
            </span>
          </span>
        </div>
      </TLink>
    </li>
  )
}

/* ── 잠긴 글 ── */
function LockedRow({ r, index }) {
  const code = classifiedCode(r.id)
  return (
    <li className="rf-chr rf-chr--locked" style={{ '--i': Math.min(index, 10) }}>
      <TLink
        to={`/chronicles/${r.id}`}
        className="rf-chr__link"
        aria-label={`Classified record ${code} — access restricted`}
      >
        <span className="rf-label rf-mono rf-chr__no">{code}</span>

        <div className="rf-chr__main" aria-hidden="true">
          <span className="rf-chr__redact rf-chr__redact--title" />
          <span className="rf-chr__redact" style={{ width: '88%' }} />
          <span className="rf-chr__redact" style={{ width: '52%' }} />
        </div>

        <div className="rf-chr__meta">
          <span className="rf-chr__flag">[Classified]</span>
          <span className="rf-label rf-mono">Length withheld</span>
          <span className="rf-label rf-mono">{fmtDate(r.created_at)}</span>
          <span className="rf-label rf-mono rf-chr__state">
            Sealed <i aria-hidden="true">→</i>
          </span>
        </div>
      </TLink>
    </li>
  )
}

export default function Chronicles() {
  const { loading, user } = useAuth()
  const userId = user?.id ?? null

  const [rows, setRows] = useState(null) // null = 불러오는 중
  const [failed, setFailed] = useState(false)
  const [params, setParams] = useSearchParams()

  const rawS = params.get('s')
  const filter = FILTERS.some((f) => f.id === rawS) ? rawS : 'all'
  const asc = params.get('o') === 'asc'

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    loadSerif()
  }, [])

  /* 불러오기 (+ 이 탭에서 코드를 맞힌 적 있으면 자동으로 열기) */
  useEffect(() => {
    if (loading) return
    let alive = true
    setFailed(false)
    ;(async () => {
      try {
        let r = await fetchSection('chronicles')
        const code = savedCode()
        if (code && r.some((x) => x.locked)) {
          const u = await unlockClassified(code)
          if (u.ok) r = merge(r, u.posts)
        }
        if (alive) setRows(r)
      } catch (err) {
        console.warn('[RF-01] chronicles unavailable:', err)
        if (alive) {
          setRows([])
          setFailed(true)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [loading, userId])

  const stats = useMemo(() => {
    const c = { all: 0, yeon: 0, evie: 0, classified: 0, chars: 0 }
    for (const r of rows ?? []) {
      c.all += 1
      if (r.locked || r.access === 'classified') c.classified += 1
      if (!r.locked) {
        c.chars += textStats(r.body).chars
        for (const s of r.subjects ?? []) if (s in c) c[s] += 1
      }
    }
    return c
  }, [rows])

  const shown = useMemo(() => {
    if (!rows) return []
    const list =
      filter === 'all' ? rows : rows.filter((r) => !r.locked && r.subjects?.includes(filter))
    return [...list].sort(
      (a, b) => (new Date(a.created_at) - new Date(b.created_at)) * (asc ? 1 : -1),
    )
  }, [rows, filter, asc])

  return (
    <main className="rf-chrs">
      <div className="rf-chrs__top">
        <span className="rf-label">(04) Stories</span>
        <span className="rf-label">RF-01 / Narrative records</span>
      </div>
      <h1 className="rf-display rf-chrs__title">Chronicles</h1>

      <div className="rf-chrs__bar">
        <div className="rf-chrs__filter" role="group" aria-label="Filter by subject">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`rf-chrs__opt${filter === f.id ? ' is-on' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setParam('s', f.id === 'all' ? null : f.id)}
            >
              {f.code && <i className={`rf-chr__swi rf-chr__swi--${f.id}`} aria-hidden="true" />}
              <span>{f.code ? `${f.code} ${f.label}` : f.label}</span>
              <small>{rows ? `(${pad2(stats[f.id])})` : '(··)'}</small>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rf-label rf-chrs__order"
          onClick={() => setParam('o', asc ? null : 'asc')}
        >
          {asc ? 'Oldest first ↓' : 'Latest first ↑'}
        </button>
      </div>

      <p className="rf-label rf-mono rf-chrs__stats">
        Records {rows ? pad2(stats.all) : '··'} · Classified {rows ? pad2(stats.classified) : '··'} ·
        Total {rows ? stats.chars.toLocaleString() : '··'} chars
      </p>

      {rows === null ? (
        <p className="rf-label rf-chrs__state rf-chrs__blink">Retrieving records…</p>
      ) : shown.length === 0 ? (
        <p className={`rf-label rf-chrs__state${failed ? ' is-alert' : ''}`}>
          {failed
            ? 'Retrieval failed — reload to retry.'
            : filter === 'all'
              ? 'No narrative records.'
              : 'No records for this subject.'}
        </p>
      ) : (
        <ol className="rf-chrs__list" key={`${filter}-${asc}`}>
          {shown.map((r, i) =>
            r.locked ? (
              <LockedRow key={`c-${r.id}`} r={r} index={i} />
            ) : (
              <Row key={r.id} r={r} index={i} />
            ),
          )}
        </ol>
      )}

      <p className="rf-label rf-chrs__foot">
        Reading progress is stored on this device only.
      </p>
    </main>
  )
}