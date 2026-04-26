import { useEffect, useState } from 'react'
import VideoEmbed from '../components/VideoEmbed'

export default function ShuffleView() {
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [replayKey, setReplayKey] = useState(0)

  const shuffle = async () => {
    setLoading(true)
    const r = await fetch('/api/random')
    setVideo(await r.json())
    setReplayKey(0)
    setLoading(false)
  }

  useEffect(() => { shuffle() }, [])

  const replay = () => setReplayKey(k => k + 1)

  return (
    <div className="shuffle-view">
      {video && (
        <span className="liked-date">
          Liked {new Date(video.liked_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      )}
      <div className="embed-wrapper">
        {loading || !video
          ? <div className="embed-placeholder">Loading…</div>
          : <VideoEmbed key={`${video.id}-${replayKey}`} embedUrl={video.embed_url} />}
      </div>
      <div className="controls">
        <button className="shuffle-btn" onClick={shuffle} disabled={loading}>
          Shuffle
        </button>
        <button className="replay-btn" onClick={replay} disabled={loading || !video}>
          Replay
        </button>
      </div>
      {video && (
        <a className="tiktok-link" href={video.original_url} target="_blank" rel="noreferrer">
          Open on TikTok
        </a>
      )}
    </div>
  )
}
