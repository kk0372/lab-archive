import { useEffect, useState } from 'react'
import * as client from '../../supabase.js'

/* supabase.js가 어떤 이름으로 내보내든 Supabase 연결을 찾아옴 */
export const supabase =
  client.supabase ??
  client.default ??
  Object.values(client).find(
    (v) => v && typeof v.rpc === 'function' && typeof v.from === 'function',
  )

if (!supabase) {
  console.error(
    '[RF-01] src/supabase.js에서 Supabase 연결을 찾지 못함. createClient 줄 앞에 export가 있는지 확인.',
  )
}

const BUCKET = 'images'
const CODE_KEY = 'rf-access-code'

export const SECTIONS = ['visual', 'chronicles', 'logs']

/* ── 표기 ── */
export const pad2 = (n) => String(n).padStart(2, '0')
export const pad4 = (n) => String(n).padStart(4, '0')
export const classifiedCode = (id) => `RF-01-C/${pad4(id)}`

/* ── 이미지 ── */
export function imageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

/* 대표 이미지 = 맨 앞 */
export const coverPath = (post) => post?.images?.[0] ?? null

/* ── 읽기 ── */

/* 모든 글의 번호·구역·등급·날짜 (제목·본문 없음) */
export async function fetchStubs() {
  const { data, error } = await supabase.rpc('post_stubs')
  if (error) throw error
  return data ?? []
}

/* 볼 수 있는 글 (방문자: 공개 글만 / 로그인한 나: 전부) */
export async function fetchPosts(section) {
  let q = supabase.from('posts').select('*').order('created_at', { ascending: false })
  if (section) q = q.eq('section', section)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

/* 목록용: 볼 수 있는 글 + 잠긴 글 자리표시 ({ locked: true }) */
export async function fetchSection(section) {
  const [rows, stubs] = await Promise.all([fetchPosts(section), fetchStubs()])
  const have = new Set(rows.map((r) => r.id))
  const locked = stubs
    .filter((s) => s.section === section && !have.has(s.id))
    .map((s) => ({ ...s, locked: true }))
  return [...rows, ...locked].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )
}

/* ── CLASSIFIED 열람 ── */
export async function unlockClassified(code) {
  const { data, error } = await supabase.rpc('unlock_classified', { code })
  if (error) return { ok: false, posts: [] }
  try {
    sessionStorage.setItem(CODE_KEY, code)   // 이 탭에서는 다시 안 물어봄
  } catch {
    /* 저장 못 해도 동작에는 문제없음 */
  }
  return { ok: true, posts: data ?? [] }
}

export function savedCode() {
  try {
    return sessionStorage.getItem(CODE_KEY)
  } catch {
    return null
  }
}

/* ── 구역별 글 개수 (메뉴·인덱스가 같이 씀, 한 번만 불러옴) ── */
let countsCache = null
let countsPromise = null
const listeners = new Set()

function loadCounts(force = false) {
  if (!force && countsPromise) return countsPromise
  countsPromise = fetchStubs()
    .then((stubs) => {
      const c = { visual: 0, chronicles: 0, logs: 0 }
      for (const s of stubs) if (s.section in c) c[s.section] += 1
      countsCache = c
      listeners.forEach((fn) => fn(c))
      return c
    })
    .catch((err) => {
      console.warn('[RF-01] counts unavailable:', err)
      countsPromise = null   // 다음에 다시 시도
      return null
    })
  return countsPromise
}

/* 글을 쓰거나 지운 뒤 호출하면 개수가 새로 고쳐짐 (PHASE 1에서 사용) */
export function notifyPostsChanged() {
  loadCounts(true)
}

export function useCounts() {
  const [counts, setCounts] = useState(countsCache)
  useEffect(() => {
    listeners.add(setCounts)
    loadCounts()
    return () => listeners.delete(setCounts)
  }, [])
  return counts
}

/* 표시용: DB 구역이면 (03), 코드 파일 페이지면 — */
export function countLabel(section, counts) {
  if (!section) return '—'
  if (!counts) return '(··)'
  return `(${pad2(counts[section] ?? 0)})`
}

