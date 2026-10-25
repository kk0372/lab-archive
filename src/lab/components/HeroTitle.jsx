import { useLayoutEffect, useRef } from 'react'
import LiquidFrame from './LiquidFrame.jsx'
import './hero.css'

const TITLE = 'RAINFROG_01'

export default function HeroTitle() {
  const rootRef = useRef(null)
  const boxRef = useRef(null)
  const titleRef = useRef(null)
  const baselineRef = useRef(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    const box = boxRef.current
    const title = titleRef.current
    let cancelled = false
    let lastW = 0

    /* 타이틀을 화면 폭에 정확히 맞춤 */
    const fit = () => {
      title.style.fontSize = '100px'
      const w = title.getBoundingClientRect().width
      const target = box.clientWidth
      if (w > 0 && target > 0) {
        title.style.fontSize = `${(100 * target) / w}px`
      }
    }

    fit()

    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      if (w !== lastW) {
        lastW = w
        fit()
      }
    })
    ro.observe(box)

    const start = () => {
      if (cancelled) return
      fit()
      root.classList.add('is-ready')
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start)
    } else {
      start()
    }

    // 폰에서 글꼴이 늦게 불러와지면 그때 한 번 더 폭을 맞춤
    const onFontsLoaded = () => {
      if (!cancelled) fit()
    }
    document.fonts?.addEventListener?.('loadingdone', onFontsLoaded)

    return () => {
      cancelled = true
      ro.disconnect()
      document.fonts?.removeEventListener?.('loadingdone', onFontsLoaded)
    }
  }, [])

  return (
    <section ref={rootRef} className="rf-hero" aria-labelledby="rf-hero-title">
      {/* 상단 라벨 */}
      <div className="rf-hero__top rf-hero__fade" style={{ '--d': '1.1s' }}>
        <span className="rf-label">RF-01</span>
        <span className="rf-label">Observation archive</span>
      </div>

      {/* 문구 + 메타 */}
      <div className="rf-hero__middle">
        <p className="rf-hero__statement rf-hero__fade" style={{ '--d': '1.25s' }}>
          Two subjects.
          <br />
          One controlled room.
          <br />
          <span className="rf-hero__dim">Deviation within tolerance.</span>
        </p>

        <ul className="rf-hero__meta rf-hero__fade" style={{ '--d': '1.4s' }}>
          <li>Observation</li>
          <li>Archive</li>
          <li>Vol. 01</li>
        </ul>
      </div>

      {/* 대형 타이틀 */}
      <div ref={boxRef} className="rf-hero__titlebox">
        <h1 id="rf-hero-title" ref={titleRef} className="rf-hero__title">
          {TITLE}
          {/* 기준선 표시용 (보이지 않음): 굴절 타이틀 위치 맞춤에 사용 */}
          <span
            ref={baselineRef}
            aria-hidden="true"
            style={{
              display: 'inline-block',
              width: 0,
              height: 0,
              verticalAlign: 'baseline',
            }}
          />
        </h1>
        <span className="rf-hero__scan" aria-hidden="true" />
      </div>

      {/* 액체 프레임 */}
      <LiquidFrame titleRef={titleRef} baselineRef={baselineRef} />

      {/* 하단 줄 */}
      <div className="rf-hero__bottom rf-hero__fade" style={{ '--d': '1.55s' }}>
        <span className="rf-hero__subject">
          <i className="rf-hero__swatch" aria-hidden="true" />
          (S-01) 서예온
        </span>
        <span className="rf-hero__subject">
          <i className="rf-hero__swatch rf-hero__swatch--evie" aria-hidden="true" />
          (S-02) 이비
        </span>
        <span className="rf-hero__scroll">
          Scroll
          <span className="rf-hero__scrollline" aria-hidden="true" />
        </span>
      </div>
    </section>
  )
}