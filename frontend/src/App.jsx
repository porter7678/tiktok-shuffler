import { useEffect, useMemo, useState } from 'react'
import './App.css'
import PlayerView from './views/PlayerView'
import GridView from './views/GridView'

export default function App() {
  const [videos, setVideos] = useState([])
  const [view, setView] = useState('player')
  const [currentVideo, setCurrentVideo] = useState(null)
  const [filter, setFilter] = useState('all')   // 'all' | 'liked' | 'favorites'
  const [sortBy, setSortBy] = useState('liked_at') // 'liked_at' | 'marked_at'

  useEffect(() => {
    fetch('/api/videos')
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.videos)
        setCurrentVideo(d.videos[Math.floor(Math.random() * d.videos.length)])
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

  const shuffle = () => {
    if (filteredVideos.length === 0) return
    setCurrentVideo(filteredVideos[Math.floor(Math.random() * filteredVideos.length)])
  }

  const next = () => {
    if (currentIndex >= 0 && currentIndex < filteredVideos.length - 1) {
      setCurrentVideo(filteredVideos[currentIndex + 1])
    }
  }

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentVideo(filteredVideos[currentIndex - 1])
    }
  }

  const selectFromGrid = (v) => {
    setCurrentVideo(v)
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
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'liked' ? '♥ Liked' : '★ Favorites'}
            </button>
          ))}
        </div>
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
      {view === 'player'
        ? <PlayerView
            currentVideo={currentVideo}
            onShuffle={shuffle}
            onNext={next}
            onPrev={prev}
            hasNext={currentIndex >= 0 && currentIndex < filteredVideos.length - 1}
            hasPrev={currentIndex > 0}
            onToggleLike={() => toggleMark('liked')}
            onToggleFavorite={() => toggleMark('favorited')}
          />
        : <GridView videos={filteredVideos} onSelect={selectFromGrid} />}
    </div>
  )
}
