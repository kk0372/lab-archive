import { useEffect, useRef } from 'react'
import './cursor.css'

/* ──────────────────────────────────────────────
   조절용 숫자. 느낌이 마음에 안 들면 여기만 고치면 됨.
   ease: 0~1. 1에 가까울수록 즉시 따라오고, 작을수록 느리게 따라옴.
   ────────────────────────────────────────────── */
const CONFIG = {
  dotEase: 0.5,         // 작은 점
  ringEase: 0.13,       // 큰 원
  glowEase: 0.055,      // 이비의 빛
  stretch: 0.012,       // 빠르게 움직일 때 빛이 늘어나는 정도
  maxStretch: 0.45,     // 최대로 늘어나는 정도
  touchHoldMs: 2500,    // (폰) 터치 후 다시 떠다니기까지 걸리는 시간
  wanderSpeed: 0.00012, // (폰) 혼자 떠다니는 속도
}

// 이 요소들 위에 올리면 큰 원이 커짐
const HOVER_SELECTOR =
  'a, button, [role="button"], input, textarea, select, label, [data-cursor]'

const lerp = (a, b, k) => a + (b - a) * k

export default function Cursor() {
  const wrapRef = useRef(null)
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    const wrap = wrapRef.current
    const dot = dotRef.current
    const ring = ringRef.current
    const glow = glowRef.current

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // 마우스 기기: 기본 커서 숨김 / 터치 기기: 빛만 표시
    root.classList.add(fine ? 'rf-has-cursor' : 'rf-touch')

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const pDot = { ...target }
    const pRing = { ...target }
    const pGlow = { ...target }

    let visible = false
    let lastTouch = -Infinity
    let stretch = 0
    let angle = 0
    let raf = 0

    const show = () => {
      visible = true
      root.classList.add('rf-cursor-visible')
    }
    const hide = () => {
      visible = false
      root.classList.remove('rf-cursor-visible')
    }

    /* ── 입력 ── */
    const onMove = (e) => {
      target.x = e.clientX
      target.y = e.clientY

      if (e.pointerType === 'touch') {
        lastTouch = performance.now()
        return
      }
      if (!visible) {
        // 화면에 처음 들어올 때는 날아오지 않고 그 자리에 나타남
        Object.assign(pDot, target)
        Object.assign(pRing, target)
        Object.assign(pGlow, target)
        show()
      }
    }

    const onDown = (e) => {
      if (e.pointerType === 'touch') {
        target.x = e.clientX
        target.y = e.clientY
        lastTouch = performance.now()
      } else {
        wrap.classList.add('is-down')
      }
    }

    const onUp = () => wrap.classList.remove('is-down')

    const onOver = (e) => {
      const el = e.target instanceof Element ? e.target.closest(HOVER_SELECTOR) : null
      wrap.classList.toggle('is-hover', !!el)
    }

    // 마우스가 브라우저 창 밖으로 나가면 숨김
    const onOut = (e) => {
      if (!e.relatedTarget) hide()
    }

    /* ── 매 프레임 ── */
    const tick = (t) => {
      // (폰) 터치가 없으면 빛이 혼자 천천히 떠다님
      if (!fine && !reduced && t - lastTouch > CONFIG.touchHoldMs) {
        const s = t * CONFIG.wanderSpeed
        target.x = window.innerWidth * (0.5 + 0.3 * Math.sin(s * 1.7))
        target.y = window.innerHeight * (0.45 + 0.25 * Math.sin(s * 1.1 + 1.3))
      }

      const kDot = reduced ? 1 : CONFIG.dotEase
      const kRing = reduced ? 1 : CONFIG.ringEase
      const kGlow = reduced ? 0.2 : CONFIG.glowEase

      pDot.x = lerp(pDot.x, target.x, kDot)
      pDot.y = lerp(pDot.y, target.y, kDot)
      pRing.x = lerp(pRing.x, target.x, kRing)
      pRing.y = lerp(pRing.y, target.y, kRing)

      const prevX = pGlow.x
      const prevY = pGlow.y
      pGlow.x = lerp(pGlow.x, target.x, kGlow)
      pGlow.y = lerp(pGlow.y, target.y, kGlow)

      // 움직이는 속도만큼 진행 방향으로 늘어남 (물방울 느낌)
      const vx = pGlow.x - prevX
      const vy = pGlow.y - prevY
      const speed = Math.hypot(vx, vy)
      if (!reduced) {
        stretch = lerp(stretch, Math.min(speed * CONFIG.stretch, CONFIG.maxStretch), 0.12)
        if (speed > 0.6) angle = Math.atan2(vy, vx)
      }

      // 가만히 있을 때 아주 천천히 숨 쉬듯
      const breathe = reduced ? 1 : 1 + Math.sin(t * 0.0011) * 0.03
      const sx = (1 + stretch) * breathe
      const sy = (1 - stretch * 0.45) * breathe

      dot.style.transform = `translate3d(${pDot.x}px, ${pDot.y}px, 0) translate(-50%, -50%)`
      ring.style.transform = `translate3d(${pRing.x}px, ${pRing.y}px, 0) translate(-50%, -50%)`
      glow.style.transform =
        `translate3d(${pGlow.x}px, ${pGlow.y}px, 0) translate(-50%, -50%) ` +
        `rotate(${angle}rad) scale(${sx}, ${sy})`

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.addEventListener('mouseout', onOut)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('mouseout', onOut)
      root.classList.remove('rf-has-cursor', 'rf-touch', 'rf-cursor-visible')
    }
  }, [])

  return (
    <>
      <div ref={glowRef} className="rf-glow" aria-hidden="true" />
      <div ref={wrapRef} className="rf-cursor" aria-hidden="true">
        <div ref={ringRef} className="rf-cursor__ring" />
        <div ref={dotRef} className="rf-cursor__dot" />
      </div>
    </>
  )
}