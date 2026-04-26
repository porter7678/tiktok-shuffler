export default function VideoEmbed({ embedUrl }) {
  return (
    <iframe
      src={embedUrl}
      allow="autoplay"
      allowFullScreen
      width={390}
      height={740}
      style={{ border: 'none', display: 'block' }}
    />
  )
}
