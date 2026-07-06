import { describe, expect, it, vi } from 'vitest'
import { KeepaLookupError, fetchAsinListing, isValidAsin, mapKeepaProduct } from './keepa'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response
}

describe('isValidAsin', () => {
  it('accepts a well-formed 10-character ASIN', () => {
    expect(isValidAsin('B085LL6253')).toBe(true)
    expect(isValidAsin('b085ll6253')).toBe(true)
  })

  it('rejects malformed input', () => {
    expect(isValidAsin('short')).toBe(false)
    expect(isValidAsin('B085LL62531')).toBe(false)
    expect(isValidAsin('B085-L6253')).toBe(false)
    expect(isValidAsin('')).toBe(false)
  })
})

describe('mapKeepaProduct', () => {
  it('maps title, brand, and features into a listing lookup result', () => {
    const result = mapKeepaProduct(
      {
        title: 'EnergyBud 1 Gallon Water Bottle',
        brand: 'EnergyBud',
        features: ['Feature one', 'Feature two', ''],
      },
      'B085LL6253',
    )
    expect(result).toEqual({
      asin: 'B085LL6253',
      brand: 'EnergyBud',
      title: 'EnergyBud 1 Gallon Water Bottle',
      bullets: ['Feature one', 'Feature two'],
    })
  })

  it('falls back to manufacturer when brand is absent', () => {
    const result = mapKeepaProduct({ title: 'Widget', manufacturer: 'Acme Co', features: [] }, 'B000000001')
    expect(result.brand).toBe('Acme Co')
  })

  it('caps bullets at 5 to match the form', () => {
    const result = mapKeepaProduct(
      { title: 'Widget', features: ['1', '2', '3', '4', '5', '6', '7'] },
      'B000000001',
    )
    expect(result.bullets).toHaveLength(5)
  })

  it('throws when the product has no title', () => {
    expect(() => mapKeepaProduct({ title: null }, 'B000000001')).toThrow(KeepaLookupError)
  })
})

describe('fetchAsinListing', () => {
  it('rejects a malformed ASIN before making a network call', async () => {
    const fetchImpl = vi.fn()
    await expect(fetchAsinListing('not-an-asin', 'key', fetchImpl)).rejects.toThrow(KeepaLookupError)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects when no API key is configured', async () => {
    const fetchImpl = vi.fn()
    await expect(fetchAsinListing('B085LL6253', '', fetchImpl)).rejects.toThrow(/KEEPA_API_KEY/)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('calls the Keepa product endpoint with the expected query params', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ products: [{ title: 'Widget', brand: 'Acme', features: ['A bullet'] }] }),
    )
    await fetchAsinListing('B085LL6253', 'test-key', fetchImpl)
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.keepa.com/product?key=test-key&domain=1&asin=B085LL6253',
    )
  })

  it('throws when the HTTP response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 403))
    await expect(fetchAsinListing('B085LL6253', 'key', fetchImpl)).rejects.toThrow(/403/)
  })

  it('throws when Keepa returns an error payload', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'Invalid key' } }))
    await expect(fetchAsinListing('B085LL6253', 'bad-key', fetchImpl)).rejects.toThrow('Invalid key')
  })

  it('throws when no product is found', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ products: [] }))
    await expect(fetchAsinListing('B085LL6253', 'key', fetchImpl)).rejects.toThrow(/No product found/)
  })

  it('returns the mapped listing on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ products: [{ title: 'Widget', brand: 'Acme', features: ['A bullet'] }] }),
    )
    const result = await fetchAsinListing('b085ll6253', 'key', fetchImpl)
    expect(result).toEqual({ asin: 'B085LL6253', brand: 'Acme', title: 'Widget', bullets: ['A bullet'] })
  })
})
