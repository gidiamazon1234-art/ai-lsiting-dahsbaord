import type { Plugin } from 'vite'
import { KeepaLookupError, fetchAsinListing } from './src/server/keepa.js'

// Mirrors api/lookup-asin.ts so `npm run dev` can exercise the same ASIN
// lookup flow Vercel serves in production, without needing `vercel dev`.
export function keepaDevMiddleware(apiKey: string | undefined): Plugin {
  return {
    name: 'keepa-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/lookup-asin', async (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const asin = url.searchParams.get('asin') ?? ''
        res.setHeader('Content-Type', 'application/json')

        if (!asin) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Missing required "asin" query parameter.' }))
          return
        }

        try {
          const result = await fetchAsinListing(asin, apiKey ?? '')
          res.statusCode = 200
          res.end(JSON.stringify(result))
        } catch (err) {
          if (err instanceof KeepaLookupError) {
            res.statusCode = err.status
            res.end(JSON.stringify({ error: err.message }))
            return
          }
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Unexpected error looking up this ASIN.' }))
        }
      })
    },
  }
}
