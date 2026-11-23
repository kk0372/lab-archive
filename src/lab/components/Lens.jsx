import { useEffect, useRef } from 'react'
import './lens.css'

/* ── 조절 손잡이 ── */
const R = 62          // 렌즈 반지름 (px)
const FOLLOW = 0.22   // 따라오는 속도 (작을수록 느긋하게)
const HOLD_MS = 400   // 폰: 길게 누르는 시간
const LIFT = 72       // 폰: 손가락 위로 띄우는 거리 (px)

const storeKey = (id) => `rf-lens-found-${id}`

function loadFound(id) {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(storeKey(id)) || '[]'))
  } catch {
    return new Set()
  }
}

function saveFound(id, set) {
  try {
    sessionStorage.setItem(storeKey(id), JSON.stringify([...set]))
  } catch {
    /* 저장 못 해도 동작에는 문제없음 */
  }
}

/**
 * 렌즈: rootRef 안의 .rf-sub__layers(겉 문장 + 숨은 문장)를 원 모양으로 비춤
 * onFound(n): 찾은 개수가 바뀔 때마다 호출
 */
export default function Lens({ rootRef, id, onFound }) {
  const ringRef = useRef(null)
  const onFoundRef = useRef(onFound)
  onFoundRef.current = onFound

  useEffect(() => {
    const root = rootRef.current
    const ring = ringRef.current
    if (!root || !ring) return

    const html = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hosts = Array.from(root.querySelectorAll('.rf-sub__layers'))
    const found = loadFound(id)

    const keyOf = (host) => host.querySelector('.rf-sub__under')?.textContent ?? ''
    const markFound = (host) => host.closest('.rf-sub__line')?.classList.add('is-found')

    hosts.forEach((h) => found.has(keyOf(h)) && markFound(h))
    onFoundRef.current?.(found.size)

    const tx = { x: -999, y: -999 } // 목표 위치
    const cur = { x: -999, y: -999 } // 지금 위치
    let r = 0
    let rTarget = 0
    let raf = 0

    const paint = () => {
      raf = 0
      const k = reduced ? 1 : FOLLOW
      cur.x += (tx.x - cur.x) * k
      cur.y += (tx.y - cur.y) * k
      r += (rTarget - r) * (reduced ? 1 : 0.25)
      if (Math.abs(rTarget - r) < 0.4) r = rTarget

      ring.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`
      ring.style.setProperty('--r', `${r}px`)
      ring.style.opacity = r > 1 ? '1' : '0'

      for (const host of hosts) {
        const b = host.getBoundingClientRect()
        const near =
          r > 1 &&
          cur.x > b.left - R &&
          cur.x < b.right + R &&
          cur.y > b.top - R &&
          cur.y < b.bottom + R

        if (near) {
          host.style.setProperty('--mx', `${cur.x - b.left}px`)
          host.style.setProperty('--my', `${cur.y - b.top}px`)
          host.style.setProperty('--r', `${r}px`)
          host.classList.add('is-lensed')

          // 렌즈 중심이 문장 위에 오면 '발견'
          const inside =
            cur.x > b.left && cur.x < b.right && cur.y > b.top - 6 && cur.y < b.bottom + 6
          if (r > R * 0.8 && inside) {
            const key = keyOf(host)
            if (key && !found.has(key)) {
              found.add(key)
              saveFound(id, found)
              markFound(host)
              onFoundRef.current?.(found.size)
            }
          }
        } else if (host.classList.contains('is-lensed')) {
          host.classList.remove('is-lensed')
          host.style.setProperty('--r', '0px')
        }
      }

      const moving =
        Math.abs(tx.x - cur.x) > 0.3 || Math.abs(tx.y - cur.y) > 0.3 || r !== rTarget
      if (moving) raf = requestAnimationFrame(paint)
    }

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(paint)
    }

    const openAt = (x, y) => {
      if (r < 1) {
        cur.x = x
        cur.y = y
      }
      tx.x = x
      tx.y = y
      rTarget = R
      html.classList.add('rf-lens-on')
      kick()
    }

    const close = () => {
      rTarget = 0
      html.classList.remove('rf-lens-on')
      kick()
    }

    /* ── PC: 마우스 ── */
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      openAt(e.clientX, e.clientY)
    }
    const onLeave = (e) => {
      if (e.pointerType !== 'mouse') return
      close()
    }

    /* ── 폰: 길게 누르기 ── */
    let holdTimer = 0
    let pending = false
    let touching = false
    let start = null

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      start = { x: t.clientX, y: t.clientY }
      pending = true
      clearTimeout(holdTimer)
      holdTimer = setTimeout(() => {
        pending = false
        touching = true
        navigator.vibrate?.(8)
        openAt(start.x, start.y - LIFT)
      }, HOLD_MS)
    }

    const onTouchMove = (e) => {
      const t = e.touches[0]
      if (!touching) {
        // 길게 누르기 전에 움직이면 평범한 스크롤
        if (pending && start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) {
          clearTimeout(holdTimer)
          pending = false
        }
        return
      }
      e.preventDefault()   // 렌즈를 움직이는 동안 화면 스크롤 막기
      tx.x = t.clientX
      tx.y = t.clientY - LIFT
      kick()
    }

    const onTouchEnd = () => {
      clearTimeout(holdTimer)
      pending = false
      if (touching) {
        touching = false
        close()
      }
    }

    const onContext = (e) => {
      if (pending || touching) e.preventDefault()
    }

    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerleave', onLeave)
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('touchend', onTouchEnd)
    root.addEventListener('touchcancel', onTouchEnd)
    root.addEventListener('contextmenu', onContext)
    window.addEventListener('scroll', kick, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(holdTimer)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
      root.removeEventListener('touchcancel', onTouchEnd)
      root.removeEventListener('contextmenu', onContext)
      window.removeEventListener('scroll', kick)
      html.classList.remove('rf-lens-on')
      hosts.forEach((h) => {
        h.classList.remove('is-lensed')
        h.style.removeProperty('--r')
      })
    }
  }, [id, rootRef])

  return (
    <div ref={ringRef} className="rf-lens" aria-hidden="true">
      <i />
    </div>
  )
}