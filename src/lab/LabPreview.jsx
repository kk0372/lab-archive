import './styles/tokens.css'
import './styles/global.css'
import Intro from './components/Intro.jsx'
import Cursor from './components/Cursor.jsx'
import HudFrame from './components/HudFrame.jsx'
import HeroTitle from './components/HeroTitle.jsx'
import ArchiveIntro from './components/ArchiveIntro.jsx'

const LINKS = [
  '01. Subject — 서예온',
  '02. Subject — 이비',
  '03. Interaction',
  '04. Visual data',
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

        {/* ── 임시: 다음 섹션(메뉴 인덱스) 자리 ── */}
        <section style={s.temp}>
          <div style={s.head}>
            <span className="rf-label">(Temp) Index</span>
            <span style={s.headLine} />
          </div>
          <ul style={s.list}>
            {LINKS.map((label, i) => (
              <li key={label}>
                <a href="#" onClick={(e) => e.preventDefault()} style={s.item}>
                  <span>{label}</span>
                  <span className="rf-label rf-mono">0{i + 1} →</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}