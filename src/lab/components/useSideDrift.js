import { useEffect } from 'react'

/* ── 조절 손잡이 ── */
export const DRIFT = {
  reachAt: 0.65, // 본문 진행도가 이만큼일 때 왼쪽 칸 맨 아래까지 다 드러남 (0~1)
  ease: 0.12,    // 따라오는 속도 (작을수록 느긋하게)
  bottom: 80,    // 다 드러났을 때 화면 아래(HUD)와 남길 간격 (px)
  nudge: 24,     // 칸이 화면에 다 들어갈 때도 살짝 올라가는 거리 (px, 0이면 안 움직임)
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * 본문을 스크롤하면 왼쪽 칸(sticky)이 본문보다 느리게 위로 올라가면서
 * 화면 아래에 가려져 있던 부분(표, 섹션 바로가기)을 조금씩 드러냄
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
      const vh = window.innerHeight
      const g = grid.getBoundingClientRect()
      const span = g.height - (vh - top)   // 본문이 스크롤되는 거리
      if (span <= 0) {
        target = 0
        return
      }
      const p = clamp01((top - g.top) / span)              // 본문 진행도
      const reveal = Math.min(1, p / DRIFT.reachAt)         // 칸이 드러난 정도
      const hidden = side.offsetHeight - (vh - top - DRIFT.bottom) // 화면 아래 가려진 길이
      const dist = hidden > 0 ? hidden : DRIFT.nudge
      target = -reveal * dist
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