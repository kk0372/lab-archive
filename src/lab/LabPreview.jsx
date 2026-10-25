import { PAGES, TLink } from './Layout.jsx'
import Intro from './components/Intro.jsx'
import HeroTitle from './components/HeroTitle.jsx'
import ArchiveIntro from './components/ArchiveIntro.jsx'

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
    fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)', /* 18px ~ 24px (작게) */
    fontWeight: 500,                            /* 400 → 500 (단단하게) */
    letterSpacing: '-0.015em',
    lineHeight: 1.3,
  },
}

export default function LabPreview() {
  return (
    <>
      <Intro />

      <main>
        <HeroTitle />
        <ArchiveIntro />

        {/* ── 임시: 0-C/0-D에서 진짜 인덱스로 교체 ── */}
        <section style={s.temp}>
          <div style={s.head}>
            <span className="rf-label">(Temp) Index</span>
            <span style={s.headLine} />
          </div>
          <ul style={s.list}>
            {PAGES.map((p) => (
              <li key={p.path}>
                <TLink to={p.path} style={s.item}>
                  <span>{p.no}. {p.title}</span>
                  <span className="rf-label rf-mono">{p.no} →</span>
                </TLink>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}