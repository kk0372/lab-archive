import Lenis from 'lenis'
import './smooth.css'

/* ── 조절 손잡이 ── */
export const SMOOTH = {
  enabled: true,        // false로 바꾸면 부드러운 스크롤 끔
  lerp: 0.1,            // 작을수록 더 미끄럽고 길게 (0.05 ~ 0.15 추천)
  wheelMultiplier: 1,   // 휠 한 칸에 움직이는 거리 배율
}

let lenis = null
export const getLenis = () => lenis

/* 이 요소 위에서는 기본 스크롤을 씀 (메뉴, 입력칸, 스크롤 가능한 왼쪽 칸) */
function prevent(node) {
  if (!node?.closest) return false
  if (node.closest('.rf-menu, textarea, [data-lenis-prevent]')) return true
  const side = node.closest('.rf-sub__side')
  return !!side && side.scrollHeight > side.clientHeight + 1
}

/* Layout에서 한 번 호출. 정리 함수를 돌려줌 */
export function startSmoothScroll() {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!SMOOTH.enabled || !fine || reduced || lenis) return () => {}

  lenis = new Lenis({
    lerp: SMOOTH.lerp,
    wheelMultiplier: SMOOTH.wheelMultiplier,
    smoothWheel: true,
    prevent,
  })

  let raf = 0
  const loop = (time) => {
    lenis?.raf(time)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    lenis?.destroy()
    lenis = null
  }
}