import { Routes, Route } from 'react-router-dom'
import './styles/tokens.css'
import './styles/global.css'
import Layout, { PAGES, TLink } from './Layout.jsx'
import LabPreview from './LabPreview.jsx'

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
    <main className="rf-container" style={ph.main}>
      <div style={ph.top}>
        <TLink to="/" className="rf-label">← RF-01</TLink>
        <span className="rf-label">({no}) {note}</span>
      </div>
      <div>
        <h1 className="rf-display" style={ph.title}>{title}</h1>
        <p className="rf-label">Under construction — pending observation</p>
      </div>
    </main>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LabPreview />} />
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
      </Route>
    </Routes>
  )
}