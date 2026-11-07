import { useEffect, useRef } from 'react'

/* ──────────────────────────────────────────────
   조절용 값
   ────────────────────────────────────────────── */
const CONFIG = {
  focusAt: 0.62,       // 화면 위에서부터 이 비율 지점보다 위로 올라오면 완전히 선명
  range: 0.3,          // 그 아래로 화면 높이의 이 비율만큼 내려가면 최대로 흐림
  maxBlur: 6,          // 최대 흐림 (px)
  maxBlurMobile: 3,    // 폰에서 최대 흐림
  minOpacity: 0.18,    // 가장 흐릴 때의 진하기
}

const smooth = (t) => t * t * (3 - 2 * t)

/**
 * 사용법: <FocusText text="문단 내용" className="..." />
 * as="h2"처럼 태그를 바꿀 수도 있음.
 */
export default function FocusText({ text, as: Tag = 'p', className = '', style }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    const words = Array.from(el.querySelectorAll('.rf-focus__w'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || words.length === 0) return

    const coarse = window.matchMedia('(pointer: coarse)').matches
    const maxBlur = coarse ? CONFIG.maxBlurMobile : CONFIG.maxBlur

    let lines = []
    let raf = 0

    /* 같은 줄에 있는 단어끼리 묶기 (줄바꿈 위치는 화면 폭마다 다르니까 매번 다시 잼) */
    const measure = () => {
      const map = new Map()
      for (const w of words) {
        const key = Math.round(w.offsetTop / 8)
        if (!map.has(key)) map.set(key, { top: w.offsetTop, ws: [] })
        map.get(key).ws.push(w)
      }
      lines = Array.from(map.values()).map((l) => ({ ...l, last: -1 }))
    }

    /* 각 줄의 화면 위치에 따라 흐림·진하기 적용 */
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const base = el.getBoundingClientRect().top
      const focusY = vh * CONFIG.focusAt
      const range = vh * CONFIG.range

      for (const line of lines) {
        let t = (base + line.top - focusY) / range
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const q = Math.round(smooth(t) * 100) / 100
        if (q === line.last) continue      // 바뀐 줄만 다시 그림
        line.last = q

        const filter = q === 0 ? 'none' : `blur(${(q * maxBlur).toFixed(2)}px)`
        const opacity = String(1 - q * (1 - CONFIG.minOpacity))
        for (const w of line.ws) {
          w.style.filter = filter
          w.style.opacity = opacity
        }
      }
    }

    const request = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    const remeasure = () => {
      measure()
      for (const l of lines) l.last = -1
      request()
    }

    remeasure()
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure)

    const ro = new ResizeObserver(remeasure)
    ro.observe(el)
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
    }
  }, [text])

  const parts = text.split(/(\s+)/)

  return (
    <Tag
      ref={ref}
      className={`rf-focus ${className}`}
      style={{ position: 'relative', ...style }}
    >
      {parts.map((p, i) =>
        /^\s+$/.test(p) ? (
          p
        ) : (
          <span key={i} className="rf-focus__w" style={{ display: 'inline-block' }}>
            {p}
          </span>
        ),
      )}
    </Tag>
  )
}