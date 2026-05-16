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
  const liked = !!video.liked_marked_at
  const favorited = !!video.favorited_marked_at

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
      {(liked || favorited) && (
        <div className="thumb-badges">
          {liked && (
            <span className="thumb-badge thumb-badge--liked">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#fe2c55" stroke="#fe2c55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </span>
          )}
          {favorited && (
            <span className="thumb-badge thumb-badge--favorited">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#f5c518" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </span>
          )}
        </div>
      )}
    </button>
  )
}
