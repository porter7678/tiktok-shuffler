import { useState, useEffect } from 'react'
import VideoPlayer from '../components/VideoPlayer'
import RecencyMeter from '../components/RecencyMeter'

const TARGET_LUFS = -14

function AudioInfo({ info }) {
  const fmtLufs = v => v == null ? '—' : `${v.toFixed(1)} LUFS`
  const fmtDb = g => g == null ? '—' : `${g >= 1 ? '+' : ''}${(20 * Math.log10(g)).toFixed(1)} dB`
  const status = info?.status ?? 'idle'
  const statusLabel = { analyzing: 'analyzing…', normalized: 'normalized', clamped: 'clamped', unavailable: 'unavailable' }[status] ?? '—'

  return (
    <div className="audio-info">
      <div className="audio-info-title">Audio</div>
      <div className="audio-info-row"><span>Detected</span><span>{status === 'analyzing' ? 'analyzing…' : fmtLufs(info?.lufs)}</span></div>
      <div className="audio-info-row"><span>Target</span><span>{TARGET_LUFS.toFixed(1)} LUFS</span></div>
      <div className="audio-info-row"><span>Applied</span><span>{fmtDb(info?.gain)}</span></div>
      {status === 'clamped' && info?.rawGain != null && (
        <div className="audio-info-row audio-info-row--muted"><span>Raw</span><span>{fmtDb(info.rawGain)}</span></div>
      )}
      <div className="audio-info-row"><span>Status</span><span>{statusLabel}</span></div>
    </div>
  )
}

function HeartIcon({ filled }) {
  return filled
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#fe2c55" stroke="#fe2c55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
}

function BookmarkIcon({ filled }) {
  return filled
    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
}

export default function PlayerView({ currentVideo, onShuffle, onNext, onPrev, hasNext, hasPrev, onToggleLike, onToggleFavorite }) {
  const video = currentVideo
  const [hovered, setHovered] = useState(false)
  const [locked, setLocked] = useState(false)
  const [audioInfo, setAudioInfo] = useState(null)

  useEffect(() => {
    setHovered(false)
    setLocked(false)
    setAudioInfo(null)
  }, [currentVideo?.id])

  const playbackRate = hovered || locked ? 2 : 1
  const liked = !!video?.liked_marked_at
  const favorited = !!video?.favorited_marked_at

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
              {video.upload_date && (
                <span className="posted-date">
                  Posted {new Date(video.upload_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            {video.uploader && (
              <a className="creator-link" href={video.uploader_url} target="_blank" rel="noreferrer">
                {video.channel && <span className="creator-display-name">{video.channel}</span>}
                <span className="creator-handle">@{video.uploader}</span>
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
          : <VideoPlayer key={video.id} src={video.local_video_url} poster={video.local_thumbnail_url} playbackRate={playbackRate} videoId={video.id} onLoudness={setAudioInfo} />}
      </div>

      <aside className="side-controls">
        <button className="shuffle-btn" onClick={onShuffle} disabled={!video}>
          Shuffle
        </button>
        <div className="nav-row">
          <button className="nav-btn" onClick={onPrev} disabled={!hasPrev} aria-label="Previous (newer)">‹ Prev</button>
          <button className="nav-btn" onClick={onNext} disabled={!hasNext} aria-label="Next (older)">Next ›</button>
        </div>
        <button
          className={`nav-btn speed-btn${locked ? ' nav-btn--active' : ''}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setLocked(l => !l)}
          disabled={!video}
        >
          2×
        </button>
        <div className="mark-row">
          <button
            className={`mark-btn${liked ? ' mark-btn--liked' : ''}`}
            onClick={onToggleLike}
            disabled={!video}
            aria-label={liked ? 'Remove like' : 'Like'}
            title={liked ? 'Remove like' : 'Like'}
          >
            <HeartIcon filled={liked} />
          </button>
          <button
            className={`mark-btn${favorited ? ' mark-btn--favorited' : ''}`}
            onClick={onToggleFavorite}
            disabled={!video}
            aria-label={favorited ? 'Remove favorite' : 'Favorite'}
            title={favorited ? 'Remove favorite' : 'Favorite'}
          >
            <BookmarkIcon filled={favorited} />
          </button>
        </div>
        <AudioInfo info={audioInfo} />
      </aside>
    </div>
  )
}
