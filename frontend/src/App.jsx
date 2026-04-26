import { useEffect, useState } from 'react'

export default function App() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    fetch('/api/videos')
      .then(r => r.json())
      .then(d => {
        console.log(`Loaded ${d.total} videos`)
        setCount(d.total)
      })
  }, [])

  return <div>TikTok Shuffler — {count ?? 'loading…'} videos</div>
}
