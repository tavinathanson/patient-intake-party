import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { handleSearchRequest } from './search.js'

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const port = Number(process.env.PORT) || 8080

const app = express()
app.get('/api/search', handleSearchRequest)
app.use(express.static(distDir))
app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.listen(port, '0.0.0.0', () => console.log(`23andGuess listening on ${port}`))