/* ==========================================================
   관리 (1-B)
   ========================================================== */

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/* 글 삭제: DB 먼저 → 저장소 이미지 나중. 지운 이미지 개수를 돌려줌 */
export async function deletePost(post) {
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', post.id)
    .select('id')
  if (error) throw error
  // 권한 문제 등으로 실제로는 안 지워졌으면 실패로 처리
  if (!data || data.length === 0) throw new Error('NOT_DELETED')

  const paths = (post.images ?? []).filter((p) => p && !/^https?:\/\//.test(p))
  let removed = 0
  if (paths.length) {
    const { data: gone, error: e2 } = await supabase.storage.from(BUCKET).remove(paths)
    if (e2) console.warn('[RF-01] image cleanup failed:', e2)
    else removed = gone?.length ?? 0
  }

  notifyPostsChanged()
  return removed
}

/* ==========================================================
   글쓰기·수정 (1-B-2)
   ========================================================== */

/* DAY 001 = 이비가 귀국한 날 (= 보호 시작).
   날짜가 정해지면 'YYYY-MM-DD' 형식으로 넣어. 예: '2024-11-08' */
export const DAY_ONE = '2024-12-03'

export function dayNumber(iso) {
  if (!DAY_ONE || !iso) return null
  const [y, m, d] = DAY_ONE.split('-').map(Number)
  const t = new Date(iso)
  const a = Date.UTC(y, m - 1, d)
  const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.floor((b - a) / 86400000) + 1
}

/* DAY 047 / 14:32 */
export function dayLabel(iso) {
  const t = iso ? new Date(iso) : null
  const time = t ? `${pad2(t.getHours())}:${pad2(t.getMinutes())}` : '--:--'
  const n = dayNumber(iso)
  if (n == null) return `DAY ??? / ${time}`
  if (n < 1) return `PRE-OBS. / ${time}`   // 귀국 전 기록
  return `DAY ${String(n).padStart(3, '0')} / ${time}`
}

const EDITABLE = [
  'title', 'body', 'subjects', 'artist', 'artist_url',
  'drawn_on', 'observed_at', 'access', 'images',
]

/* 글 하나 (로그인한 나: CLASSIFIED 포함) */
export async function fetchPost(id) {
  const { data, error } = await supabase.from('posts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

/* 저장: id가 없으면 새 글, 있으면 수정. images는 여기서 건드리지 않음 */
export async function savePost(id, section, fields) {
  const payload = { section }
  for (const k of EDITABLE) if (k in fields) payload[k] = fields[k]

  const q = id
    ? supabase.from('posts').update(payload).eq('id', id)
    : supabase.from('posts').insert(payload)
  const { data, error } = await q.select().single()
  if (error) throw error

  notifyPostsChanged()
  return data
}

/* 저장 후 목록 화면에 잠깐 띄울 알림 */
let flash = null
export function setFlash(section, text) {
  flash = { section, text, at: Date.now() }
}
export function readFlash(section) {
  if (!flash || flash.section !== section || Date.now() - flash.at > 4000) return null
  return { text: flash.text, alert: false }
}

/* ==========================================================
   이미지 업로드 (1-B-3)
   ========================================================== */

export const MAX_IMAGES = 20
export const MAX_BYTES = 50 * 1024 * 1024   // 버킷 한도와 같게

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

/* 올릴 수 없는 파일이면 이유를, 괜찮으면 null을 돌려줌 */
export function checkImageFile(file) {
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) {
    return 'HEIC unsupported — convert to JPG'
  }
  if (!IMAGE_TYPES[file.type]) return 'Unsupported format'
  if (file.size > MAX_BYTES) return 'Exceeds 50 MB'
  return null
}

export function fmtBytes(n) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/* 무작위 파일 이름 (폰에서 내부망 주소로 테스트할 때도 작동하게 예비 방식 포함) */
function randomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function uploadImage(file, section) {
  const ext = IMAGE_TYPES[file.type] ?? 'bin'
  const path = `${section}/${randomId()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',   // 이름이 매번 달라서 오래 캐시해도 안전
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeImages(paths) {
  const list = (paths ?? []).filter((p) => p && !/^https?:\/\//.test(p))
  if (!list.length) return 0
  const { data, error } = await supabase.storage.from(BUCKET).remove(list)
  if (error) {
    console.warn('[RF-01] image cleanup failed:', error)
    return 0
  }
  return data?.length ?? 0
}

/**
 * 이미지까지 포함한 저장
 * items: [{ kind: 'stored', path } | { kind: 'new', key, file }]  (화면 순서 = 저장 순서)
 * original: 저장되어 있던 이미지 경로 목록 (수정할 때)
 * 순서: 새 이미지 업로드 → 글 저장 → (성공 시) 뺀 이미지 삭제
 *       실패하면 방금 올린 파일을 지워서 되돌림
 */
export async function commitPost(id, section, fields, items, original = [], onProgress) {
  const fresh = items.filter((i) => i.kind === 'new')
  const uploaded = new Map()

  try {
    for (let i = 0; i < fresh.length; i += 1) {
      onProgress?.({ done: i, total: fresh.length })
      uploaded.set(fresh[i].key, await uploadImage(fresh[i].file, section))
    }
    onProgress?.({ done: fresh.length, total: fresh.length })
  } catch (err) {
    await removeImages([...uploaded.values()])
    throw err
  }

  const images = items.map((i) => (i.kind === 'new' ? uploaded.get(i.key) : i.path))

  let row
  try {
    row = await savePost(id, section, { ...fields, images })
  } catch (err) {
    await removeImages([...uploaded.values()])
    throw err
  }

  const dropped = original.filter((p) => !images.includes(p))
  if (dropped.length) await removeImages(dropped)

  return row
}