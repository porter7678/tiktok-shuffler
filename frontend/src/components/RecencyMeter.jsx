const COLORS = ['#4a4a4a', '#8a3d52', '#c44068', '#e82a50', '#fe2c55']

export default function RecencyMeter({ recency }) {
  const lit = Math.max(1, Math.ceil(recency * 5))
  const color = COLORS[lit - 1]
  return (
    <div className="recency-meter" title={`${Math.round(recency * 100)}% recent`}>
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className="recency-bar"
          style={{ background: i < lit ? color : '#2a2a2a' }}
        />
      ))}
    </div>
  )
}
