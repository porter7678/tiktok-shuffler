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

export default function PlayerView({ currentVideo, onShuffle, onNext, onPrev, hasNext, hasPrev }) {
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
        <AudioInfo info={audioInfo} />
      </aside>
    </div>
  )
}
