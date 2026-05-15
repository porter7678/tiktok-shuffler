import { useEffect, useState } from 'react'
import './App.css'
import PlayerView from './views/PlayerView'
import GridView from './views/GridView'

export default function App() {
  const [videos, setVideos] = useState([])
  const [view, setView] = useState('player')
  const [currentVideo, setCurrentVideo] = useState(null)

  useEffect(() => {
    fetch('/api/videos')
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.videos)
        setCurrentVideo(d.videos[Math.floor(Math.random() * d.videos.length)])
      })
  }, [])

  const currentIndex = currentVideo
    ? videos.findIndex((v) => v.id === currentVideo.id)
    : -1

  const shuffle = () => {
    setCurrentVideo(videos[Math.floor(Math.random() * videos.length)])
  }

  const next = () => {
    if (currentIndex >= 0 && currentIndex < videos.length - 1) {
      setCurrentVideo(videos[currentIndex + 1])
    }
  }

  const prev = () => {
    if (currentIndex > 0) {
      setCurrentVideo(videos[currentIndex - 1])
    }
  }

  const selectFromGrid = (v) => {
    setCurrentVideo(v)
    setView('player')
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1 className="title">TikTok Shuffler</h1>
        <nav className="view-nav">
          <button className={view === 'player' ? 'active' : undefined} onClick={() => setView('player')}>Player</button>
          <button className={view === 'grid' ? 'active' : undefined} onClick={() => setView('grid')}>Grid</button>
        </nav>
      </div>
      {view === 'player'
        ? <PlayerView
            currentVideo={currentVideo}
            onShuffle={shuffle}
            onNext={next}
            onPrev={prev}
            hasNext={currentIndex >= 0 && currentIndex < videos.length - 1}
            hasPrev={currentIndex > 0}
          />
        : <GridView videos={videos} onSelect={selectFromGrid} />}
    </div>
  )
}
