import type { VercelRequest, VercelResponse } from '@vercel/node'
import { KeepaLookupError, fetchAsinListing } from '../src/server/keepa'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const asin = typeof req.query.asin === 'string' ? req.query.asin : ''
  if (!asin) {
    res.status(400).json({ error: 'Missing required "asin" query parameter.' })
    return
  }

  try {
    const result = await fetchAsinListing(asin, process.env.KEEPA_API_KEY ?? '')
    res.status(200).json(result)
  } catch (err) {
    if (err instanceof KeepaLookupError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Unexpected error looking up this ASIN.' })
  }
}
