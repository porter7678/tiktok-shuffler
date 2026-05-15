import { useEffect, useMemo, useRef, useState } from 'react'
import MonthScrubber from '../components/MonthScrubber'
import ThumbnailTile from '../components/ThumbnailTile'

function groupByMonth(videos) {
  const out = []
  let curKey = null, curBucket = null
  for (const v of videos) {
    const d = new Date(v.liked_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key !== curKey) {
      curBucket = { key, date: d, videos: [] }
      out.push(curBucket)
      curKey = key
    }
    curBucket.videos.push(v)
  }
  return out
}

export default function GridView({ videos, onSelect }) {
  const groups = useMemo(() => groupByMonth(videos), [videos])
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!scrollRef.current || groups.length === 0) return

    const headers = scrollRef.current.querySelectorAll('.month-header')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveKey(entry.target.closest('section').dataset.monthKey)
          }
        }
      },
      { root: scrollRef.current, rootMargin: '0px 0px -85% 0px' }
    )

    headers.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [groups])

  return (
    <div className="grid-view">
      <MonthScrubber groups={groups} activeKey={activeKey} />
      <div className="grid-scroll" ref={scrollRef}>
        {groups.map(({ key, date, videos: groupVideos }) => {
          const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          return (
            <section key={key} data-month-key={key}>
              <h2 className="month-header">{monthLabel} · {groupVideos.length} videos</h2>
              <div className="thumb-grid">
                {groupVideos.map((v) => (
                  <ThumbnailTile key={v.id} video={v} onClick={onSelect} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
