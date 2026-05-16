import { useRef, useEffect } from 'react'

const TARGET_LUFS = -14

let _audioCtx = null
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new AudioContext()
  return _audioCtx
}

// createMediaElementSource can only be called once per element; cache across strict-mode double-invocations
const sourceCache = new WeakMap()

export default function VideoPlayer({ src, poster, playbackRate = 1, videoId, onLoudness, replayToken = 0, paused = false }) {
  const videoRef = useRef(null)
  const isFirstRun = useRef(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const ctx = getAudioCtx()

    let source = sourceCache.get(video)
    if (!source) {
      source = ctx.createMediaElementSource(video)
      sourceCache.set(video, source)
    }

    const gainNode = ctx.createGain()
    source.connect(gainNode)
    gainNode.connect(ctx.destination)

    const resume = () => ctx.state === 'suspended' && ctx.resume()
    video.addEventListener('play', resume)

    if (videoId) {
      onLoudness?.({ status: 'analyzing' })
      fetch(`/api/loudness/${videoId}`)
        .then(r => r.json())
        .then(({ lufs }) => {
          if (lufs == null) {
            onLoudness?.({ status: 'unavailable' })
            return
          }
          const rawGain = Math.pow(10, (TARGET_LUFS - lufs) / 20)
          const gain = Math.min(Math.max(rawGain, 0.1), 4)
          gainNode.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.5)
          onLoudness?.({
            status: gain !== rawGain ? 'clamped' : 'normalized',
            lufs,
            rawGain,
            gain,
          })
        })
        .catch(() => onLoudness?.({ status: 'unavailable' }))
    }

    return () => {
      video.removeEventListener('play', resume)
      source.disconnect()
      gainNode.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return }
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    video.play().catch(() => {})
  }, [replayToken])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (paused) video.pause()
    else video.play().catch(() => {})
  }, [paused])

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
