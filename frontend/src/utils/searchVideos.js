/**
 * searchVideos — relevance-ranked, multi-term AND search over video metadata.
 *
 * Matches only if every whitespace-separated term appears somewhere in the
 * combined artist + description text (case-insensitive).  Score is the best
 * field hit across all terms:
 *
 *   artist exact match   → 100
 *   artist prefix match  →  80
 *   artist contains      →  60
 *   description contains →  40
 *
 * Ties preserve the input order (newest-liked-first from the backend).
 * Fields may be null when info.json is missing — silently excluded.
 */
export function searchVideos(videos, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const scored = []
  for (const v of videos) {
    const uploader = (v.uploader  || '').toLowerCase()
    const channel  = (v.channel   || '').toLowerCase()
    const desc     = (v.description || '').toLowerCase()
    const haystack = `${uploader} ${channel} ${desc}`

    // Every term must appear somewhere (AND semantics)
    if (!terms.every(t => haystack.includes(t))) continue

    let score = 0
    for (const t of terms) {
      for (const field of [uploader, channel]) {
        if (!field) continue
        if (field === t)              score = Math.max(score, 100)
        else if (field.startsWith(t)) score = Math.max(score, 80)
        else if (field.includes(t))   score = Math.max(score, 60)
      }
      if (desc.includes(t))           score = Math.max(score, 40)
    }
    scored.push({ v, score })
  }

  // Array.prototype.sort is stable in modern JS — ties keep input order
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.v)
}
