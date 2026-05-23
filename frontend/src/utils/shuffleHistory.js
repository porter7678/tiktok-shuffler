export async function loadHistoryFromServer() {
  try {
    const res = await fetch('/api/history')
    if (!res.ok) return { ids: [], index: -1 }
    return await res.json()
  } catch {
    return { ids: [], index: -1 }
  }
}

export async function saveHistoryToServer(state) {
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(state),
    })
  } catch {}
}

// Truncates forward history, appends id. No-ops if id matches current position.
export function appendToHistory(state, id) {
  const { ids, index } = state
  if (ids[index] === id) return state
  const newIds = [...ids.slice(0, index + 1), id]
  return { ids: newIds, index: newIds.length - 1 }
}
