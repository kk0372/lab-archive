import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './intro.css'

/* ──────────────────────────────────────────────
   길이 조절: 이 두 숫자만 고치면 됨
   PACE: 전체 속도 배율 (1 = 원래 속도, 클수록 느림)
   HOLD: 100%에 도달한 뒤 걷히기 전까지 멈추는 시간 (ms)
   ────────────────────────────────────────────── */
const PACE = 1.1
const HOLD = 200

const ms = (v) => v * PACE

const T = {
  progressEnd: ms(2500),       // 000% → 100%
  fillStart: ms(1150),         // 액체가 차오르기 시작 (CSS와 맞물림)
  fillDur: ms(800),
  exitAt: ms(2650) + HOLD,     // 화면이 걷히기 시작
  exitDur: 520,                // 걷히는 시간 (intro.css의 rf-intro-wipe와 같게, 늦추지 않음)
  frogAt: ms(1700),
  frogHold: 90,                // 개구리가 보이는 시간 (늦추지 않음)
  anomalyChance: 0.05,         // 예외가 생길 확률
}

const STATUS = [
  [0, 'Initialising observation'],
  [400, 'Aligning grid — 12 col'],
  [950, 'Containment — sealed'],
  [1250, 'Filling medium — 23.0°C'],
  [1950, 'Sample introduced'],
  [2350, 'Subject status — stable'],
  [2520, 'Access granted'],
].map(([t, text]) => [ms(t), text])

const VOLUME = 34.0
const COLS = Array.from({ length: 11 }, (_, j) => j + 1)
const rand = (a, b) => a + Math.random() * (b - a)
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/* 이번 방문에 인트로를 틀지, 예외가 생길지 한 번만 결정
   ?lab&intro       → 항상 재생 (테스트용)
   ?lab&intro=tilt  → 비뚤어진 선 예외 강제
   ?lab&intro=frog  → 개구리 예외 강제
   ?lab&intro=hold  → 끝까지 재생 후 멈춤, 클릭하면 걷힘 (캡처용) */
function decide() {
  try {
    const q = new URLSearchParams(window.location.search)
    const mode = q.get('intro')
    const forced = q.has('intro')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const seen = sessionStorage.getItem('rf-intro-seen') === '1'

    let anomaly = null
    if (mode === 'tilt' || mode === 'frog') anomaly = mode
    else if (Math.random() < T.anomalyChance) anomaly = Math.random() < 0.5 ? 'tilt' : 'frog'

    return {
      play: forced || (!reduced && !seen),
      anomaly,
      hold: mode === 'hold',
    }
  } catch {
    return { play: false, anomaly: null, hold: false }
  }
}

const RUN = decide()
let playedThisLoad = false   // 한 번 재생하면, 페이지를 이동했다 돌아와도 다시 안 나옴

/* 매번 달라지는 것: 방울 위치·크기, 번지는 모양 */
const VARY = {
  '--drop-x': `${rand(28, 72).toFixed(1)}%`,
  '--drop-s': `${rand(7, 12).toFixed(1)}px`,
  '--sx': rand(1.8, 3.4).toFixed(2),
  '--sy': rand(0.8, 1.6).toFixed(2),
  '--rot': `${rand(-35, 35).toFixed(1)}deg`,
}

function readObs() {
  try {
    const v = sessionStorage.getItem('rf-obs-session')
    return v ? v.padStart(4, '0') : '----'
  } catch {
    return '----'
  }
}

