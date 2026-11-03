import { pad4 } from './api.js'

/* RF-01-N/0012 (N = Narrative) */
export const narrativeCode = (id) => `RF-01-N/${pad4(id)}`

/* ── 명조 글꼴: CHRONICLES에 처음 들어올 때 한 번만 불러옴 ── */
const SERIF_CSS =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap'

export function loadSerif() {
  if (document.getElementById('rf-serif')) return
  const pre = document.createElement('link')
  pre.rel = 'preconnect'
  pre.href = 'https://fonts.gstatic.com'
  pre.crossOrigin = 'anonymous'
  const css = document.createElement('link')
  css.id = 'rf-serif'
  css.rel = 'stylesheet'
  css.href = SERIF_CSS
  document.head.append(pre, css)
}

/* ── 본문 → 문단 / 장면 전환 ──
   빈 줄로 문단을 나눔. 한 문단 안의 줄바꿈은 그대로 유지.
   '***', '* * *', '---', '◇'만 있는 문단 = 장면 전환 */
const BREAK = /^(?:\*\s*){3,}$|^[-—–]{3,}$|^◇$/

export function toBlocks(body = '') {
  return (body ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((s) => s.replace(/^\n+|\s+$/g, ''))
    .filter(Boolean)
    .map((s) => (BREAK.test(s.trim()) ? { type: 'break' } : { type: 'p', text: s }))
}

/* 글자 수 (공백 제외) · 읽기 시간 (한국어 약 500자/분) */
export const READ_SPEED = 500

export function textStats(body = '') {
  const chars = (body ?? '').replace(/\s/g, '').length
  return { chars, minutes: Math.max(1, Math.round(chars / READ_SPEED)) }
}

/* 목록용 미리보기 */
export function excerpt(body = '', n = 140) {
  const flat = toBlocks(body)
    .filter((b) => b.type === 'p')
    .map((b) => b.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return flat.length > n ? `${flat.slice(0, n).trim()}…` : flat
}

/* ── 읽기 설정 (명조/고딕, 글자 크기) ── */
export const SIZES = [15, 16, 17, 19, 21]
const PREF_KEY = 'rf-read-prefs'

export function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null')
    return {
      face: p?.face === 'sans' ? 'sans' : 'serif',
      size: Number.isInteger(p?.size) && p.size >= 0 && p.size < SIZES.length ? p.size : 2,
    }
  } catch {
    return { face: 'serif', size: 2 }
  }
}

export function savePrefs(p) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p))
  } catch {
    /* 저장 못 해도 동작에는 문제없음 */
  }
}

/* ── 읽은 위치 (글마다 0~1) ── */
const POS_KEY = 'rf-read-pos'

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export function getProgress(id) {
  const v = readMap()[id]
  return typeof v === 'number' ? v : null
}

export function setProgress(id, p) {
  try {
    const m = readMap()
    m[id] = Math.round(p * 1000) / 1000
    localStorage.setItem(POS_KEY, JSON.stringify(m))
  } catch {
    /* 저장 못 해도 동작에는 문제없음 */
  }
}

export function progressLabel(id) {
  const p = getProgress(id)
  if (p == null || p < 0.02) return 'Unread'
  if (p >= 0.98) return 'Completed'
  return `Read ${String(Math.round(p * 100)).padStart(2, '0')}%`
}