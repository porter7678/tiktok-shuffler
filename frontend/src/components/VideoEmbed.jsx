export default function VideoEmbed({ embedUrl }) {
  return (
    <iframe
      src={`${embedUrl}?autoplay=0`}
      allowFullScreen
      width={390}
      height={740}
      style={{ border: 'none', display: 'block' }}
    />
  )
}
