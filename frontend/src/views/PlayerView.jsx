import VideoPlayer from '../components/VideoPlayer'
import RecencyMeter from '../components/RecencyMeter'

export default function PlayerView({ currentVideo, onShuffle, onNext, onPrev, hasNext, hasPrev }) {
  const video = currentVideo

  return (
    <div className="player-view">
      <aside className="side-info">
        {video && (
          <>
            <div className="liked-block">
              <span className="liked-label">Liked</span>
              <span className="liked-date">
                {new Date(video.liked_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <RecencyMeter recency={video.recency} />
            </div>
            {video.uploader && (
              <a className="creator-link" href={video.uploader_url} target="_blank" rel="noreferrer">
                @{video.uploader}
              </a>
            )}
            {video.description && (
              <p className="description">{video.description}</p>
            )}
            <a className="tiktok-link" href={video.original_url} target="_blank" rel="noreferrer">
              Open on TikTok →
            </a>
          </>
        )}
      </aside>

      <div className="video-wrapper">
        {!video
          ? <div className="video-placeholder">Loading…</div>
          : <VideoPlayer key={video.id} src={video.local_video_url} poster={video.local_thumbnail_url} />}
      </div>

      <aside className="side-controls">
        <button className="shuffle-btn" onClick={onShuffle} disabled={!video}>
          Shuffle
        </button>
        <div className="nav-row">
          <button className="nav-btn" onClick={onPrev} disabled={!hasPrev} aria-label="Previous (newer)">‹ Prev</button>
          <button className="nav-btn" onClick={onNext} disabled={!hasNext} aria-label="Next (older)">Next ›</button>
        </div>
      </aside>
    </div>
  )
}
