// The one real call in the whole app.
//
// Google Programmable Search (Custom Search JSON API). Needs two env vars:
//   GOOGLE_API_KEY - https://console.cloud.google.com/apis/credentials
//   GOOGLE_CX      - https://programmablesearchengine.google.com (set it to search the entire web)
//
// If either is missing we return `configured: false` and the client falls back to
// pure inference, which is the funnier branch anyway. The key only ever lives here,
// server-side, so it never reaches the browser bundle.

const ENDPOINT = 'https://www.googleapis.com/customsearch/v1'
const MAX_RESULTS = 5

export async function searchPerson(query) {
  const key = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CX
  if (!key || !cx) return { configured: false, results: [] }

  const url = `${ENDPOINT}?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=${MAX_RESULTS}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return { configured: true, results: [], error: `search returned ${response.status}` }
    }
    const body = await response.json()
    const items = Array.isArray(body.items) ? body.items : []
    return {
      configured: true,
      results: items.slice(0, MAX_RESULTS).map((item) => ({
        title: String(item.title ?? '').trim(),
        link: String(item.link ?? '').trim(),
        snippet: String(item.snippet ?? '').replace(/\s+/g, ' ').trim(),
      })),
    }
  } catch {
    return { configured: true, results: [], error: 'search unreachable' }
  }
}

// Written against the raw node req/res rather than express helpers so the exact
// same handler can be mounted by express in prod and by vite's dev middleware.
export async function handleSearchRequest(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const query = (requestUrl.searchParams.get('q') ?? '').trim()

  res.setHeader('content-type', 'application/json')
  if (!query) {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'missing q' }))
    return
  }
  const payload = await searchPerson(query)
  res.statusCode = 200
  res.end(JSON.stringify(payload))
}
