import type { SearchResponse, SearchResult } from './types.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

// The response crosses a network boundary, so it arrives as `unknown`. We walk
// it by hand rather than asserting a shape onto it: if the server changes or a
// proxy mangles the body, we degrade to "no results" instead of crashing on a
// property that was never there.
export function parseSearchResponse(input: unknown): SearchResponse {
  if (!isRecord(input)) return { configured: false, results: [] }

  const results: SearchResult[] = []
  const rawResults = Array.isArray(input.results) ? input.results : []
  for (const item of rawResults) {
    if (!isRecord(item)) continue
    results.push({
      title: typeof item.title === 'string' ? item.title : '',
      link: typeof item.link === 'string' ? item.link : '',
      snippet: typeof item.snippet === 'string' ? item.snippet : '',
    })
  }

  const configured = input.configured === true
  const error = typeof input.error === 'string' ? input.error : undefined
  return error === undefined ? { configured, results } : { configured, results, error }
}

export async function runSearch(name: string): Promise<SearchResponse> {
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(`"${name}"`)}`)
    if (!response.ok) return { configured: false, results: [] }
    return parseSearchResponse(await response.json())
  } catch {
    return { configured: false, results: [] }
  }
}
