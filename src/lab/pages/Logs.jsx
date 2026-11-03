import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TLink } from '../Layout.jsx'
import {
  fetchSection,
  unlockClassified,
  savedCode,
  classifiedCode,
  dayNumber,
  DAY_ONE,
  pad2,
  pad4,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import './logs.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'yeon', label: '서예온', code: 'S-01' },
  { id: 'evie', label: '이비', code: 'S-02' },
]
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LONG = 700 // 이 글자 수를 넘으면 접어서 보여줌

/* 관찰 시각 (없으면 작성일) */
const when = (r) => new Date(r.observed_at ?? r.created_at)
const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const fmtDay = (d) =>
  `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} (${WD[d.getDay()]})`
const hhmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
const dayText = (n) =>
  n == null ? 'DAY ???' : n < 1 ? 'PRE-OBS.' : `DAY ${String(n).padStart(3, '0')}`
const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000

/* 열람 코드로 연 기록을 잠긴 자리에 바꿔 끼움 */
function merge(rows, opened) {
  const map = new Map(opened.filter((p) => p.section === 'logs').map((p) => [p.id, p]))
  return rows.map((r) => (r.locked && map.has(r.id) ? { ...map.get(r.id), unlocked: true } : r))
}

function Swatches({ subjects }) {
  if (!subjects?.length) return null
  return (
    <span className="rf-log__sw">
      {subjects.map((s) => (
        <i key={s} className={`rf-log__swi rf-log__swi--${s}`} title={s} />
      ))}
    </span>
  )
}

/* ── 공개(또는 열린) 기록 ── */
function Entry({ r, owner }) {
  const d = when(r)
  const long = (r.body ?? '').length > LONG
  const [open, setOpen] = useState(!long)
  const classified = r.access === 'classified'

  return (
    <article className="rf-log" id={`log-${r.id}`}>
      <header className="rf-log__head">
        <span className="rf-log__time">{hhmm(d)}</span>
        <span className="rf-label rf-mono">#{pad4(r.id)}</span>
        <Swatches subjects={r.subjects} />
        {classified && (
          <span className="rf-log__flag">
            Classified · {r.unlocked ? 'clearance granted' : 'owner view'}
          </span>
        )}
      </header>

      {r.title && <h3 className="rf-log__title">{r.title}</h3>}

      <p className={`rf-log__body${open ? '' : ' is-clamped'}`}>{r.body}</p>

      <div className="rf-log__foot">
        {long && (
          <button type="button" className="rf-label rf-log__more" onClick={() => setOpen((v) => !v)}>
            {open ? 'Collapse ↑' : 'Continue record ↓'}
          </button>
        )}
        {owner === true && (
          <TLink to={`/admin/logs/${r.id}`} className="rf-label rf-log__edit">
            Edit →
          </TLink>
        )}
      </div>
    </article>
  )
}

/* ── 잠긴 기록 ── */
function LockedEntry({ r, onUnlock }) {
  const d = when(r)
  const [form, setForm] = useState(false)
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
    }
    // 성공하면 이 칸은 열린 기록으로 바뀜
  }

  return (
    <article className="rf-log rf-log--locked" id={`log-${r.id}`}>
      <header className="rf-log__head">
        <span className="rf-log__time">{hhmm(d)}</span>
        <span className="rf-log__seal">[Classified]</span>
        <span className="rf-label rf-mono">{classifiedCode(r.id)}</span>
      </header>

      <div className="rf-log__redact" aria-label="Redacted">
        <span style={{ width: '92%' }} />
        <span style={{ width: '78%' }} />
        <span style={{ width: '46%' }} />
      </div>

      {!form ? (
        <button type="button" className="rf-label rf-log__req" onClick={() => setForm(true)}>
          Request access →
        </button>
      ) : (
        <form className="rf-log__unlock" onSubmit={submit} noValidate>
          <input
            className="rf-log__input"
            type="password"
            autoComplete="off"
            spellCheck="false"
            placeholder="Access code"
            aria-label="Access code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (status === 'error') setStatus('idle')
            }}
          />
          <button type="submit" className="rf-label rf-log__go" disabled={busy || !code.trim()}>
            {busy ? 'Verifying…' : 'Submit →'}
          </button>
          <span
            className={`rf-label rf-log__msg${status === 'error' ? ' is-alert' : ''}`}
            role="status"
            aria-live="polite"
          >
            {status === 'error'
              ? `Access denied · attempt ${pad2(attempts)}`
              : 'Attempts are logged.'}
          </span>
        </form>
      )}
    </article>
  )
}

