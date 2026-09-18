import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleSearchRequest } from './server/search.js'

export default defineConfig(({ mode }) => {
  // Vite only exposes VITE_-prefixed vars automatically, and only to the client.
  // We want the opposite: the key stays server-side, so load .env by hand here
  // and hand it to the dev middleware via process.env.
  // Assign only when present: writing `undefined` into process.env stores the
  // literal string "undefined", which is truthy, and the search layer would
  // then believe it had credentials and fail every call with a 400.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GOOGLE_API_KEY) process.env.GOOGLE_API_KEY = env.GOOGLE_API_KEY
  if (env.GOOGLE_CX) process.env.GOOGLE_CX = env.GOOGLE_CX

  return {
    plugins: [
      react(),
      {
        // Mounts the same handler express uses, so dev and prod hit identical code.
        name: 'dev-search-api',
        configureServer(server) {
          server.middlewares.use('/api/search', handleSearchRequest)
        },
      },
    ],
  }
})
