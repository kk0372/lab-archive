import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import HudFrame from './components/HudFrame.jsx'
import Cursor from './components/Cursor.jsx'
import Menu from './components/Menu.jsx'
import './layout.css'

/* ──────────────────────────────────────────────
   메뉴 목록: 페이지 이름·순서는 여기서만 고치면 됨
   ────────────────────────────────────────────── */
export const PAGES = [
  { no: '01', path: '/subject/01', title: 'Subject — 서예온', note: 'Profile' },
  { no: '02', path: '/subject/02', title: 'Subject — 이비', note: 'Observation' },
  { no: '03', path: '/interaction', title: 'Interaction', note: 'Timeline' },
  { no: '04', path: '/chronicles', title: 'Chronicles', note: 'Stories', section: 'chronicles' },
  { no: '05', path: '/visual', title: 'Visual data', note: 'Commissions', section: 'visual' },
  { no: '06', path: '/logs', title: 'Research logs', note: 'Notes', section: 'logs' },
]

const COVER_MS = 420   // 막이 덮는 시간 (layout.css의 rf-transit-in과 같게)
const REVEAL_MS = 520  // 막이 걷히는 시간 (layout.css의 rf-transit-out과 같게)

function labelFor(pathname) {
  if (pathname === '/') return '00. Index'
  const p = PAGES.find((x) => pathname === x.path || pathname.startsWith(x.path + '/'))
  if (p) return `${p.no}. ${p.title}`
  if (pathname.startsWith('/admin')) return '00. Admin'
  return '404. No record'
}

const TransitionContext = createContext(null)

/* 전환 연출이 붙은 링크. 페이지 안 링크는 앞으로 전부 이걸 씀 */
export function TLink({ to, onClick, children, ...rest }) {
  const go = useContext(TransitionContext)
  const handle = (e) => {
    onClick?.(e)
    if (e.defaultPrevented) return
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(to)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('idle') // idle | cover | reveal
  const [label, setLabel] = useState('')
  const [seq, setSeq] = useState(0)

  const pathRef = useRef(location.pathname)
  const prevPath = useRef(location.pathname)
  const busy = useRef(false)
  const coverTimer = useRef(0)

  pathRef.current = location.pathname

  /* 링크 클릭 → 막 덮기 → 페이지 이동 */
  const go = useCallback(
    (to) => {
      const target = to.split('?')[0].split('#')[0]
      if (busy.current || target === pathRef.current) return

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) {
        navigate(to)
        return
      }

      busy.current = true
      setLabel(labelFor(target))
      setPhase('cover')
      setSeq((n) => n + 1)
      coverTimer.current = setTimeout(() => navigate(to), COVER_MS)
    },
    [navigate],
  )

  /* 주소가 바뀌면: 맨 위로 + 막 걷기 (뒤로 가기도 여기로 옴) */
  useEffect(() => {
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname
    window.scrollTo(0, 0)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      busy.current = false
      return
    }

    setLabel(labelFor(location.pathname))
    setPhase('reveal')
    setSeq((n) => n + 1)
    const t = setTimeout(() => {
      setPhase('idle')
      busy.current = false
    }, REVEAL_MS)
    return () => clearTimeout(t)
  }, [location.pathname])

  useEffect(() => () => clearTimeout(coverTimer.current), [])

  return (
    <TransitionContext.Provider value={go}>
      <HudFrame />
      <Cursor />
      <Menu
        pages={PAGES}
        go={go}
        current={location.pathname}
        label={labelFor(location.pathname)}
      />

      <Outlet />

      {phase !== 'idle' && (
        <div key={seq} className={`rf-transit is-${phase}`} aria-hidden="true">
          <span className="rf-transit__line" />
          <div className="rf-transit__label">
            <span>(Transfer)</span>
            <b>→ {label}</b>
          </div>
        </div>
      )}
    </TransitionContext.Provider>
  )
}