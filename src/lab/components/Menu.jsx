import { useEffect, useRef, useState } from 'react'
import './menu.css'
import { useCounts, countLabel } from '../data/api.js'

const CLOSE_MS = 450 // 닫히는 시간 (menu.css의 rf-menu-out과 같게)

export default function Menu({ pages, go, current, label }) {
  const [state, setState] = useState('closed') // closed | open | closing
  const counts = useCounts()
  const btnRef = useRef(null)
  const firstRef = useRef(null)
  const closeTimer = useRef(0)
  const lastPath = useRef(current)
  const isOpen = state === 'open'

  const open = () => {
    clearTimeout(closeTimer.current)
    setState('open')
  }

  const close = () => {
    setState((s) => (s === 'open' ? 'closing' : s))
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setState('closed'), CLOSE_MS)
  }

  const toggle = () => (state === 'open' ? close() : open())

  /* 링크 클릭: 같은 페이지면 메뉴만 닫고, 다른 페이지면 전환 연출과 함께 이동 */
  const onNav = (to) => (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    if (to === current) {
      close()
      return
    }
    go(to)
  }

  /* 페이지가 바뀌면 (전환 막 뒤에서) 바로 닫기 */
  useEffect(() => {
    if (lastPath.current === current) return
    lastPath.current = current
    clearTimeout(closeTimer.current)
    setState('closed')
  }, [current])

  /* 열려 있는 동안 뒤쪽 스크롤 잠금 */
  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('rf-menu-open', state !== 'closed')
    return () => html.classList.remove('rf-menu-open')
  }, [state])

  /* 열렸을 때: Esc로 닫기 + 첫 항목에 포커스 (키보드 사용자용) */
  useEffect(() => {
    if (state !== 'open') return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
        btnRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    firstRef.current?.focus({ preventScroll: true })
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  /* 스크롤하면 위쪽 흐림 띠 켜기 */
  useEffect(() => {
    const html = document.documentElement
    const onScroll = () => html.classList.toggle('rf-scrolled', window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      html.classList.remove('rf-scrolled')
    }
  }, [])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  return (
    <>
      {/* 위쪽 바 */}
      <header className="rf-menubar">
        <a href="/" className="rf-menubar__home" onClick={onNav('/')}>
          <b>RF-01</b>
          <span className="rf-menubar__here">/ {label}</span>
        </a>

        <button
          ref={btnRef}
          type="button"
          className="rf-menubar__toggle"
          aria-expanded={isOpen}
          aria-controls="rf-menu"
          onClick={toggle}
        >
          <span className="rf-menubar__word">{isOpen ? 'Close' : 'Index'}</span>
          <span className="rf-menubar__count">
            ({String(pages.length).padStart(2, '0')})
          </span>
          <i className="rf-menubar__icon" aria-hidden="true" />
        </button>
      </header>

      {/* 전체화면 인덱스 */}
      {state !== 'closed' && (
        <nav id="rf-menu" className={`rf-menu is-${state}`} aria-label="Index">
          <div className="rf-menu__inner">
            <div className="rf-menu__head">
              <span className="rf-label">(Index)</span>
              <span className="rf-menu__headline" aria-hidden="true" />
              <span className="rf-label rf-mono">
                {String(pages.length).padStart(2, '0')} sections
              </span>
            </div>

            <ol className="rf-menu__list">
              {pages.map((p, i) => {
                const here = current === p.path || current.startsWith(p.path + '/')
                return (
                  <li key={p.path} className="rf-menu__row" style={{ '--i': i }}>
                    <a
                      ref={i === 0 ? firstRef : undefined}
                      href={p.path}
                      onClick={onNav(p.path)}
                      className={`rf-menu__item${here ? ' is-here' : ''}`}
                      aria-current={here ? 'page' : undefined}
                    >
                      <span className="rf-menu__no">{p.no}</span>
                      <span className="rf-menu__title">{p.title}</span>
                      <span className="rf-menu__note">({p.note})</span>
                      <span className="rf-menu__count">{countLabel(p.section, counts)}</span>
                      <span className="rf-menu__arrow" aria-hidden="true">→</span>
                    </a>
                  </li>
                )
              })}
            </ol>

            <div className="rf-menu__foot">
              <span className="rf-label">Room temp 23.0°C · Subjects 02 · Anomaly 01</span>
              <a href="/admin" onClick={onNav('/admin')} className="rf-label rf-menu__admin">
                (Restricted) Admin →
              </a>
            </div>
          </div>
        </nav>
      )}
    </>
  )
}