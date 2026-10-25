import { Link } from 'react-router-dom'
import Intro from './components/Intro.jsx'
import Cursor from './components/Cursor.jsx'
import HudFrame from './components/HudFrame.jsx'
import HeroTitle from './components/HeroTitle.jsx'
import ArchiveIntro from './components/ArchiveIntro.jsx'

const LINKS = [
  ['01', '/subject/01', 'Subject — 서예온'],
  ['02', '/subject/02', 'Subject — 이비'],
  ['03', '/interaction', 'Interaction'],
  ['04', '/chronicles', 'Chronicles'],
  ['05', '/visual', 'Visual data'],
  ['06', '/logs', 'Research logs'],
]

const s = {
  temp: { padding: '0 var(--gutter) var(--sp-8)' },
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sp-3)',
    marginBottom: 'var(--sp-4)',
  },
  headLine: { flex: 1, borderTop: 'var(--line)' },
  list: { listStyle: 'none', borderTop: 'var(--line)' },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBlock: 'var(--sp-4)',
    borderBottom: 'var(--line)',
    fontSize: 'var(--fs-lead)',
  },
}

export default function LabPreview() {
  return (
    <>
      <Intro />
      <HudFrame />
      <Cursor />

      <main>
        <HeroTitle />
        <ArchiveIntro />

        {/* ── 임시: 0-D에서 진짜 인덱스로 교체 ── */}
        <section style={s.temp}>
          <div style={s.head}>
            <span className="rf-label">(Temp) Index</span>
            <span style={s.headLine} />
          </div>
          <ul style={s.list}>
            {LINKS.map(([no, to, label]) => (
              <li key={to}>
                <Link to={to} style={s.item}>
                  <span>{no}. {label}</span>
                  <span className="rf-label rf-mono">{no} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}