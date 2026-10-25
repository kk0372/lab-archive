import { useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import './styles/tokens.css'
import './styles/global.css'
import LabPreview from './LabPreview.jsx'
import Cursor from './components/Cursor.jsx'
import HudFrame from './components/HudFrame.jsx'

/* 메뉴 페이지 목록 (0-C 메뉴에서도 이 구성을 그대로 씀) */
const PAGES = [
  { no: '01', path: '/subject/01', title: 'Subject — 서예온', note: 'Profile' },
  { no: '02', path: '/subject/02', title: 'Subject — 이비', note: 'Observation' },
  { no: '03', path: '/interaction', title: 'Interaction', note: 'Timeline' },
  { no: '04', path: '/chronicles', title: 'Chronicles', note: 'Stories' },
  { no: '05', path: '/visual', title: 'Visual data', note: 'Commissions' },
  { no: '06', path: '/logs', title: 'Research logs', note: 'Notes' },
]

/* 페이지를 이동하면 맨 위에서 시작 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

const ph = {
  main: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: 'calc(var(--hud-inset) + var(--hud-ruler) + var(--sp-4))',
    paddingBottom: 'calc(var(--hud-veil-height) + var(--sp-2))',
  },
  top: { display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)' },
  title: { fontSize: 'clamp(2.5rem, 9vw, 7rem)', marginBlock: 'var(--sp-5) var(--sp-3)' },
}

/* 임시 페이지: 각 페이지를 만들 때마다 진짜로 교체 */
function Placeholder({ no, title, note }) {
  return (
    <>
      <HudFrame />
      <Cursor />
      <main className="rf-container" style={ph.main}>
        <div style={ph.top}>
          <Link to="/" className="rf-label">← RF-01</Link>
          <span className="rf-label">({no}) {note}</span>
        </div>
        <div>
          <h1 className="rf-display" style={ph.title}>{title}</h1>
          <p className="rf-label">Under construction — pending observation</p>
        </div>
      </main>
    </>
  )
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LabPreview />} />
        {PAGES.map((p) => (
          <Route key={p.path} path={p.path} element={<Placeholder {...p} />} />
        ))}
        <Route
          path="/admin"
          element={<Placeholder no="00" title="Admin" note="Restricted" />}
        />
        <Route
          path="*"
          element={<Placeholder no="404" title="No record" note="Not found" />}
        />
      </Routes>
    </>
  )
}