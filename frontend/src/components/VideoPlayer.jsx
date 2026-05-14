export default function VideoPlayer({ src, poster }) {
  return (
    <video
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
