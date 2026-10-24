import { useEffect, useRef } from 'react'
import './hud.css'

/* ──────────────────────────────────────────────
   조절용 값
   ────────────────────────────────────────────── */
const CONFIG = {
  roomTemp: '23.0',
  anomalyTemp: '23.1',              // 아주 가끔 튀는 값
  anomalyEveryMs: [20000, 45000],   // 몇 초에 한 번 튈지 (최소, 최대)
  anomalyHoldMs: 700,               // 튄 상태로 유지되는 시간
  obsStart: 147,                    // 첫 방문 때 148번부터 시작
}

const pad4 = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0')

/* 관찰 번호: 새 탭(세션)마다 +1, 새로고침으로는 안 올라감.
   컴포넌트 밖에서 한 번만 계산하니까 개발 모드에서 두 번 올라가지 않음. */
function getObservationNo() {
  try {
    const cached = sessionStorage.getItem('rf-obs-session')
    if (cached) return Number(cached)
    const next = (Number(localStorage.getItem('rf-obs-count')) || CONFIG.obsStart) + 1
    localStorage.setItem('rf-obs-count', String(next))
    sessionStorage.setItem('rf-obs-session', String(next))
    return next
  } catch {
    return CONFIG.obsStart + 1
  }
}

const OBS_NO = String(getObservationNo()).padStart(4, '0')

export default function HudFrame() {
  const xRef = useRef(null)
  const yRef = useRef(null)
  const clockRef = useRef(null)
  const tempRef = useRef(null)
  const markXRef = useRef(null)
  const markYRef = useRef(null)

  useEffect(() => {
    /* ── 커서 좌표 + 눈금자 표시선 ── */
    let px = 0
    let py = 0
    let pending = false
    let raf = 0

    const render = () => {
      pending = false
      if (xRef.current) xRef.current.textContent = pad4(px)
      if (yRef.current) yRef.current.textContent = pad4(py)
      if (markXRef.current) markXRef.current.style.transform = `translate3d(${px}px, 0, 0)`
      if (markYRef.current) markYRef.current.style.transform = `translate3d(0, ${py}px, 0)`
    }

    const onMove = (e) => {
      px = e.clientX
      py = e.clientY
      if (!pending) {
        pending = true
        raf = requestAnimationFrame(render)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })

    /* ── 실시간 시계 ── */
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    const tickClock = () => {
      if (clockRef.current) clockRef.current.textContent = fmt.format(new Date())
    }
    tickClock()
    const clockId = setInterval(tickClock, 1000)

    /* ── 실내 온도 이상값 (아주 가끔) ── */
    let anomalyId = 0
    const schedule = () => {
      const [min, max] = CONFIG.anomalyEveryMs
      anomalyId = setTimeout(() => {
        const el = tempRef.current
        if (!el) return
        el.textContent = CONFIG.anomalyTemp
        el.classList.add('is-anomaly')
        anomalyId = setTimeout(() => {
          el.textContent = CONFIG.roomTemp
          el.classList.remove('is-anomaly')
          schedule()
        }, CONFIG.anomalyHoldMs)
      }, min + Math.random() * (max - min))
    }
    schedule()

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(clockId)
      clearTimeout(anomalyId)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [])

  return (
    <div className="rf-hud" aria-hidden="true">
      {/* 프레임 + 모서리 */}
      <div className="rf-hud__frame" />
      <span className="rf-hud__corner rf-hud__corner--tl" />
      <span className="rf-hud__corner rf-hud__corner--tr" />
      <span className="rf-hud__corner rf-hud__corner--bl" />
      <span className="rf-hud__corner rf-hud__corner--br" />

      {/* 눈금자 + 커서 표시선 */}
      <div className="rf-hud__ruler rf-hud__ruler--x" />
      <div className="rf-hud__ruler rf-hud__ruler--y" />
      <span ref={markXRef} className="rf-hud__marker rf-hud__marker--x" />
      <span ref={markYRef} className="rf-hud__marker rf-hud__marker--y" />

      {/* 상태값 */}
      <div className="rf-hud__readout rf-hud__readout--bl">
        <span>
          OBS. <b>{OBS_NO}</b>
        </span>
        <span>
          Subject status — <b>Stable</b>
        </span>
      </div>

      <div className="rf-hud__readout rf-hud__readout--bc">
        <span>
          Room temp <b ref={tempRef}>{CONFIG.roomTemp}</b>°C
        </span>
      </div>

      <div className="rf-hud__readout rf-hud__readout--br">
        <span>
          X <b ref={xRef}>----</b>&nbsp;&nbsp;Y <b ref={yRef}>----</b>
        </span>
        <span>
          Local <b ref={clockRef}>--:--:--</b>
        </span>
      </div>
    </div>
  )
}