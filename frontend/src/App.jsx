import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import PlayerView from './views/PlayerView'
import GridView from './views/GridView'
import NudgeModal from './components/NudgeModal'
import ReshuffleModal from './components/ReshuffleModal'
import { loadHistoryFromServer, saveHistoryToServer, appendToHistory } from './utils/shuffleHistory'

export default function App() {
  const [videos, setVideos] = useState([])
  const [view, setView] = useState('player')
  const [currentVideo, setCurrentVideo] = useState(null)
  const [filter, setFilter] = useState('all')   // 'all' | 'liked' | 'favorites'
  const [sortBy, setSortBy] = useState('liked_at') // 'liked_at' | 'marked_at'
  const [navCount, setNavCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [nudgeThreshold, setNudgeThreshold] = useState(20)
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [killed, setKilled] = useState(false)
  const [history, setHistory] = useState({ ids: [], index: -1 })
  const [reshuffleOpen, setReshuffleOpen] = useState(false)
  const historyLoaded = useRef(false)

  useEffect(() => {
    if (!historyLoaded.current) return  // skip the empty initial state
    saveHistoryToServer(history)
  }, [history])

  useEffect(() => {
    Promise.all([
      fetch('/api/videos').then(r => r.json()),
      loadHistoryFromServer(),
    ]).then(([videosData, loadedHistory]) => {
      const loadedVideos = videosData.videos
      setVideos(loadedVideos)
      historyLoaded.current = true
      // Resume at last-watched video if it still exists, otherwise pick fresh
      if (loadedHistory.index >= 0 && loadedHistory.ids.length > 0) {
        const lastId = loadedHistory.ids[loadedHistory.index]
        const video = loadedVideos.find(v => v.id === lastId)
        if (video) {
          setCurrentVideo(video)
          setHistory(loadedHistory)
          return
        }
      }
      const picked = loadedVideos[Math.floor(Math.random() * loadedVideos.length)]
      setCurrentVideo(picked)
      setHistory(appendToHistory(loadedHistory, picked.id))
    })
  }, [])

  const filteredVideos = useMemo(() => {
    let list = videos
    if (filter === 'liked')     list = list.filter(v => v.liked_marked_at)
    if (filter === 'favorites') list = list.filter(v => v.favorited_marked_at)
    if (filter !== 'all' && sortBy === 'marked_at') {
      const key = filter === 'liked' ? 'liked_marked_at' : 'favorited_marked_at'
      list = [...list].sort((a, b) => b[key].localeCompare(a[key]))
    }
    return list
  }, [videos, filter, sortBy])

  const currentIndex = currentVideo
    ? filteredVideos.findIndex((v) => v.id === currentVideo.id)
    : -1

  // Derived progress info (All-pool only)
  const allVideoIds = useMemo(() => new Set(videos.map(v => v.id)), [videos])
  const seenCount = useMemo(
    () => new Set(history.ids.filter(id => allVideoIds.has(id))).size,
    [history.ids, allVideoIds]
  )
  const totalCount = videos.length

  const canBack = history.index > 0
  const canForward = history.index < history.ids.length - 1
  const showTrueShuffle = filter === 'all'

  const registerNav = () => {
    setSessionCount(c => c + 1)
    setNavCount(c => {
      const n = c + 1
      if (n >= nudgeThreshold) setNudgeOpen(true)
      return n
    })
  }

  const goTo = (video, { append = true } = {}) => {
    setCurrentVideo(video)
    if (append) {
      setHistory(h => appendToHistory(h, video.id))
      registerNav()
    }
  }

  const shuffle = () => {
    if (filteredVideos.length === 0) return
    if (filter !== 'all') {
      // Plain random for Liked / Favorites
      goTo(filteredVideos[Math.floor(Math.random() * filteredVideos.length)])
      return
    }
    // No-repeat shuffle for All
    const watchedSet = new Set(history.ids)
    const unwatched = filteredVideos.filter(v => !watchedSet.has(v.id))
    if (unwatched.length === 0) {
      setReshuffleOpen(true)
      return
    }
    goTo(unwatched[Math.floor(Math.random() * unwatched.length)])
  }

  const trueShuffle = () => {
    if (filteredVideos.length === 0) return
    goTo(filteredVideos[Math.floor(Math.random() * filteredVideos.length)])
  }

  const historyBack = () => {
    if (history.index <= 0) return
    const videoMap = new Map(videos.map(v => [v.id, v]))
    let idx = history.index - 1
    while (idx > 0 && !videoMap.has(history.ids[idx])) idx--
    const video = videoMap.get(history.ids[idx])
    if (!video) return
    setHistory(h => ({ ...h, index: idx }))
    setCurrentVideo(video)
  }

  const historyForward = () => {
    if (history.index >= history.ids.length - 1) return
    const videoMap = new Map(videos.map(v => [v.id, v]))
    let idx = history.index + 1
    while (idx < history.ids.length - 1 && !videoMap.has(history.ids[idx])) idx++
    const video = videoMap.get(history.ids[idx])
    if (!video) return
    setHistory(h => ({ ...h, index: idx }))
    setCurrentVideo(video)
  }

  const confirmReshuffle = () => {
    setReshuffleOpen(false)
    if (filteredVideos.length === 0) return
    const picked = filteredVideos[Math.floor(Math.random() * filteredVideos.length)]
    setCurrentVideo(picked)
    setHistory({ ids: [picked.id], index: 0 })
    registerNav()
  }

  const next = () => {
    if (currentIndex >= 0 && currentIndex < filteredVideos.length - 1) {
      goTo(filteredVideos[currentIndex + 1])
    }
  }

  const prev = () => {
    if (currentIndex > 0) {
      goTo(filteredVideos[currentIndex - 1])
    }
  }

  const handleContinue = (n) => {
    setNudgeThreshold(n)
    setNavCount(0)
    setNudgeOpen(false)
  }

  const handleKill = async () => {
    try { await fetch('/api/shutdown', { method: 'POST' }) } catch {}
    setKilled(true)
  }

  const selectFromGrid = (v) => {
    goTo(v)
    setView('player')
  }

  const toggleMark = (kind) => {
    if (!currentVideo) return
    const isSet = kind === 'liked' ? !!currentVideo.liked_marked_at : !!currentVideo.favorited_marked_at
    fetch(`/api/marks/${currentVideo.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, value: !isSet }),
    })
      .then(r => r.json())
      .then(updated => {
        setVideos(vs => vs.map(v => v.id === updated.id ? { ...v, ...updated } : v))
        setCurrentVideo(cv => cv?.id === updated.id ? { ...cv, ...updated } : cv)
      })
  }

  const filterLabel = filter === 'liked' ? 'Liked' : filter === 'favorites' ? 'Favorites' : null

  if (killed) {
    return <div className="killed-screen">App stopped. Close this tab.</div>
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="title">TikTok Shuffler</h1>
        <nav className="view-nav">
          <button className={view === 'player' ? 'active' : undefined} onClick={() => setView('player')}>Player</button>
          <button className={view === 'grid' ? 'active' : undefined} onClick={() => setView('grid')}>Grid</button>
        </nav>
        <div className="filter-nav">
          {['all', 'liked', 'favorites'].map(f => (
            <button
              key={f}
              className={`filter-pill${filter === f ? ' active' : ''}`}
              onClick={() => { setFilter(f); if (f !== 'all') setSortBy('marked_at') }}
            >
              {f === 'all' ? 'All' : f === 'liked' ? '♥ Liked' : '★ Favorites'}
            </button>
          ))}
        </div>
        <div className="header-right">
          {sessionCount > 0 && (
            <span className="session-count">{sessionCount} watched</span>
          )}
          {filter === 'all' && totalCount > 0 && (
            <span className="progress-indicator">
              Seen {seenCount.toLocaleString()} / {totalCount.toLocaleString()}
            </span>
          )}
          {filter !== 'all' && (
            <div className="sort-toggle">
              <span className="sort-label">{filterLabel}: </span>
              <button
                className={`sort-btn${sortBy === 'liked_at' ? ' active' : ''}`}
                onClick={() => setSortBy('liked_at')}
              >By original date</button>
              <span className="sort-sep">·</span>
              <button
                className={`sort-btn${sortBy === 'marked_at' ? ' active' : ''}`}
                onClick={() => setSortBy('marked_at')}
              >By new marked date</button>
            </div>
          )}
        </div>
      </div>
      {view === 'player'
        ? <PlayerView
            currentVideo={currentVideo}
            onShuffle={shuffle}
            onTrueShuffle={trueShuffle}
            onNext={next}
            onPrev={prev}
            hasNext={currentIndex >= 0 && currentIndex < filteredVideos.length - 1}
            hasPrev={currentIndex > 0}
            onHistoryBack={historyBack}
            onHistoryForward={historyForward}
            canBack={canBack}
            canForward={canForward}
            showTrueShuffle={showTrueShuffle}
            onToggleLike={() => toggleMark('liked')}
            onToggleFavorite={() => toggleMark('favorited')}
            paused={nudgeOpen}
          />
        : <GridView videos={filteredVideos} onSelect={selectFromGrid} />}
      {nudgeOpen && <NudgeModal onContinue={handleContinue} onKill={handleKill} />}
      {reshuffleOpen && <ReshuffleModal total={totalCount} onConfirm={confirmReshuffle} onCancel={() => setReshuffleOpen(false)} />}
    </div>
  )
}
