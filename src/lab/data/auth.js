import { useEffect, useState } from 'react'
import { supabase } from './api.js'

/* 로그인·로그아웃 */
export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}

/* 이메일 가리기: pin0117@... → pi***@... */
export function maskEmail(email) {
  if (!email) return '—'
  const [name, domain] = email.split('@')
  return `${name.slice(0, 2)}***@${domain ?? ''}`
}

/**
 * 로그인 상태
 * - loading: 처음 확인 중
 * - user: 로그인한 계정 (없으면 null)
 * - owner: true = 등록된 주인 / false = 아님 / null = 확인 중·확인 실패
 */
export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = 아직 모름
  const [owner, setOwner] = useState(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (alive) setSession(s ?? null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  /* DB에 직접 물어봄: 이 계정이 등록된 주인인가 */
  useEffect(() => {
    let alive = true
    setOwner(null)
    if (!userId) return
    supabase.rpc('is_owner').then(({ data, error }) => {
      if (!alive) return
      setOwner(error ? null : data === true)
    })
    return () => {
      alive = false
    }
  }, [userId])

  return {
    loading: session === undefined,
    user: session?.user ?? null,
    owner,
  }
}