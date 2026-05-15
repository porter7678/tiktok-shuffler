import { useState } from 'react'

function BrokenImageIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="3" x2="21" y2="21" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </svg>
  )
}

export default function ThumbnailTile({ video, onClick }) {
  const [status, setStatus] = useState(video.local_thumbnail_url ? 'loading' : 'missing')

  return (
    <button
      className="thumb-tile"
      onClick={() => onClick(video)}
      aria-label={`Liked ${new Date(video.liked_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
    >
      {video.local_thumbnail_url && (
        <img
          src={video.local_thumbnail_url}
          loading="lazy"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('missing')}
          className={status === 'loaded' ? 'thumb-img loaded' : 'thumb-img'}
          alt=""
        />
      )}
      {status !== 'loaded' && (
        <div className="thumb-placeholder">
          {status === 'missing' && <BrokenImageIcon />}
        </div>
      )}
    </button>
  )
}
