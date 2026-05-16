const ONES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
}

const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

export function parseEnglishNumber(input) {
  if (!input || typeof input !== 'string') return null
  const s = input.toLowerCase().trim().replace(/-/g, ' ').replace(/\s+/g, ' ')

  if (s === 'hundred' || s === 'a hundred' || s === 'one hundred') return 100

  if (s in ONES) return ONES[s] || null  // reject zero
  if (s in TENS) return TENS[s]

  // "twenty one", "twentyone" etc.
  for (const [tenWord, tenVal] of Object.entries(TENS)) {
    if (s.startsWith(tenWord)) {
      const rest = s.slice(tenWord.length).trimStart()
      if (rest in ONES && ONES[rest] > 0) return tenVal + ONES[rest]
    }
  }

  return null
}
