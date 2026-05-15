export default function MonthScrubber({ groups, activeKey }) {
  const handleClick = (key) => {
    document.querySelector(`[data-month-key="${key}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="month-scrubber">
      <ul>
        {groups.map(({ key, date }) => {
          const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).replace(',', '')
          return (
            <li key={key}>
              <button
                className={activeKey === key ? 'active' : undefined}
                onClick={() => handleClick(key)}
              >
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
