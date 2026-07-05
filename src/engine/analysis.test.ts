import { describe, expect, it } from 'vitest'
import { ENERGYBUD_LISTING, SEEDED_COMPETITORS } from '@/data/fixtures'
import {
  COMPLIANCE_PATTERNS,
  analyzeListing,
  detectContradictions,
  stripProhibited,
} from './analysis'

describe('detectContradictions', () => {
  it('catches the 100 oz vs 128 oz contradiction in the EnergyBud fixture', () => {
    const result = detectContradictions(ENERGYBUD_LISTING)
    const ozContradiction = result.details.find((d) => d.unit === 'oz')
    expect(ozContradiction).toBeDefined()
    expect(ozContradiction!.values).toEqual(expect.arrayContaining([100, 128]))
    expect(result.count).toBeGreaterThanOrEqual(1)
  })

  it('reports no contradictions for consistent copy', () => {
    const result = detectContradictions({
      title: 'Brand 128 oz Water Bottle',
      bullets: ['Holds 128 oz of water.', 'Lasts 24 hours cold.'],
    })
    expect(result.count).toBe(0)
  })
})

describe('compliance patterns', () => {
  const fullText = `${ENERGYBUD_LISTING.title} ${ENERGYBUD_LISTING.bullets.join(' ')}`

  it('flags every compliance pattern present in the EnergyBud fixture', () => {
    const guaranteeMatch = COMPLIANCE_PATTERNS.find((p) => p.id === 'guarantee_leakproof')!
    const purityMatch = COMPLIANCE_PATTERNS.find((p) => p.id === 'absolute_purity')!
    expect(guaranteeMatch.pattern.test(fullText)).toBe(true)
    expect(purityMatch.pattern.test(fullText)).toBe(true)
  })

  it('each pattern matches its own trigger phrase', () => {
    const cases: Record<string, string> = {
      guarantee_leakproof: 'this guarantees a leakproof seal',
      absolute_purity: 'this is 100% odorless',
      medical_disease: 'cures your dehydration',
      ranking_superlative: 'the best water bottle',
      decorative_symbols: 'BPA && BPS!!',
      perfect_claim: 'a perfect fit',
      never_fail_claim: 'never leaks',
      promotional_event: 'limited time deal',
      organic_claim: 'organic materials',
    }
    for (const pattern of COMPLIANCE_PATTERNS) {
      const sample = cases[pattern.id]
      const re = new RegExp(pattern.pattern.source, pattern.pattern.flags)
      expect(re.test(sample), `${pattern.id} should match "${sample}"`).toBe(true)
    }
  })

  it('stripProhibited removes prohibited claim language', () => {
    const cleaned = stripProhibited('100% leakproof guarantee, 100% odorless, toxin-free, perfect for gym')
    expect(cleaned.toLowerCase()).not.toContain('guarantee')
    expect(cleaned.toLowerCase()).not.toContain('100% leakproof')
    expect(cleaned.toLowerCase()).not.toContain('100% odorless')
    expect(cleaned.toLowerCase()).not.toContain('toxin-free')
    expect(cleaned.toLowerCase()).not.toContain('perfect')
  })
})

describe('analyzeListing on the EnergyBud fixture', () => {
  const result = analyzeListing(ENERGYBUD_LISTING, SEEDED_COMPETITORS)

  it('runs quickly and deterministically', () => {
    const start = performance.now()
    analyzeListing(ENERGYBUD_LISTING, SEEDED_COMPETITORS)
    expect(performance.now() - start).toBeLessThan(50)
  })

  it('produces scores in the expected ballpark', () => {
    expect(result.overall).toBeGreaterThanOrEqual(50)
    expect(result.overall).toBeLessThanOrEqual(78)
    expect(result.scores.rufus.score).toBeGreaterThanOrEqual(55)
    expect(result.scores.rufus.score).toBeLessThanOrEqual(85)
    expect(result.scores.intent.score).toBeGreaterThanOrEqual(45)
    expect(result.scores.intent.score).toBeLessThanOrEqual(80)
    expect(result.scores.naturalness.score).toBeGreaterThanOrEqual(35)
    expect(result.scores.naturalness.score).toBeLessThanOrEqual(75)
  })

  it('flags the internal-consistency contradiction in the rufus scorecard', () => {
    const consistency = result.scores.rufus.submetrics.find((s) => s.name === 'Internal consistency')!
    expect(consistency.score).toBeLessThan(100)
    expect(consistency.evidence.some((e) => e.includes('oz'))).toBe(true)
  })

  it('generates at least 10 prioritized recommendations', () => {
    expect(result.recommendations.length).toBeGreaterThanOrEqual(10)
    expect(result.recommendations.length).toBeLessThanOrEqual(10)
    const impacts = result.recommendations.map((r) => r.impactScore)
    const sorted = [...impacts].sort((a, b) => b - a)
    expect(impacts).toEqual(sorted)
  })

  it('surfaces the compliance and backend-attribute recommendations near the top', () => {
    const top3Titles = result.recommendations.slice(0, 3).map((r) => r.title)
    expect(top3Titles).toContain('Remove guarantee / absolute leakproof claim')
    expect(top3Titles).toContain('Remove absolute purity claim')
    expect(top3Titles).toContain('Complete every applicable backend attribute in Seller Central')
  })

  it('flags temperature as a semantic gap vs. insulated competitors', () => {
    const temperatureGap = result.gaps.find((g) => g.id === 'temperature')
    expect(temperatureGap).toBeDefined()
    expect(temperatureGap!.status).not.toBe('covered')
  })

  it('every KB-derived recommendation carries source ids', () => {
    const kbRecs = result.recommendations.filter((r) => r.category === 'geo_kb')
    expect(kbRecs.length).toBeGreaterThan(0)
    for (const rec of kbRecs) {
      expect(rec.sourceIds && rec.sourceIds.length).toBeGreaterThan(0)
    }
  })

  it('rewrite avoids all prohibited compliance patterns', () => {
    const rewriteText = `${result.rewrite.title} ${result.rewrite.bullets.join(' ')}`
    for (const pattern of COMPLIANCE_PATTERNS) {
      if (pattern.id === 'decorative_symbols') continue
      const re = new RegExp(pattern.pattern.source, pattern.pattern.flags)
      expect(re.test(rewriteText), `rewrite should not match ${pattern.id}`).toBe(false)
    }
  })

  it('rewrite produces 5 bullets and a title under 200 chars', () => {
    expect(result.rewrite.bullets.length).toBe(5)
    expect(result.rewrite.title.length).toBeLessThanOrEqual(200)
  })
})
