import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import tutorHandler from './api/tutor.js'

// Serves the LLM proxy (api/tutor.js) from inside Vite's own dev/preview server so that
// `bun run dev`/`bun run preview` run the app and the API as a single process — no Express, no
// extra port. The handler is Express-style (req, res), so the middleware parses req.body as JSON
// and shims Node's bare http res with status()/json(). Deployments that host the handler
// themselves (a serverless platform) don't use this plugin.
function tutorApiPlugin() {
  const middleware = (req, res) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        res.writeHead(413).end()
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {}
      } catch {
        req.body = {}
      }
      res.status = (code) => {
        res.statusCode = code
        return res
      }
      res.json = (data) => {
        res.statusCode ||= 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(data))
      }
      tutorHandler(req, res)
    })
  }
  return {
    name: 'tutor-api',
    configureServer(server) {
      server.middlewares.use('/api/tutor', middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/tutor', middleware)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The proxy reads its `.env` fallback keys from process.env. Bun auto-loads `.env` at startup,
  // but backfill anyway so the endpoint also works when Vite is run by another runner (e.g. Node).
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  return {
    plugins: [react(), tailwindcss(), tutorApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})