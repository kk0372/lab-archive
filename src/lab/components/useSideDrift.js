import { useEffect } from 'react'

/* ── 조절 손잡이 ── */
export const DRIFT = {
  max: 160,     // 최대로 내려가는 거리 (px)
  ease: 0.12,   // 따라오는 속도 (작을수록 느긋하게)
  bottom: 96,   // 화면 아래(HUD)와 남겨둘 간격 (px)
}

/**
 * 스크롤 진행도에 맞춰 왼쪽 칸(sticky)을 아주 천천히 아래로 내림
 * sideRef: 왼쪽 칸 / gridRef: 왼쪽 칸 + 본문을 감싼 격자
 */
export default function useSideDrift(sideRef, gridRef) {
  useEffect(() => {
    const side = sideRef.current
    const grid = gridRef.current
    if (!side || !grid) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cur = 0
    let target = 0
    let raf = 0

    const measure = () => {
      const cs = getComputedStyle(side)
      if (cs.position !== 'sticky') {
        target = 0
        return
      }
      const top = parseFloat(cs.top) || 0
      const g = grid.getBoundingClientRect()
      const h = side.offsetHeight
      const range = g.height - h
      if (range <= 0) {
        target = 0
        return
      }
      const p = Math.min(1, Math.max(0, (top - g.top) / range))   // 본문 진행도 0~1
      const room = window.innerHeight - top - h - DRIFT.bottom      // 아래 남은 공간
      target = p * Math.max(0, Math.min(room, DRIFT.max))
    }

    const tick = () => {
      raf = 0
      measure()
      cur += (target - cur) * (reduced ? 1 : DRIFT.ease)
      if (Math.abs(target - cur) < 0.2) cur = target
      side.style.transform = cur ? `translate3d(0, ${cur.toFixed(2)}px, 0)` : ''
      if (cur !== target) raf = requestAnimationFrame(tick)
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    kick()
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      side.style.transform = ''
    }
  }, [sideRef, gridRef])
}