export default function Logs() {
  const { loading, user, owner } = useAuth()
  const userId = user?.id ?? null

  const [rows, setRows] = useState(null) // null = 불러오는 중
  const [failed, setFailed] = useState(false)
  const [params, setParams] = useSearchParams()

  const rawS = params.get('s')
  const filter = FILTERS.some((f) => f.id === rawS) ? rawS : 'all'
  const desc = params.get('o') === 'desc'

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  /* 불러오기 (+ 이 탭에서 코드를 맞힌 적 있으면 자동으로 열기) */
  useEffect(() => {
    if (loading) return
    let alive = true
    setFailed(false)
    ;(async () => {
      try {
        let r = await fetchSection('logs')
        const code = savedCode()
        if (code && r.some((x) => x.locked)) {
          const u = await unlockClassified(code)
          if (u.ok) r = merge(r, u.posts)
        }
        if (alive) setRows(r)
      } catch (err) {
        console.warn('[RF-01] logs unavailable:', err)
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

  const unlock = async (code) => {
    const r = await unlockClassified(code)
    if (!r.ok) return false
    setRows((list) => merge(list ?? [], r.posts))
    return true
  }

  const stats = useMemo(() => {
    const c = { all: 0, yeon: 0, evie: 0, classified: 0, first: null, last: null }
    for (const r of rows ?? []) {
      c.all += 1
      if (r.locked || r.access === 'classified') c.classified += 1
      if (!r.locked) for (const s of r.subjects ?? []) if (s in c) c[s] += 1
      const n = dayNumber(when(r).toISOString())
      if (n != null && n >= 1) {
        c.first = c.first == null ? n : Math.min(c.first, n)
        c.last = c.last == null ? n : Math.max(c.last, n)
      }
    }
    return c
  }, [rows])

  /* 날짜별 묶음 */
  const groups = useMemo(() => {
    if (!rows) return []
    const shown =
      filter === 'all' ? rows : rows.filter((r) => !r.locked && r.subjects?.includes(filter))
    const list = [...shown].sort((a, b) => (when(a) - when(b)) * (desc ? -1 : 1))
    const out = []
    for (const r of list) {
      const d = when(r)
      const key = dateKey(d)
      let g = out[out.length - 1]
      if (!g || g.key !== key) {
        g = { key, date: d, n: dayNumber(d.toISOString()), items: [] }
        out.push(g)
      }
      g.items.push(r)
    }
    return out
  }, [rows, filter, desc])

  const span =
    stats.first != null
      ? `${dayText(stats.first)} — ${dayText(stats.last)}`
      : '—'

  return (
    <main className="rf-logs">
      <div className="rf-logs__top">
        <span className="rf-label">(06) Notes</span>
        <span className="rf-label">
          RF-01 / DAY 001 = {DAY_ONE ? DAY_ONE.replaceAll('-', '.') : 'unset'}
        </span>
      </div>
      <h1 className="rf-display rf-logs__title">Research logs</h1>

      <div className="rf-logs__bar">
        <div className="rf-logs__filter" role="group" aria-label="Filter by subject">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`rf-logs__opt${filter === f.id ? ' is-on' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => setParam('s', f.id === 'all' ? null : f.id)}
            >
              {f.code && <i className={`rf-log__swi rf-log__swi--${f.id}`} aria-hidden="true" />}
              <span>{f.code ? `${f.code} ${f.label}` : f.label}</span>
              <small>{rows ? `(${pad2(stats[f.id])})` : '(··)'}</small>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rf-label rf-logs__order"
          onClick={() => setParam('o', desc ? null : 'desc')}
        >
          {desc ? 'Latest first ↑' : 'Chronological ↓'}
        </button>
      </div>

      <p className="rf-label rf-mono rf-logs__stats">
        Entries {rows ? pad2(stats.all) : '··'} · Classified {rows ? pad2(stats.classified) : '··'} ·
        Span {rows ? span : '··'}
      </p>

      {rows === null ? (
        <p className="rf-label rf-logs__state rf-logs__blink">Retrieving observations…</p>
      ) : groups.length === 0 ? (
        <p className={`rf-label rf-logs__state${failed ? ' is-alert' : ''}`}>
          {failed
            ? 'Retrieval failed — reload to retry.'
            : filter === 'all'
              ? 'No observations recorded.'
              : 'No observations for this subject.'}
        </p>
      ) : (
        <div className="rf-logs__list" key={`${filter}-${desc}`}>
          {groups.map((g, gi) => {
            const prev = groups[gi - 1]
            const gap = prev ? Math.abs(utcDay(g.date) - utcDay(prev.date)) - 1 : 0
            const pre = g.n != null && g.n < 1

            return (
              <div key={g.key} className="rf-logs__chunk" style={{ '--i': Math.min(gi, 8) }}>
                {gap > 0 && (
                  <div className="rf-gap" aria-label={`${gap} days unrecorded`}>
                    <span className="rf-label rf-mono">
                      — {pad2(gap)} day{gap > 1 ? 's' : ''} unrecorded —
                    </span>
                  </div>
                )}

                <section className={`rf-day${pre ? ' is-pre' : ''}`} aria-label={dayText(g.n)}>
                  <div className="rf-day__stamp">
                    <b>{dayText(g.n)}</b>
                    <span className="rf-label rf-mono">{fmtDay(g.date)}</span>
                    <span className="rf-label rf-mono rf-day__count">
                      {pad2(g.items.length)} entr{g.items.length > 1 ? 'ies' : 'y'}
                    </span>
                  </div>

                  <div className="rf-day__entries">
                    {g.items.map((r) =>
                      r.locked ? (
                        <LockedEntry key={`c-${r.id}`} r={r} onUnlock={unlock} />
                      ) : (
                        <Entry key={r.id} r={r} owner={owner} />
                      ),
                    )}
                  </div>
                </section>
              </div>
            )
          })}
        </div>
      )}

      <p className="rf-label rf-logs__foot">
        Times recorded in local time. Unrecorded intervals are not errors.
      </p>
    </main>
  )
}