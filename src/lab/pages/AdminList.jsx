import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PAGES, TLink } from '../Layout.jsx'
import {
  SECTIONS,
  fetchPosts,
  deletePost,
  imageUrl,
  coverPath,
  pad2,
  pad4,
  fmtDateTime,
  readFlash,
} from '../data/api.js'
import { useAuth } from '../data/auth.js'
import './admin.css'

function Head({ note, title }) {
  return (
    <>
      <div className="rf-admin__top">
        <span className="rf-label">(00) {note}</span>
        <span className="rf-label">RF-01 / Records</span>
      </div>
      <h1 className="rf-display rf-admin__title">{title}</h1>
    </>
  )
}

function Notice({ title, note, text, linkText = '← Console' }) {
  return (
    <main className="rf-admin">
      <Head note={note} title={title} />
      <div className="rf-recs__bar">
        <TLink to="/admin" className="rf-label rf-recs__back">{linkText}</TLink>
      </div>
      <p className="rf-label rf-recs__empty">{text}</p>
    </main>
  )
}

export default function AdminList() {
  const { section } = useParams()
  const valid = SECTIONS.includes(section)
  const page = PAGES.find((p) => p.section === section)
  const { loading, user, owner } = useAuth()
  const userId = user?.id ?? null

  const [posts, setPosts] = useState(null) // null = 불러오는 중
  const [loadError, setLoadError] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null) // { text, alert }

  /* 글 목록 불러오기 (로그인한 나: CLASSIFIED 포함 전부) */
  useEffect(() => {
    if (!valid || !userId) return
    let alive = true
    setPosts(null)
    setLoadError(false)
    setConfirmId(null)
    setNotice(readFlash(section))
    fetchPosts(section)
      .then((rows) => {
        if (alive) setPosts(rows)
      })
      .catch((err) => {
        console.warn('[RF-01] records unavailable:', err)
        if (alive) {
          setPosts([])
          setLoadError(true)
        }
      })
    return () => {
      alive = false
    }
  }, [section, valid, userId])

  /* 확인 칸이 열려 있을 때 Esc로 취소 */
  useEffect(() => {
    if (confirmId == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setConfirmId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmId])

  const onDelete = async (post) => {
    if (busyId) return
    setBusyId(post.id)
    setNotice(null)
    try {
      const removed = await deletePost(post)
      setPosts((list) => list.filter((p) => p.id !== post.id))
      setNotice({
        text:
          `Record #${pad4(post.id)} purged` +
          (removed ? ` · ${pad2(removed)} image(s) removed.` : '.'),
        alert: false,
      })
    } catch (err) {
      console.warn('[RF-01] purge failed:', err)
      setNotice({ text: `Purge failed — record #${pad4(post.id)} retained.`, alert: true })
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  /* ── 들어올 수 없는 경우 ── */
  if (!valid) {
    return <Notice note="Not found" title="No record" text="Unknown section." />
  }
  if (loading) {
    return (
      <main className="rf-admin">
        <Head note="Records" title={page.title} />
        <p className="rf-label rf-admin__loading">Verifying session…</p>
      </main>
    )
  }
  if (!user) {
    return (
      <Notice
        note="Restricted"
        title="Restricted"
        text="Session required — authenticate to view records."
        linkText="← Authenticate"
      />
    )
  }

  const isVisual = section === 'visual'
  const classified = posts ? posts.filter((p) => p.access === 'classified').length : 0

  return (
    <main className="rf-admin">
      <Head note="Records" title={page.title} />

      <div className="rf-recs__bar">
        <TLink to="/admin" className="rf-label rf-recs__back">← Console</TLink>
        <span className="rf-label rf-mono rf-recs__stats">
          Entries {posts ? pad2(posts.length) : '··'} · Classified{' '}
          {posts ? pad2(classified) : '··'}
        </span>
        <TLink to={`/admin/${section}/new`} className="rf-label rf-recs__new">
          + New entry
        </TLink>
      </div>

      {owner === false && (
        <p className="rf-label rf-admin__msg is-alert">
          This account is not the registered operator. Write access denied.
        </p>
      )}

      {posts === null ? (
        <p className="rf-label rf-admin__loading">Retrieving records…</p>
      ) : posts.length === 0 ? (
        <p className={`rf-label rf-recs__empty${loadError ? ' rf-admin__alert' : ''}`}>
          {loadError
            ? 'Retrieval failed — reload to retry.'
            : 'No records — awaiting first observation.'}
        </p>
      ) : (
        <ul className={`rf-recs${isVisual ? ' rf-recs--visual' : ''}`}>
          {posts.map((p) => {
            const cover = coverPath(p)
            const n = p.images?.length ?? 0
            const confirming = confirmId === p.id
            const busy = busyId === p.id

            return (
              <li key={p.id} className={`rf-rec${confirming ? ' is-confirm' : ''}`}>
                <div className="rf-rec__main">
                  {isVisual && (
                    <span className="rf-rec__thumb">
                      {cover ? (
                        <img
                          src={imageUrl(cover)}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.visibility = 'hidden'
                          }}
                        />
                      ) : (
                        <i aria-hidden="true">—</i>
                      )}
                    </span>
                  )}
                  <span className="rf-label rf-mono rf-rec__no">#{pad4(p.id)}</span>
                  <span className="rf-rec__title">{p.title || '(Untitled)'}</span>
                  <span
                    className={`rf-rec__tag${p.access === 'classified' ? ' is-classified' : ''}`}
                  >
                    {p.access}
                  </span>
                  <span className="rf-label rf-mono rf-rec__date">
                    {fmtDateTime(p.created_at)}
                  </span>
                  <span className="rf-rec__actions">
                    <TLink to={`/admin/${section}/${p.id}`} className="rf-label rf-rec__edit">
                      Edit
                    </TLink>
                    <button
                      type="button"
                      className="rf-label rf-rec__del"
                      onClick={() => setConfirmId(confirming ? null : p.id)}
                      disabled={busy || owner === false}
                      aria-expanded={confirming}
                    >
                      Delete
                    </button>
                  </span>
                </div>

                {confirming && (
                  <div
                    className="rf-rec__confirm"
                    role="alertdialog"
                    aria-label={`Purge record ${pad4(p.id)}`}
                  >
                    <span className="rf-label">
                      Purge #{pad4(p.id)}
                      {n ? ` + ${pad2(n)} image(s)` : ''}? Irreversible.
                    </span>
                    <span className="rf-rec__confirm-actions">
                      <button
                        type="button"
                        className="rf-label rf-rec__cancel"
                        onClick={() => setConfirmId(null)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rf-label rf-rec__purge"
                        onClick={() => onDelete(p)}
                        disabled={busy}
                      >
                        {busy ? 'Purging…' : 'Confirm purge'}
                      </button>
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p
        className={`rf-label rf-admin__msg${notice?.alert ? ' is-alert' : ''}`}
        role="status"
        aria-live="polite"
      >
        {notice?.text ?? ''}
      </p>
    </main>
  )
}