// Thin wrapper around the Keepa Product Request API
// (https://api.keepa.com/product) — pure functions so both the Vercel
// serverless handler (api/lookup-asin.ts) and the Vite dev middleware can
// share the same logic without duplicating it.

export interface KeepaLookupResult {
  asin: string
  brand?: string
  title: string
  bullets: string[]
}

export class KeepaLookupError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface KeepaProduct {
  asin?: string
  title?: string | null
  brand?: string | null
  manufacturer?: string | null
  features?: string[] | null
}

interface KeepaResponse {
  products?: KeepaProduct[]
  error?: { message?: string; type?: string }
  tokensLeft?: number
}

const ASIN_PATTERN = /^[A-Z0-9]{10}$/

export function isValidAsin(asin: string): boolean {
  return ASIN_PATTERN.test(asin.trim().toUpperCase())
}

export function mapKeepaProduct(product: KeepaProduct, asin: string): KeepaLookupResult {
  if (!product.title) {
    throw new KeepaLookupError(
      'Keepa has no cached listing data for this ASIN yet. Try again later or paste the listing manually.',
      404,
    )
  }
  return {
    asin,
    brand: product.brand ?? product.manufacturer ?? undefined,
    title: product.title,
    bullets: (product.features ?? []).map((b) => b.trim()).filter(Boolean).slice(0, 5),
  }
}

export async function fetchAsinListing(
  asin: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<KeepaLookupResult> {
  const normalizedAsin = asin.trim().toUpperCase()
  if (!isValidAsin(normalizedAsin)) {
    throw new KeepaLookupError('That doesn’t look like a valid 10-character ASIN.', 400)
  }
  if (!apiKey) {
    throw new KeepaLookupError('Server is missing a KEEPA_API_KEY configuration.', 500)
  }

  const url = `https://api.keepa.com/product?key=${encodeURIComponent(apiKey)}&domain=1&asin=${encodeURIComponent(normalizedAsin)}`
  const res = await fetchImpl(url)

  if (!res.ok) {
    throw new KeepaLookupError(`Keepa request failed with status ${res.status}.`, res.status)
  }

  const data = (await res.json()) as KeepaResponse

  if (data.error) {
    throw new KeepaLookupError(data.error.message ?? 'Keepa returned an error for this request.', 502)
  }

  const product = data.products?.[0]
  if (!product) {
    throw new KeepaLookupError('No product found for this ASIN on Amazon.com.', 404)
  }

  return mapKeepaProduct(product, normalizedAsin)
}