export default function Intro() {
  const [phase, setPhase] = useState(() => (RUN.play && !playedThisLoad ? 'play' : 'done'))
  const playing = useRef(phase === 'play').current
  const rootRef = useRef(null)
  const pctRef = useRef(null)
  const volRef = useRef(null)
  const msgRef = useRef(null)
  const exitRef = useRef(() => {})

  /* 인트로 동안: 스크롤 잠금 + 히어로 애니메이션 일시정지 */
  useLayoutEffect(() => {
    if (!playing) return
    const html = document.documentElement
    html.classList.add('rf-intro-active')
    window.scrollTo(0, 0)
    return () => html.classList.remove('rf-intro-active')
  }, [])

  useEffect(() => {
    if (!playing) return
    let disposed = false
    let exiting = false
    let raf = 0
    let exitTimer = 0
    const timers = []
    const start = performance.now()

    /* CSS 애니메이션(선·그리드·용기·방울)도 같은 배율로 늦춤 */
    const root = rootRef.current
    if (root && typeof root.getAnimations === 'function') {
      root.getAnimations({ subtree: true }).forEach((a) => {
        a.playbackRate = 1 / PACE
      })
    }

    const at = (t, fn) => {
      timers.push(
        setTimeout(() => {
          if (!disposed) fn()
        }, t),
      )
    }

    const setStatus = (text, alert = false) => {
      const el = msgRef.current
      if (!el) return
      el.textContent = text
      el.classList.toggle('is-alert', alert)
    }

    /* 진행률 + 부피 */
    const tick = (now) => {
      if (disposed) return
      const t = now - start
      const p = clamp01(t / T.progressEnd)
      const e = 1 - Math.pow(1 - p, 1.6)
      if (pctRef.current) pctRef.current.textContent = String(Math.floor(e * 100)).padStart(3, '0')

      const f = clamp01((t - T.fillStart) / T.fillDur)
      const fe = 1 - Math.pow(1 - f, 3)
      if (volRef.current) volRef.current.textContent = (fe * VOLUME).toFixed(1).padStart(4, '0')

      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    /* 상태 문구 */
    STATUS.forEach(([t, text]) => at(t, () => setStatus(text)))

    /* 예외 */
    if (RUN.anomaly === 'tilt') {
      at(ms(600), () => setStatus('Line 01 — deviation +0.5°', true))
    }
    if (RUN.anomaly === 'frog') {
      at(T.frogAt, () => {
        rootRef.current?.classList.add('is-frog')
        setStatus('Unmodelled input — ignored', true)
      })
      at(T.frogAt + T.frogHold, () => rootRef.current?.classList.remove('is-frog'))
    }

    /* 걷히기 (자동 또는 건너뛰기) */
    const exit = () => {
      if (exiting || disposed) return
      exiting = true
      playedThisLoad = true   // ← 추가
      timers.forEach(clearTimeout)
      cancelAnimationFrame(raf)
      rootRef.current?.classList.remove('is-frog')
      if (pctRef.current) pctRef.current.textContent = '100'
      if (volRef.current) volRef.current.textContent = VOLUME.toFixed(1)
      setStatus('Access granted')

      // 히어로 애니메이션 재생 시작
      document.documentElement.classList.remove('rf-intro-active')
      try {
        sessionStorage.setItem('rf-intro-seen', '1')
      } catch {
        /* 저장 못 해도 동작에는 문제없음 */
      }

      setPhase('exit')
      exitTimer = setTimeout(() => {
        if (!disposed) setPhase('done')
      }, T.exitDur)
    }
    exitRef.current = exit

    // 캡처용 hold 모드에서는 자동으로 걷히지 않음
    if (!RUN.hold) at(T.exitAt, exit)

    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') exit()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      disposed = true
      timers.forEach(clearTimeout)
      clearTimeout(exitTimer)
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (phase === 'done') return null

  const cls = [
    'rf-intro',
    phase === 'exit' ? 'is-exit' : '',
    RUN.anomaly === 'tilt' ? 'is-tilt' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={rootRef}
      className={cls}
      style={VARY}
      onPointerDown={() => exitRef.current()}
    >
      {/* 그리드 */}
      <div className="rf-intro__grid" aria-hidden="true">
        {COLS.map((i) => (
          <span
            key={i}
            className={`rf-intro__v${i % 2 ? ' is-odd' : ''}`}
            style={{ '--i': i, '--k': Math.abs(i - 6) }}
          />
        ))}
        <span className="rf-intro__h rf-intro__h--a" />
        <span className="rf-intro__h rf-intro__h--b" />
      </div>

      {/* 첫 가로선 */}
      <div className="rf-intro__hwrap" aria-hidden="true">
        <span className="rf-intro__hline" />
      </div>

      {/* 용기 */}
      <div className="rf-intro__vessel" aria-hidden="true">
        <span className="rf-intro__edge rf-intro__edge--t" />
        <span className="rf-intro__edge rf-intro__edge--r" />
        <span className="rf-intro__edge rf-intro__edge--b" />
        <span className="rf-intro__edge rf-intro__edge--l" />
        <span className="rf-intro__scale" />
        <span className="rf-intro__c rf-intro__c--tl" />
        <span className="rf-intro__c rf-intro__c--tr" />
        <span className="rf-intro__c rf-intro__c--bl" />
        <span className="rf-intro__c rf-intro__c--br" />

        <div className="rf-intro__clip">
          <div className="rf-intro__liquid">
            <span className="rf-intro__spread" />
          </div>
        </div>
        <span className="rf-intro__drop" />
        <span className="rf-intro__ripple" />

        <span className="rf-intro__vlabel">(Containment) RF-01-C</span>
        <span className="rf-intro__vol">
          Vol. <b ref={volRef}>00.0</b> mL
        </span>
      </div>

      {/* 개구리 (예외) */}
      <svg className="rf-intro__frog" viewBox="0 0 40 30" aria-hidden="true">
        <g fill="currentColor">
          <circle cx="13" cy="7" r="4.5" />
          <circle cx="27" cy="7" r="4.5" />
          <ellipse cx="20" cy="17" rx="13" ry="9" />
          <ellipse cx="7" cy="26" rx="6" ry="3" />
          <ellipse cx="33" cy="26" rx="6" ry="3" />
        </g>
      </svg>

      {/* 글자 */}
      <div className="rf-intro__ui rf-intro__tl">
        RF-01 / OBS. <b>{readObs()}</b>
      </div>

      <button
        type="button"
        className="rf-intro__ui rf-intro__skip"
        onClick={() => exitRef.current()}
      >
        (Skip)
      </button>

      <div className="rf-intro__ui rf-intro__pct">
        <span>(Calibration)</span>
        <span className="rf-intro__num">
          <b ref={pctRef}>000</b>
          <small>%</small>
        </span>
      </div>

      <div className="rf-intro__ui rf-intro__status">
        <span>(Status)</span>
        <span ref={msgRef} className="rf-intro__msg">
          {STATUS[0][1]}
        </span>
      </div>
    </div>
  )
}