import { PAGES, TLink } from './Layout.jsx'
import { useCounts, countLabel } from './data/api.js'
import Intro from './components/Intro.jsx'
import HeroTitle from './components/HeroTitle.jsx'
import ArchiveIntro from './components/ArchiveIntro.jsx'

const s = {
  wrap: { padding: '0 var(--gutter) var(--sp-8)' },
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
    gap: 'var(--sp-3)',
    paddingBlock: 'var(--sp-4)',
    borderBottom: 'var(--line)',
    fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)',
    fontWeight: 500,
    letterSpacing: '-0.015em',
    lineHeight: 1.3,
  },
  meta: { whiteSpace: 'nowrap' },
}

export default function LabPreview() {
  const counts = useCounts()

  return (
    <>
      <Intro />

      <main>
        <HeroTitle />
        <ArchiveIntro />

        <section style={s.wrap} aria-labelledby="rf-index-title">
          <div style={s.head}>
            <h2 id="rf-index-title" className="rf-label">(Index)</h2>
            <span style={s.headLine} />
          </div>
          <ul style={s.list}>
            {PAGES.map((p) => (
              <li key={p.path}>
                <TLink to={p.path} style={s.item}>
                  <span>{p.no}. {p.title}</span>
                  <span className="rf-label rf-mono" style={s.meta}>
                    {countLabel(p.section, counts)} →
                  </span>
                </TLink>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}