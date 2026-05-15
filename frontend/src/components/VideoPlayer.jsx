import { useRef, useEffect } from 'react'

export default function VideoPlayer({ src, poster, playbackRate = 1 }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const apply = () => { video.playbackRate = playbackRate }
    apply()
    video.addEventListener('play', apply)
    video.addEventListener('seeked', apply)
    return () => {
      video.removeEventListener('play', apply)
      video.removeEventListener('seeked', apply)
    }
  }, [playbackRate])

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster ?? undefined}
      controls
      loop
      autoPlay
      width={390}
      height={740}
      style={{ display: 'block', background: '#000' }}
    />
  )
}
