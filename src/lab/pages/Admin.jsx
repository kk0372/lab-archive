import { useState } from 'react'
import { PAGES, TLink } from '../Layout.jsx'
import { useCounts, countLabel } from '../data/api.js'
import { useAuth, signIn, signOut, maskEmail } from '../data/auth.js'
import './admin.css'

const pad = (n) => String(n).padStart(2, '0')

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* Supabase 오류 → 화면 문구 */
function describe(error) {
  const m = error?.message ?? ''
  if (/invalid login/i.test(m)) return 'Access denied — credentials rejected'
  if (/rate|too many/i.test(m)) return 'Too many attempts — wait and retry'
  if (/not confirmed/i.test(m)) return 'Account not confirmed'
  return 'Connection error — retry'
}

/* ── 공통 머리 ── */
function Head({ no, note, title }) {
  return (
    <>
      <div className="rf-admin__top">
        <span className="rf-label">({no}) {note}</span>
        <span className="rf-label">RF-01 / Access control</span>
      </div>
      <h1 className="rf-display rf-admin__title">{title}</h1>
    </>
  )
}

/* ── 로그아웃 상태: 인증 화면 ── */
function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState('idle') // idle | busy | error
  const [message, setMessage] = useState('')
  const busy = status === 'busy'

  const onSubmit = async (e) => {
    e.preventDefault()
    if (busy) return
    setStatus('busy')
    setMessage('')
    const { error } = await signIn(email.trim(), password)
    if (error) {
      setStatus('error')
      setMessage(describe(error))
      setPassword('')
    }
    // 성공하면 로그인 상태가 바뀌면서 자동으로 콘솔 화면으로 넘어감
  }

  return (
    <>
      <Head no="00" note="Restricted" title="Restricted" />

      <div className="rf-admin__grid">
        <div className="rf-admin__side">
          <p className="rf-label rf-admin__caption">(Protocol)</p>
          <ul className="rf-spec">
            <li>
              <span className="rf-label">Clearance</span>
              <span className="rf-spec__value rf-mono">Owner only</span>
            </li>
            <li>
              <span className="rf-label">Signup</span>
              <span className="rf-spec__value rf-mono">Closed</span>
            </li>
            <li>
              <span className="rf-label">Session</span>
              <span className="rf-spec__value rf-mono">None</span>
            </li>
          </ul>
        </div>

        <form className="rf-admin__main" onSubmit={onSubmit} noValidate>
          <p className="rf-label rf-admin__caption">(Authentication required)</p>

          <label className="rf-field">
            <span className="rf-label rf-field__label">(Operator ID)</span>
            <input
              className="rf-field__input"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              spellCheck="false"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@domain"
            />
          </label>

          <div className="rf-field">
            <label className="rf-label rf-field__label" htmlFor="rf-pass">
              <span>(Passphrase)</span>
            </label>
            <div className="rf-field__row">
              <input
                id="rf-pass"
                className="rf-field__input"
                type={show ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="rf-label rf-field__toggle"
                onClick={() => setShow((v) => !v)}
                aria-pressed={show}
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`rf-btn${busy ? ' is-busy' : ''}`}
            disabled={busy || !email || !password}
          >
            <span>{busy ? 'Verifying…' : 'Authenticate'}</span>
            <span aria-hidden="true">→</span>
            <i className="rf-btn__progress" aria-hidden="true" />
          </button>

          <p
            className={`rf-label rf-admin__msg${status === 'error' ? ' is-alert' : ''}`}
            role="status"
            aria-live="polite"
          >
            {message || 'Unauthorised access is logged.'}
          </p>
        </form>
      </div>
    </>
  )
}

/* ── 로그인 상태: 콘솔 ── */
function Console({ user, owner }) {
  const counts = useCounts()
  const [leaving, setLeaving] = useState(false)

  const onSignOut = async () => {
    setLeaving(true)
    await signOut()
    // 로그아웃되면 자동으로 인증 화면으로 넘어감
  }

  const clearance =
    owner === true ? 'Owner · verified' : owner === false ? 'Insufficient' : 'Checking…'

  return (
    <>
      <Head no="00" note="Session active" title="Console" />

      <div className="rf-admin__grid">
        <div className="rf-admin__side">
          <p className="rf-label rf-admin__caption">(Operator)</p>
          <ul className="rf-spec">
            <li>
              <span className="rf-label">Operator</span>
              <span className="rf-spec__value rf-mono">{maskEmail(user.email)}</span>
            </li>
            <li>
              <span className="rf-label">Clearance</span>
              <span
                className={`rf-spec__value rf-mono${owner === false ? ' rf-admin__alert' : ''}`}
              >
                {clearance}
              </span>
            </li>
            <li>
              <span className="rf-label">Last sign-in</span>
              <span className="rf-spec__value rf-mono">{fmtTime(user.last_sign_in_at)}</span>
            </li>
          </ul>

          {owner === false && (
            <p className="rf-label rf-admin__msg is-alert">
              This account is not the registered operator. Write access denied.
            </p>
          )}
        </div>

        <div className="rf-admin__main">
          <p className="rf-label rf-admin__caption">(Records)</p>
          <ul className="rf-admin__list">
            {PAGES.filter((p) => p.section).map((p) => (
              <li key={p.path}>
                <TLink
                  to={`/admin/${p.section}`}
                  className="rf-admin__row rf-admin__row--link"
                >
                  <span className="rf-label rf-mono">{p.no}</span>
                  <span className="rf-admin__name">{p.title}</span>
                  <span className="rf-label rf-mono">{countLabel(p.section, counts)}</span>
                  <span className="rf-label rf-admin__go">Manage →</span>
                </TLink>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="rf-btn rf-btn--ghost"
            onClick={onSignOut}
            disabled={leaving}
          >
            <span>{leaving ? 'Terminating…' : 'Terminate session'}</span>
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </>
  )
}

export default function Admin() {
  const { loading, user, owner } = useAuth()

  return (
    <main className="rf-admin">
      {loading ? (
        <>
          <Head no="00" note="Restricted" title="Restricted" />
          <p className="rf-label rf-admin__loading">Verifying session…</p>
        </>
      ) : user ? (
        <Console user={user} owner={owner} />
      ) : (
        <LoginForm />
      )}
    </main>
  )
}