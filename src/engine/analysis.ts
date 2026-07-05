import { RECOMMENDATION_LIBRARY } from './kb'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListingInput {
  title: string
  bullets: string[]
  asin?: string
  targetKeyword?: string
  brand?: string
  usps?: string[]
  complianceRules?: string[]
}

export interface Competitor {
  asin?: string
  title: string
  bullets: string[]
  brand?: string
  price?: number
  rating?: number
  ratingsCount?: number
  source: 'manual' | 'keepa' | 'auto'
}

export interface SubMetric {
  name: string
  score: number
  weight: number
  evidence: string[]
}

export type DimensionKey = 'rufus' | 'intent' | 'naturalness'

export interface ScoreCard {
  key: DimensionKey
  label: string
  score: number
  grade: string
  summary: string
  submetrics: SubMetric[]
  topFixes: string[]
}

export type ClusterStatus = 'covered' | 'partial' | 'gap'

export interface ClusterCoverage {
  id: string
  label: string
  description: string
  weight: number
  competitorCoverage: number
  competitorTermHits: string[]
  userCoverage: number
  userTermHits: string[]
  gap: number
  status: ClusterStatus
}

export interface CompetitorFocusTerm {
  term: string
  totalFreq: number
  docFreq: number
  score: number
  inUser: boolean
}

export interface KeywordStat {
  keyword: string
  totalCount: number
  density: number
  inTitle: boolean
  bulletsPresentIn: number[]
}

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'
export type Confidence = 'high' | 'medium' | 'low'
export type ClaimSafety = 'Safe' | 'Verify claim' | 'Do not claim unless proven'

export interface Recommendation {
  id: string
  rank: number
  priority: Priority
  impactScore: number
  estimatedLift: string
  category: string
  title: string
  affectedDimensions: DimensionKey[]
  changeToMake: string
  whyItMatters: string
  evidence: string[]
  before?: string
  after?: string
  sourceSignals?: string[]
  confidence: Confidence
  claimSafety: ClaimSafety
  sourceIds?: string[]
}

export interface RewriteResult {
  title: string
  bullets: string[]
  changesMade: string[]
  markdown: string
}

export interface AnalysisResult {
  listing: ListingInput
  competitors: Competitor[]
  scores: { rufus: ScoreCard; intent: ScoreCard; naturalness: ScoreCard }
  overall: number
  overallGrade: string
  clusters: ClusterCoverage[]
  gaps: ClusterCoverage[]
  keywordStats: KeywordStat[]
  competitorFocus: CompetitorFocusTerm[]
  rewrite: RewriteResult
  recommendations: Recommendation[]
  generatedAt: string
}

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

export const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'by',
  'from', 'is', 'are', 'was', 'were', 'this', 'that', 'it', 'your', 'you',
  'or', 'but', 'if', 'so', 'than', 'then', 'there', 'here', 'which', 'who',
  'what', 'when', 'where', 'how', 'all', 'any', 'no', 'not', 'only', 'too',
  'very', 'can', 'will', 'more', 'most', 'some', 'up', 'down', 'out', 'per',
  'about', 'above', 'after', 'before', 'below', 'between', 'through',
  'until', 'yet', 'be', 'as', 'its', 'our', 'their', 'them', 'do', 'does',
])

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/[•·]/g, ' ')
    .replace(/[^a-z0-9\s%./-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(text: string): string[] {
  const norm = normalize(text)
  if (!norm) return []
  return norm
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function keywordPattern(keyword: string): RegExp {
  const norm = normalize(keyword)
  const escaped = escapeRegex(norm).replace(/\s+/g, '\\s+')
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'g')
}

export function countOccurrences(haystack: string, needle: string): number {
  const norm = normalize(needle)
  if (!norm) return 0
  const normHay = normalize(haystack)
  const matches = normHay.match(keywordPattern(needle))
  return matches ? matches.length : 0
}

export function ngrams(tokens: string[], n: number): string[] {
  const result: string[] = []
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(' '))
  }
  return result
}

export function termFrequency(list: string[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const item of list) map.set(item, (map.get(item) ?? 0) + 1)
  return map
}

export function wordCount(text: string): number {
  const norm = normalize(text)
  return norm ? norm.split(/\s+/).length : 0
}

export function allWords(listing: { title: string; bullets: string[] }): string {
  return [listing.title, ...listing.bullets].join(' ')
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function grade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// ---------------------------------------------------------------------------
// Thematic cluster taxonomy
// ---------------------------------------------------------------------------

export interface Cluster {
  id: string
  label: string
  description: string
  keywords: string[]
  weight: number
}

export const CLUSTERS: Cluster[] = [
  {
    id: 'capacity_size',
    label: 'Capacity & Size',
    description: 'Volume, count, and size claims that answer "how much/how many".',
    weight: 1.2,
    keywords: ['gallon', '128 oz', '128oz', '1 gal', '100 oz', '100oz', '120 oz', 'half gallon', '64 oz', '75 oz', '96 oz', 'liter', '3l', '4l', 'capacity', 'ounce', 'oz', 'pack', 'count', 'set of', '2 pack', 'big', 'large', 'huge'],
  },
  {
    id: 'material_safety',
    label: 'Material Safety',
    description: 'Food-safety and material composition claims.',
    weight: 1.1,
    keywords: ['bpa free', 'bpa', 'bps', 'dehp', 'tritan', 'eastman', 'toxin', 'toxic', 'odorless', 'odor free', 'no leaching', 'food grade', 'food-grade', 'silicone', 'plastic', 'stainless steel', 'glass', 'phthalate', 'lead free', 'non toxic', 'safe', 'chemical', 'fda', 'food-safe'],
  },
  {
    id: 'drinking_mechanism',
    label: 'Drinking Mechanism',
    description: 'How the shopper actually drinks from the bottle.',
    weight: 1.0,
    keywords: ['straw', 'chug', 'nozzle', 'spout', 'cap', 'lid', 'sip', '6-in-1', 'flip top', 'wide mouth', 'narrow mouth', 'straw lid', 'bite valve', 'press', 'twist', 'push', 'dispenser', 'pump', 'spray'],
  },
  {
    id: 'leakproof',
    label: 'Leakproof / Spill Control',
    description: 'Seal integrity and spill-prevention claims.',
    weight: 1.0,
    keywords: ['leakproof', 'leak proof', 'leak-proof', 'spill', 'spill proof', 'spillproof', 'seal', 'silicone seal', 'lock', 'security lock', 'no leak', 'drip', 'splash', 'watertight', 'airtight'],
  },
  {
    id: 'portability_carry',
    label: 'Portability & Carry',
    description: 'How the bottle travels with the shopper.',
    weight: 0.9,
    keywords: ['handle', 'strap', 'shoulder strap', 'carry', 'grip', 'hands-free', 'hands free', 'wearable', 'paracord', 'loop', 'sling', 'backpack', 'travel', 'on the go', 'portable', 'compact', 'foldable'],
  },
  {
    id: 'durability_protection',
    label: 'Durability & Protection',
    description: 'Impact resistance and long-term wear claims.',
    weight: 0.9,
    keywords: ['silicone base', 'drop', 'impact', 'shatter', 'shatterproof', 'durable', 'tough', 'rugged', 'condensation', 'sweat', 'scratch', 'break resistant', 'reinforced', 'protective', 'bounce'],
  },
  {
    id: 'cleaning_maintenance',
    label: 'Cleaning & Maintenance',
    description: 'Ease of cleaning and upkeep.',
    weight: 0.9,
    keywords: ['dishwasher safe', 'dishwasher', 'brush', 'brushes', 'easy clean', 'easy to clean', 'wash', 'rinse', 'disassemble', 'wide mouth', 'bpa free', 'odor', 'stain', 'mold', 'antimicrobial'],
  },
  {
    id: 'motivation_tracking',
    label: 'Motivation & Tracking',
    description: 'Hydration-habit and goal-tracking claims.',
    weight: 1.0,
    keywords: ['time marker', 'time markers', 'motivational', 'motivation', 'hourly', '8 am', '8am', '10 pm', '10pm', 'tracking', 'track', 'goal', 'goals', 'daily intake', 'water intake', 'reminder', 'habit', 'measure', 'oz marker', 'ml marker', 'progress'],
  },
  {
    id: 'use_case_audience',
    label: 'Use Case & Audience',
    description: 'Who uses it and in which setting.',
    weight: 1.0,
    keywords: ['gym', 'workout', 'fitness', 'exercise', 'office', 'work', 'desk', 'commute', 'commuting', 'hiking', 'hike', 'travel', 'outdoor', 'outdoors', 'sports', 'sport', 'running', 'cycling', 'yoga', 'kids', 'children', 'school', 'campus', 'college', 'athletes', 'athletic', 'daily', 'everyday'],
  },
  {
    id: 'health_wellness',
    label: 'Health & Wellness',
    description: 'Broader wellness benefit framing.',
    weight: 0.9,
    keywords: ['hydration', 'hydrate', 'hydrated', 'water intake', 'healthy', 'health', 'wellness', 'energy', 'performance', 'recover', 'recovery', 'wellbeing', 'well-being', 'stay hydrated', 'dehydration', 'immune', 'detox'],
  },
  {
    id: 'design_aesthetic',
    label: 'Design & Aesthetic',
    description: 'Visual style and finish.',
    weight: 0.6,
    keywords: ['color', 'colour', 'blue', 'black', 'gradient', 'sleek', 'modern', 'premium', 'matte', 'glossy', 'transparent', 'clear', 'frosted', 'aesthetic', 'stylish', 'elegant', 'minimalist'],
  },
  {
    id: 'value_guarantee',
    label: 'Value & Guarantee',
    description: 'Trust, warranty, and perceived value claims.',
    weight: 0.7,
    keywords: ['warranty', 'guarantee', 'satisfaction', 'money back', 'refund', 'gift', 'gift idea', 'best seller', 'top rated', 'value', 'affordable', 'premium quality', 'quality', 'trusted', 'risk free', 'guaranteed'],
  },
  {
    id: 'temperature',
    label: 'Temperature Retention',
    description: 'Insulation and hot/cold retention claims.',
    weight: 0.8,
    keywords: ['insulated', 'insulation', 'vacuum', 'double wall', 'double-wall', 'hot', 'cold', 'ice', 'retention', 'hours cold', 'hours hot', 'temperature', 'thermal', 'thermos', 'sweat free'],
  },
  {
    id: 'compatibility_fit',
    label: 'Compatibility & Fit',
    description: 'Fit with cupholders, accessories, or other gear.',
    weight: 1.0,
    keywords: ['fits', 'fit', 'compatible', 'cupholder', 'cup holder', 'fits in', 'standard', 'replacement', 'works with', 'fits most', 'universal', 'size', 'dimensions', 'tall', 'short', 'narrow', 'wide'],
  },
  {
    id: 'included_components',
    label: 'Included Components',
    description: 'What ships in the box.',
    weight: 0.9,
    keywords: ['includes', 'included', 'comes with', 'in the box', 'bundle', '2 brushes', 'extra', 'extras', 'accessories', 'pack of', 'set', 'lid', 'straw', 'bonus', 'free gift', 'complete set'],
  },
  {
    id: 'certifications_proof',
    label: 'Certifications & Proof',
    description: 'Third-party certification and testing claims.',
    weight: 0.8,
    keywords: ['certified', 'certification', 'fda', 'ce', 'usp', 'gs1', 'tested', 'lab tested', 'third party', 'third-party', 'compliant', 'cpsc', 'bpa free', 'food grade', 'food-grade', 'iso', 'verified'],
  },
  {
    id: 'sustainability',
    label: 'Sustainability',
    description: 'Eco-friendliness and material sourcing claims.',
    weight: 0.6,
    keywords: ['recyclable', 'recycled', 'eco', 'eco-friendly', 'sustainable', 'reusable', 'biodegradable', 'phthalate free', 'lead free', 'country of origin', 'made in', 'responsibly'],
  },
  {
    id: 'warranty_support',
    label: 'Warranty & Support',
    description: 'Post-purchase support commitments.',
    weight: 0.7,
    keywords: ['warranty', 'guarantee', 'satisfaction', 'money back', 'refund', 'support', 'customer service', 'replacement', 'risk free', 'lifetime', 'limited warranty', 'return'],
  },
]

const RUFUS_ENTITY_CLUSTER_IDS = [
  'capacity_size', 'material_safety', 'drinking_mechanism', 'leakproof',
  'portability_carry', 'cleaning_maintenance', 'motivation_tracking', 'durability_protection',
]

// ---------------------------------------------------------------------------
// Cluster & focus-term analysis
// ---------------------------------------------------------------------------

function competitorDoc(c: Competitor): string {
  return [c.title, ...c.bullets].join(' ')
}

export function analyzeClusters(user: ListingInput, competitors: Competitor[]): ClusterCoverage[] {
  const userText = allWords(user)
  const compDocs = competitors.map(competitorDoc)

  return CLUSTERS.map((cluster) => {
    let userHits = 0
    const userTermHits: string[] = []
    for (const kw of cluster.keywords) {
      const count = countOccurrences(userText, kw)
      if (count > 0) {
        userHits += count
        userTermHits.push(kw)
      }
    }

    let competitorsMentioning = 0
    const competitorTermSet = new Set<string>()
    for (const doc of compDocs) {
      let mentioned = false
      for (const kw of cluster.keywords) {
        if (countOccurrences(doc, kw) > 0) {
          mentioned = true
          competitorTermSet.add(kw)
        }
      }
      if (mentioned) competitorsMentioning += 1
    }

    const competitorCoverage = compDocs.length > 0 ? competitorsMentioning / compDocs.length : 0
    const denom = Math.max(2, Math.ceil(cluster.keywords.length * 0.18))
    const userCoverage = Math.min(1, userHits / denom)
    const gap = competitorCoverage - userCoverage
    const status: ClusterStatus = gap > 0.35 ? 'gap' : gap > 0.12 ? 'partial' : 'covered'

    return {
      id: cluster.id,
      label: cluster.label,
      description: cluster.description,
      weight: cluster.weight,
      competitorCoverage,
      competitorTermHits: Array.from(competitorTermSet),
      userCoverage,
      userTermHits,
      gap,
      status,
    }
  })
}

export function competitorFocusTerms(
  competitors: Competitor[],
  user: ListingInput,
  topN = 18,
): CompetitorFocusTerm[] {
  const n = competitors.length
  if (n === 0) return []

  const docFreq = new Map<string, number>()
  const totalFreq = new Map<string, number>()

  for (const c of competitors) {
    const tokens = tokenize(competitorDoc(c))
    const grams = [...ngrams(tokens, 2), ...ngrams(tokens, 3)]
    const freq = termFrequency(grams)
    for (const [term, count] of freq) {
      totalFreq.set(term, (totalFreq.get(term) ?? 0) + count)
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1)
    }
  }

  const userText = allWords(user)
  const terms: CompetitorFocusTerm[] = []
  for (const [term, tf] of totalFreq) {
    const df = docFreq.get(term) ?? 0
    const score = tf * (0.5 + df / n)
    if (score >= 2) {
      terms.push({
        term,
        totalFreq: tf,
        docFreq: df,
        score,
        inUser: countOccurrences(userText, term) > 0,
      })
    }
  }

  terms.sort((a, b) => b.score - a.score)
  return terms.slice(0, topN)
}

export function keywordStatsFor(user: ListingInput, keywords: string[]): KeywordStat[] {
  const text = allWords(user)
  const totalWords = Math.max(1, wordCount(text))
  return keywords.filter(Boolean).map((keyword) => {
    const totalCount = countOccurrences(text, keyword)
    const inTitle = countOccurrences(user.title, keyword) > 0
    const bulletsPresentIn: number[] = []
    user.bullets.forEach((b, i) => {
      if (countOccurrences(b, keyword) > 0) bulletsPresentIn.push(i + 1)
    })
    return {
      keyword,
      totalCount,
      density: (totalCount / totalWords) * 100,
      inTitle,
      bulletsPresentIn,
    }
  })
}

// ---------------------------------------------------------------------------
// Compliance patterns
// ---------------------------------------------------------------------------

export interface CompliancePattern {
  id: string
  label: string
  pattern: RegExp
  claimSafeReplacement: string
}

export const COMPLIANCE_PATTERNS: CompliancePattern[] = [
  {
    id: 'guarantee_leakproof',
    label: 'guarantee / absolute leakproof claim',
    pattern: /guarantee[sd]?|guaranteeing|100% leakproofness|100% leakproof/gi,
    claimSafeReplacement: 'robust silicone seals and a security lock help prevent spills in your gym bag, car, or backpack',
  },
  {
    id: 'absolute_purity',
    label: 'absolute purity claim',
    pattern: /100% odorless|toxin-free|100% toxin/gi,
    claimSafeReplacement: 'BPA, BPS, and DEHP-free Eastman Tritan for pure, odor-resistant water with no plastic taste',
  },
  {
    id: 'medical_disease',
    label: 'medical or disease claim',
    pattern: /\bcures?\b|\btreats?\b|prevents?\s+\w*\s*disease|\bmedical\b|\btherapeutic\b/gi,
    claimSafeReplacement: 'supports your daily hydration routine',
  },
  {
    id: 'ranking_superlative',
    label: 'unverified ranking or superlative claim',
    pattern: /#1|best seller|number one|world's best|\bbest\b/gi,
    claimSafeReplacement: 'a reliable everyday hydration companion',
  },
  {
    id: 'decorative_symbols',
    label: 'decorative symbols',
    pattern: /[+&*®™@]{2,}|!!+/g,
    claimSafeReplacement: "plain words (e.g. 'and', 'plus')",
  },
  {
    id: 'perfect_claim',
    label: '"perfect" claim',
    pattern: /\bperfect\b/gi,
    claimSafeReplacement: 'a well-suited everyday companion for your routine',
  },
  {
    id: 'never_fail_claim',
    label: '"never leaks/spills/breaks" claim',
    pattern: /\bnever (leaks|spills|breaks)\b/gi,
    claimSafeReplacement: 'a secure, leak-resistant seal that helps prevent spills in daily use',
  },
  {
    id: 'promotional_event',
    label: 'promotional or time-limited event claim',
    pattern: /prime day|limited time deal|on sale|discount/gi,
    claimSafeReplacement: 'a clear, evergreen description of the product’s everyday value',
  },
  {
    id: 'organic_claim',
    label: '"organic" claim',
    pattern: /\borganic\b/gi,
    claimSafeReplacement: "a factual material description (only use 'organic' if certified and category-allowed)",
  },
]

export function stripProhibited(text: string): string {
  let out = text
  out = out.replace(/guaranteeing/gi, 'ensuring')
  out = out.replace(/guarantees/gi, 'helps prevent')
  out = out.replace(/guaranteed/gi, 'confidence')
  out = out.replace(/guarantee\b/gi, 'confidence')
  out = out.replace(/100% leakproofness/gi, 'a leak-resistant seal')
  out = out.replace(/100% odorless/gi, 'odor-resistant')
  out = out.replace(/100% leakproof/gi, 'leak-resistant')
  out = out.replace(/toxin-free/gi, 'free of common toxins')
  out = out.replace(/\bcures?\b/gi, 'supports')
  out = out.replace(/\btreats?\b/gi, 'supports')
  out = out.replace(/\bheals?\b/gi, 'supports')
  out = out.replace(/\bperfect\b/gi, 'well-suited')
  out = out.replace(/\bnever (leaks|spills|breaks)\b/gi, 'resists $1')
  out = out.replace(/\borganic\b/gi, 'premium')
  out = out.replace(/[+&*®™@]{2,}/g, ' ')
  out = out.replace(/!!+/g, '')
  out = out.replace(/\s+/g, ' ').trim()
  return out
}

function detectComplianceMatches(text: string): Array<{ pattern: CompliancePattern; snippet: string }> {
  const found: Array<{ pattern: CompliancePattern; snippet: string }> = []
  for (const p of COMPLIANCE_PATTERNS) {
    const re = new RegExp(p.pattern.source, p.pattern.flags.includes('g') ? p.pattern.flags : p.pattern.flags + 'g')
    const match = text.match(re)
    if (match && match.length > 0) {
      found.push({ pattern: p, snippet: match[0] })
    }
  }
  return found
}

// ---------------------------------------------------------------------------
// Internal consistency / contradiction detection
// ---------------------------------------------------------------------------

const UNIT_CANON: Record<string, string> = {
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  gallon: 'gallon', gallons: 'gallon', gal: 'gallon',
  liter: 'liter', liters: 'liter', l: 'liter',
  ml: 'ml',
  hours: 'hours', hour: 'hours', hrs: 'hours', hr: 'hours',
  days: 'days', day: 'days',
  minutes: 'minutes', minute: 'minutes', mins: 'minutes', min: 'minutes',
  inches: 'inches', inch: 'inches', in: 'inches',
  cm: 'cm', mm: 'mm',
  cups: 'cups', cup: 'cups',
  pack: 'pack', packs: 'pack',
  count: 'count',
}

const UNIT_REGEX = new RegExp(
  `\\b(\\d+(?:\\.\\d+)?)\\s*(${Object.keys(UNIT_CANON).sort((a, b) => b.length - a.length).join('|')})\\b`,
  'g',
)

export interface ContradictionDetail {
  unit: string
  values: number[]
}

export function detectContradictions(user: ListingInput): { count: number; details: ContradictionDetail[] } {
  const text = normalize(allWords(user))
  const byUnit = new Map<string, Set<number>>()
  for (const match of text.matchAll(UNIT_REGEX)) {
    const value = Number(match[1])
    const unit = UNIT_CANON[match[2]]
    if (!byUnit.has(unit)) byUnit.set(unit, new Set())
    byUnit.get(unit)!.add(value)
  }
  const details: ContradictionDetail[] = []
  for (const [unit, values] of byUnit) {
    if (values.size > 1) details.push({ unit, values: Array.from(values).sort((a, b) => a - b) })
  }
  return { count: details.length, details }
}

// ---------------------------------------------------------------------------
// Scoring: AI Assistant Readability (Alexa for Shopping)
// ---------------------------------------------------------------------------

const ATTRIBUTE_WORDS = ['gallon', 'oz', 'straw', 'cap', 'lid', 'tritan', 'bpa', 'leak', 'handle', 'strap', 'marker', 'silicone', 'dishwasher', 'wide mouth', 'material']
const OUTCOME_PHRASES = ['so you', 'lets you', 'helps you', 'keep', 'stay', 'without', 'so you can', 'means', 'ensures', 'guarantees', 'for easy', 'to help', 'effortless', 'comfort', 'confident', 'focus on', 'crush', 'achieve']

const CONVERSATIONAL_MARKERS = ['you', 'your', 'so you', 'without', 'effortless', 'easy', 'confident', 'comfort', 'never', 'ready', 'ideal for', 'designed for']

interface QaTrigger {
  id: string
  pattern: RegExp
}

const QA_TRIGGERS: QaTrigger[] = [
  { id: 'capacity', pattern: /gallon|128|oz|liter|holds/i },
  { id: 'leakproof', pattern: /leak|spill|seal|lock/i },
  { id: 'safety', pattern: /bpa|tritan|toxin|safe|food grade/i },
  { id: 'cleaning', pattern: /dishwasher|clean|brush|wash/i },
  { id: 'carry', pattern: /handle|strap|carry|grip|hands/i },
  { id: 'lifestyle', pattern: /gym|work|office|travel|outdoor|hike/i },
  { id: 'drink-more', pattern: /motivat|marker|track|goal|habit|intake/i },
  { id: 'cupholder-fit', pattern: /cupholder|bag|backpack|compact/i },
  { id: 'whats-included', pattern: /includes|comes with|bundle|brushes|set of/i },
  { id: 'who-for', pattern: /athletes|kids|office|gym|designed for/i },
  { id: 'compatibility', pattern: /fits|compatible|cupholder|works with/i },
]

const OPENER_REGEX = /^[A-Z][A-Za-z0-9 &/'-]{6,70}:/

function hasCapsBadRun(bullet: string): boolean {
  const letters = bullet.replace(/[^A-Za-z]/g, '')
  if (letters.length === 0) return false
  const upper = bullet.replace(/[^A-Z]/g, '').length
  const ratio = upper / letters.length
  return ratio > 0.3 && /[A-Z]{6,}/.test(bullet)
}

export function scoreRufus(user: ListingInput, clusters: ClusterCoverage[]): ScoreCard {
  const submetrics: SubMetric[] = []
  const bulletCount = Math.max(1, user.bullets.length)

  // 1. Feature / benefit linkage
  let linked = 0
  const linkageEvidence: string[] = []
  user.bullets.forEach((b, i) => {
    const hasAttribute = ATTRIBUTE_WORDS.some((w) => countOccurrences(b, w) > 0)
    const hasOutcome = OUTCOME_PHRASES.some((w) => countOccurrences(b, w) > 0)
    if (hasAttribute && hasOutcome) {
      linked += 1
    } else {
      linkageEvidence.push(`Bullet ${i + 1} is missing ${!hasAttribute ? 'a concrete attribute' : 'an outcome phrase'}.`)
    }
  })
  const linkageScore = (linked / bulletCount) * 100
  submetrics.push({
    name: 'Feature / benefit linkage',
    score: linkageScore,
    weight: 0.22,
    evidence: linkageEvidence.length ? linkageEvidence : ['Every bullet pairs a concrete attribute with an outcome.'],
  })

  // 2. Entity / attribute completeness
  const entityClusters = clusters.filter((c) => RUFUS_ENTITY_CLUSTER_IDS.includes(c.id))
  const completeCount = entityClusters.filter((c) => c.userCoverage > 0.2).length
  const completenessScore = (completeCount / RUFUS_ENTITY_CLUSTER_IDS.length) * 100
  submetrics.push({
    name: 'Entity / attribute completeness',
    score: completenessScore,
    weight: 0.18,
    evidence: entityClusters
      .filter((c) => c.userCoverage <= 0.2)
      .map((c) => `${c.label} is not clearly represented in the copy.`),
  })

  // 3. Scan clarity & structure
  const openers = user.bullets.filter((b) => OPENER_REGEX.test(b.trim())).length
  const avgLen = user.bullets.reduce((sum, b) => sum + wordCount(b), 0) / bulletCount
  const lenScore = avgLen < 18 ? 50 : avgLen <= 65 ? 100 : 70
  const capsBad = user.bullets.filter(hasCapsBadRun).length
  const scanScore = clamp((openers / bulletCount) * 60 + lenScore * 0.25 - capsBad * 8, 0, 100)
  submetrics.push({
    name: 'Scan clarity & structure',
    score: scanScore,
    weight: 0.18,
    evidence: [
      `${openers} of ${bulletCount} bullets open with a clear label.`,
      `Average bullet length is ${avgLen.toFixed(1)} words.`,
      ...(capsBad > 0 ? [`${capsBad} bullet(s) contain heavy all-caps runs.`] : []),
    ],
  })

  // 4. Alexa for Shopping Q&A coverage
  const text = allWords(user)
  const matchedTriggers = QA_TRIGGERS.filter((t) => t.pattern.test(text))
  const qaScore = (matchedTriggers.length / QA_TRIGGERS.length) * 100
  submetrics.push({
    name: 'Alexa for Shopping Q&A coverage',
    score: qaScore,
    weight: 0.12,
    evidence: [
      `Answers ${matchedTriggers.length} of ${QA_TRIGGERS.length} common buyer questions.`,
      ...QA_TRIGGERS.filter((t) => !t.pattern.test(text)).map((t) => `No clear answer for: ${t.id}.`),
    ],
  })

  // 5. Conversational phrasing
  const markerCount = CONVERSATIONAL_MARKERS.reduce((sum, m) => sum + countOccurrences(text, m), 0)
  const conversationalScore = Math.min(100, (markerCount / 6) * 100)
  submetrics.push({
    name: 'Conversational phrasing',
    score: conversationalScore,
    weight: 0.10,
    evidence: [`${markerCount} conversational marker(s) found (e.g. "you", "your", "without").`],
  })

  // 6. Compliance cleanliness
  const complianceMatches = detectComplianceMatches(text)
  const complianceScore = clamp(100 - 25 * complianceMatches.length, 0, 100)
  submetrics.push({
    name: 'Compliance cleanliness',
    score: complianceScore,
    weight: 0.10,
    evidence: complianceMatches.length
      ? complianceMatches.map((m) => `Flagged: ${m.pattern.label} ("${m.snippet}").`)
      : ['No prohibited claim patterns detected.'],
  })

  // 7. Internal consistency
  const contradictions = detectContradictions(user)
  const consistencyScore = clamp(100 - 35 * contradictions.count, 0, 100)
  submetrics.push({
    name: 'Internal consistency',
    score: consistencyScore,
    weight: 0.10,
    evidence: contradictions.count
      ? contradictions.details.map((d) => `${d.unit}: conflicting values ${d.values.join(', ')}`)
      : ['No numeric contradictions detected across the listing.'],
  })

  const score = Math.round(submetrics.reduce((sum, s) => sum + s.score * s.weight, 0))

  return {
    key: 'rufus',
    label: 'AI Assistant Readability (Alexa for Shopping)',
    score,
    grade: grade(score),
    summary:
      "How cleanly Amazon's Alexa for Shopping (built on the COSMO knowledge graph) can extract attributes, outcomes, and use cases from your copy — and how consistently it can trust them.",
    submetrics,
    topFixes: [],
  }
}

// ---------------------------------------------------------------------------
// Scoring: Search-Intent Alignment
// ---------------------------------------------------------------------------

const CORE_ATTRIBUTE_CLUSTER_IDS = ['capacity_size', 'drinking_mechanism', 'material_safety', 'leakproof']

export function scoreIntent(
  user: ListingInput,
  clusters: ClusterCoverage[],
  focus: CompetitorFocusTerm[],
): ScoreCard {
  const submetrics: SubMetric[] = []
  const kw = user.targetKeyword?.trim()

  // 1. Target keyword coverage
  let kwScore = 60
  const kwEvidence: string[] = []
  if (kw) {
    let base = 0
    const inTitle = countOccurrences(user.title, kw) > 0
    const bulletsWithKw = user.bullets.filter((b) => countOccurrences(b, kw) > 0).length
    const totalCount = countOccurrences(allWords(user), kw)
    if (inTitle) base += 55
    else kwEvidence.push(`Target keyword "${kw}" is missing from the title.`)
    if (bulletsWithKw >= 1) base += 25
    if (bulletsWithKw >= 2) base += 10
    if (totalCount >= 2 && totalCount <= 6) base += 10
    if (totalCount > 6) base -= 5
    kwScore = clamp(base, 0, 100)
    kwEvidence.unshift(`"${kw}" appears ${totalCount}x total, in title: ${inTitle}, in ${bulletsWithKw} bullet(s).`)
  } else {
    kwEvidence.push('No target keyword supplied — using a neutral baseline score.')
  }
  submetrics.push({ name: 'Target keyword coverage', score: kwScore, weight: 0.35, evidence: kwEvidence })

  // 2. Competitor semantic cluster coverage
  const activeClusters = clusters.filter((c) => c.competitorCoverage > 0)
  const weightSum = activeClusters.reduce((sum, c) => sum + c.weight, 0)
  const clusterScore = weightSum > 0
    ? (activeClusters.reduce((sum, c) => sum + c.userCoverage * c.competitorCoverage * c.weight, 0) / weightSum) * 100
    : 0
  submetrics.push({
    name: 'Competitor semantic cluster coverage',
    score: clusterScore,
    weight: 0.25,
    evidence: activeClusters
      .filter((c) => c.status !== 'covered')
      .slice(0, 5)
      .map((c) => `${c.label}: competitors ${(c.competitorCoverage * 100).toFixed(0)}% vs you ${(c.userCoverage * 100).toFixed(0)}%.`),
  })

  // 3. Use-case coverage
  const useCaseCluster = clusters.find((c) => c.id === 'use_case_audience')
  const useCaseScore = (useCaseCluster?.userCoverage ?? 0) * 100
  submetrics.push({
    name: 'Use-case coverage',
    score: useCaseScore,
    weight: 0.15,
    evidence: [`Use-case/audience cluster coverage: ${useCaseScore.toFixed(0)}%.`],
  })

  // 4. Core attribute match
  const coreClusters = clusters.filter((c) => CORE_ATTRIBUTE_CLUSTER_IDS.includes(c.id))
  const coreScore = coreClusters.length
    ? (coreClusters.reduce((sum, c) => sum + c.userCoverage, 0) / coreClusters.length) * 100
    : 0
  submetrics.push({
    name: 'Core attribute match',
    score: coreScore,
    weight: 0.15,
    evidence: coreClusters.map((c) => `${c.label}: ${(c.userCoverage * 100).toFixed(0)}% covered.`),
  })

  // 5. Differentiation / USP coverage
  const uspCount = user.usps?.length ?? 0
  const focusCovered = focus.filter((f) => f.inUser).length
  const uspScore = Math.min(100, 40 + uspCount * 12 + (focus.length > 0 ? (focusCovered / focus.length) * 60 : 0))
  submetrics.push({
    name: 'Differentiation / USP coverage',
    score: uspScore,
    weight: 0.10,
    evidence: [`${uspCount} USP(s) supplied; ${focusCovered} of ${focus.length} competitor focus terms present in your copy.`],
  })

  const score = Math.round(submetrics.reduce((sum, s) => sum + s.score * s.weight, 0))

  return {
    key: 'intent',
    label: 'Search-Intent Alignment',
    score,
    grade: grade(score),
    summary: 'How well your copy matches what shoppers actually search for and what top competitors emphasize.',
    submetrics,
    topFixes: [],
  }
}

// ---------------------------------------------------------------------------
// Scoring: Keyword Naturalness
// ---------------------------------------------------------------------------

function densityScore(density: number): number {
  if (density < 0.5) return 45
  if (density <= 2.5) return 100
  if (density <= 3.5) return 75
  return Math.max(20, 100 - (density - 2.5) * 20)
}

function syntacticIntegrationScore(text: string, kw: string): number {
  const fillers = ['your', 'the', 'a', 'this', 'our', 'for', 'with', 'of']
  const fillerGroup = fillers.join('|')
  const kwPattern = escapeRegex(normalize(kw)).replace(/\s+/g, '\\s+')
  const proximity = new RegExp(
    `\\b(?:${fillerGroup})\\b[a-z0-9\\s%./-]{0,12}${kwPattern}|${kwPattern}[a-z0-9\\s%./-]{0,12}\\b(?:${fillerGroup})\\b`,
    'g',
  )
  const matches = normalize(text).match(proximity)
  const count = matches ? matches.length : 0
  return count > 0 ? Math.min(100, 60 + count * 20) : 30
}

export function scoreNaturalness(user: ListingInput): ScoreCard {
  const submetrics: SubMetric[] = []
  const kw = user.targetKeyword?.trim()
  const text = allWords(user)
  const totalWords = Math.max(1, wordCount(text))

  if (!kw) {
    submetrics.push({ name: 'Density in range', score: 60, weight: 0.30, evidence: ['No target keyword supplied.'] })
    submetrics.push({ name: 'Distribution across fields', score: 60, weight: 0.25, evidence: ['No target keyword supplied.'] })
    submetrics.push({ name: 'Syntactic integration', score: 60, weight: 0.20, evidence: ['No target keyword supplied.'] })
    submetrics.push({ name: 'Keyword variation', score: 60, weight: 0.15, evidence: ['No target keyword supplied.'] })
  } else {
    const totalCount = countOccurrences(text, kw)
    const density = (totalCount / totalWords) * 100
    submetrics.push({
      name: 'Density in range',
      score: densityScore(density),
      weight: 0.30,
      evidence: [`Keyword density is ${density.toFixed(2)}% (${totalCount} occurrences / ${totalWords} words).`],
    })

    const inTitle = countOccurrences(user.title, kw) > 0
    const bulletsWith = user.bullets.filter((b) => countOccurrences(b, kw) > 0).length
    const distScore = clamp(30 + (inTitle ? 25 : 0) + Math.min(35, bulletsWith * 12) - (bulletsWith > 1 ? 12 : 0), 0, 100)
    submetrics.push({
      name: 'Distribution across fields',
      score: distScore,
      weight: 0.25,
      evidence: [`In title: ${inTitle}. Present in ${bulletsWith} bullet(s).`],
    })

    submetrics.push({
      name: 'Syntactic integration',
      score: syntacticIntegrationScore(text, kw),
      weight: 0.20,
      evidence: ['Checked whether the keyword sits naturally beside filler words rather than as a bare fragment.'],
    })

    const base = kw.toLowerCase()
    const variants = new Set([base, `${base}s`])
    if (base.endsWith('y')) variants.add(`${base.slice(0, -1)}ies`)
    const found = Array.from(variants).filter((v) => countOccurrences(text, v) > 0).length
    submetrics.push({
      name: 'Keyword variation',
      score: Math.min(100, 40 + found * 25),
      weight: 0.15,
      evidence: [`${found} of ${variants.size} keyword variant(s) present.`],
    })
  }

  const overRepeats = kw ? countOccurrences(text, kw) : 0
  const overRepeatPenalty = overRepeats > 4 ? (overRepeats - 4) * 8 : 0
  const capsRuns = (text.match(/[A-Z]{4,}/g) ?? []).length
  const capsPenalty = capsRuns * 5
  const openers = user.bullets.map((b) => tokenize(b).slice(0, 2).join(' '))
  const openerFreq = termFrequency(openers.filter(Boolean))
  const duplicateOpener = Array.from(openerFreq.values()).some((c) => c > 1)
  const duplicatePenalty = duplicateOpener ? 15 : 0
  const readabilityScore = clamp(100 - overRepeatPenalty - capsPenalty - duplicatePenalty, 0, 100)
  submetrics.push({
    name: 'Readability / no stuffing',
    score: readabilityScore,
    weight: 0.10,
    evidence: [
      ...(overRepeatPenalty > 0 ? [`Keyword repeated ${overRepeats}x — risk of stuffing.`] : []),
      ...(capsRuns > 0 ? [`${capsRuns} all-caps run(s) found.`] : []),
      ...(duplicateOpener ? ['Two or more bullets share the same opening words.'] : []),
      ...(overRepeatPenalty === 0 && capsRuns === 0 && !duplicateOpener ? ['No stuffing or repetition issues detected.'] : []),
    ],
  })

  const score = Math.round(submetrics.reduce((sum, s) => sum + s.score * s.weight, 0))

  return {
    key: 'naturalness',
    label: 'Keyword Naturalness',
    score,
    grade: grade(score),
    summary: 'Whether your target keyword reads like natural language or like keyword stuffing.',
    submetrics,
    topFixes: [],
  }
}

// ---------------------------------------------------------------------------
// Rewrite engine
// ---------------------------------------------------------------------------

const BENEFIT_OPENERS: Record<string, string> = {
  capacity_size: 'Hit Your Daily Goal With One Fill',
  material_safety: 'Safe, Pure Hydration You Can Trust',
  drinking_mechanism: 'Drink Your Way With a Versatile Cap',
  leakproof: 'Toss It In Your Bag With Zero Spills',
  portability_carry: 'Carry It Hands-Free All Day',
  durability_protection: 'Built to Survive Your Busy Days',
  cleaning_maintenance: 'Effortless Cleaning Every Time',
  motivation_tracking: 'Stay On Track Hour by Hour',
  use_case_audience: 'Made for Your Whole Day',
  health_wellness: 'Hydrate Better, Feel Better',
  design_aesthetic: 'Looks as Good as It Performs',
  value_guarantee: 'A Daily Upgrade Worth Keeping',
  temperature: 'Keeps Your Drink Just Right',
}

const CLEAN_BULLET_BODY: Record<string, string> = {
  capacity_size: 'One full 128 oz fill covers your whole day, so you skip the refill trips and stay hydrated from morning to night.',
  material_safety: 'Made from BPA, BPS, and DEHP-free Tritan, so every sip stays odor-resistant and free of common toxins for daily peace of mind.',
  drinking_mechanism: 'The wide-mouth lid switches between a straw, a chug spout, and a direct pour, so you drink your way without swapping lids.',
  leakproof: 'A silicone seal and locking lid help prevent spills, so you can toss it in your gym bag, car, or backpack with confidence.',
  portability_carry: 'The detachable strap and anti-slip handle turn it into a wearable companion for the gym, office, commute, or trail.',
  durability_protection: 'A reinforced, drop-resistant build stands up to daily bumps, so it keeps performing through gym bags, car rides, and travel.',
  cleaning_maintenance: 'Dishwasher-safe parts and 2 included cleaning brushes make rinsing the wide mouth and straw effortless after every use.',
  motivation_tracking: 'Hourly time markers from 8 AM to 10 PM help you pace your intake, so you build a hydration habit without an app.',
  use_case_audience: 'Designed for the gym, the office desk, the commute, and the trail, so it fits your whole day, not just one setting.',
  health_wellness: 'Consistent hydration throughout the day supports your energy and focus, so you feel better from morning workouts to evening wind-down.',
  design_aesthetic: 'A sleek blue-and-black finish looks at home on your desk, in your bag, or in the cupholder.',
  value_guarantee: 'Backed by responsive customer support, this bottle is built to be a dependable part of your daily routine.',
  temperature: 'Cold water stays refreshing during your fill, so you enjoy consistent taste from the first sip to the last.',
}

function collapseDuplicateTokens(text: string): string {
  const words = text.split(/\s+/)
  const seen = new Set<string>()
  const skipDedup = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'for', 'with'])
  const out: string[] = []
  for (const w of words) {
    const key = w.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!key || skipDedup.has(key)) {
      out.push(w)
      continue
    }
    if (seen.has(key)) continue
    seen.add(key)
    out.push(w)
  }
  return out.join(' ')
}

function buildTitle(user: ListingInput): { title: string; changes: string[] } {
  const changes: string[] = []
  let title = stripProhibited(user.title)

  if (/[+&]/.test(title)) {
    title = title.replace(/\+/g, ' ').replace(/&/g, ' and ')
    changes.push('Decorative symbols (+, &) replaced with plain words.')
  }

  title = title.replace(/\b(\w+)\/(\w+)\b/g, '$1')
  title = collapseDuplicateTokens(title)
  title = title.replace(/\s+/g, ' ').trim()

  const brand = user.brand?.trim()
  if (brand && !title.toLowerCase().startsWith(brand.toLowerCase())) {
    title = `${brand} ${title}`
    changes.push('Brand moved to the front of the title.')
  }

  const kw = user.targetKeyword?.trim()
  if (kw && countOccurrences(title, kw) === 0) {
    const insertAt = brand ? brand.length : 0
    title = `${title.slice(0, insertAt)} ${kw}${title.slice(insertAt)}`.replace(/\s+/g, ' ').trim()
    changes.push('Target keyword inserted near the front of the title.')
  }

  if (title.length > 200) {
    title = title.slice(0, 200).replace(/\s+\S*$/, '')
    changes.push('Title truncated to the 200-character Amazon limit.')
  }

  return { title, changes }
}

function buildBullets(
  user: ListingInput,
  clusters: ClusterCoverage[],
  gaps: ClusterCoverage[],
): { bullets: string[]; changes: string[] } {
  const changes: string[] = []
  const used = new Set<string>()
  const bullets: string[] = []

  const covered = clusters
    .filter((c) => BENEFIT_OPENERS[c.id] && c.userCoverage > 0.2)
    .sort((a, b) => b.weight - a.weight)

  const gapCandidates = gaps.filter((c) => BENEFIT_OPENERS[c.id])

  function addFromCluster(id: string) {
    if (used.has(id) || bullets.length >= 5) return
    const opener = BENEFIT_OPENERS[id]
    const body = CLEAN_BULLET_BODY[id]
    if (!opener || !body) return
    used.add(id)
    bullets.push(`${opener}: ${body}`)
  }

  for (const c of covered) addFromCluster(c.id)
  if (bullets.length > 0) changes.push('Priority bullets rewritten as Outcome → Feature → Use case for clusters already covered.')

  const beforeGap = bullets.length
  for (const c of gapCandidates) addFromCluster(c.id)
  if (bullets.length > beforeGap) changes.push('Added bullet(s) covering high-value semantic gaps vs. top competitors.')

  const usps = user.usps ?? []
  const beforeUsp = bullets.length
  for (const usp of usps) {
    if (bullets.length >= 5) break
    const clean = stripProhibited(usp)
    bullets.push(`${clean}, giving you one more reason to choose it for daily use.`)
  }
  if (bullets.length > beforeUsp) changes.push('USP-backed bullet(s) added from supplied differentiators.')

  if (bullets.length < 5) {
    for (const b of user.bullets) {
      if (bullets.length >= 5) break
      bullets.push(stripProhibited(b))
    }
    changes.push('Remaining slots filled with sanitized versions of the original bullets.')
  }

  const kw = user.targetKeyword?.trim()
  if (kw && bullets.length > 0 && countOccurrences(bullets[0], kw) === 0) {
    bullets[0] = `${bullets[0]} That's what makes it a dependable ${kw}.`
    changes.push('Target keyword naturally woven into the first bullet.')
  }

  const capped = bullets.slice(0, 5).map((b) => (b.length > 500 ? b.slice(0, 500).replace(/\s+\S*$/, '') : b))

  return { bullets: capped, changes }
}

export function buildRewrite(
  user: ListingInput,
  clusters: ClusterCoverage[],
  gaps: ClusterCoverage[],
): RewriteResult {
  const { title, changes: titleChanges } = buildTitle(user)
  const { bullets, changes: bulletChanges } = buildBullets(user, clusters, gaps)
  const changesMade = ['Compliance-sensitive claims replaced with claim-safe phrasing.', ...titleChanges, ...bulletChanges]

  const markdown = [
    '# Title',
    title,
    '',
    '## Bullets',
    ...bullets.map((b) => `- ${b}`),
  ].join('\n')

  return { title, bullets, changesMade, markdown }
}

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------

const CATEGORY_ORDER = ['compliance', 'keyword_naturalness', 'title', 'bullet_structure', 'semantic_gap', 'usp_coverage', 'positioning', 'geo_kb']

function computeImpact(opts: { scoreDeficit?: number; severityFactor?: number; breadthFactor?: number; extra?: number; cap?: number }): number {
  const { scoreDeficit = 0, severityFactor = 0, breadthFactor = 0, extra = 0, cap = 100 } = opts
  return clamp(40 * (scoreDeficit / 100) + 25 * severityFactor + 10 * breadthFactor + 5 + extra, 0, cap)
}

function impactToPriority(impact: number): Priority {
  if (impact >= 75) return 'Critical'
  if (impact >= 55) return 'High'
  if (impact >= 35) return 'Medium'
  return 'Low'
}

export function generateRecommendations(
  user: ListingInput,
  scores: { rufus: ScoreCard; intent: ScoreCard; naturalness: ScoreCard },
  clusters: ClusterCoverage[],
  gaps: ClusterCoverage[],
  rewrite: RewriteResult,
): Recommendation[] {
  const recs: Recommendation[] = []
  const text = allWords(user)
  const findSubmetric = (card: ScoreCard, name: string) => card.submetrics.find((s) => s.name === name)!

  // 1. Compliance cleanup
  const complianceMatches = detectComplianceMatches(text)
  const complianceDeficit = clamp(25 * complianceMatches.length, 0, 100)
  for (const { pattern, snippet } of complianceMatches) {
    recs.push({
      id: `compliance_${pattern.id}`,
      rank: 0,
      priority: 'Critical',
      impactScore: computeImpact({ scoreDeficit: complianceDeficit, severityFactor: 1.6, breadthFactor: 0.5, cap: 98 }),
      estimatedLift: '+ avoids listing suppression risk',
      category: 'compliance',
      title: `Remove ${pattern.label}`,
      affectedDimensions: ['rufus', 'intent'],
      changeToMake: `Replace "${snippet}" with claim-safe language: ${pattern.claimSafeReplacement}.`,
      whyItMatters: 'Absolute, medical, or promotional claims risk listing suppression and erode the internal-consistency trust signals Alexa for Shopping relies on.',
      evidence: [`Found "${snippet}" in the current listing copy.`],
      before: snippet,
      after: pattern.claimSafeReplacement,
      confidence: 'high',
      claimSafety: 'Do not claim unless proven',
    })
  }

  // 2. Keyword naturalness
  const kw = user.targetKeyword?.trim()
  if (kw && scores.naturalness.score < 70) {
    const densitySub = findSubmetric(scores.naturalness, 'Density in range')
    const totalWords = Math.max(1, wordCount(text))
    const totalCount = countOccurrences(text, kw)
    const density = (totalCount / totalWords) * 100
    if (density > 2.5) {
      recs.push({
        id: 'naturalness_reduce_density',
        rank: 0,
        priority: 'Medium',
        impactScore: computeImpact({ scoreDeficit: 100 - densitySub.score, severityFactor: 0.6, breadthFactor: 0.3 }),
        estimatedLift: '+ more natural keyword read',
        category: 'keyword_naturalness',
        title: `Reduce keyword density for "${kw}"`,
        affectedDimensions: ['naturalness'],
        changeToMake: `"${kw}" appears ${totalCount} times (${density.toFixed(1)}% density). Remove 1-2 repeats and let synonyms carry the rest.`,
        whyItMatters: 'Over-repetition reads as keyword stuffing to both shoppers and Amazon’s content-quality filters.',
        evidence: [`Current density: ${density.toFixed(2)}%.`],
        confidence: 'medium',
        claimSafety: 'Safe',
      })
    } else if (density < 0.5) {
      recs.push({
        id: 'naturalness_increase_presence',
        rank: 0,
        priority: 'Medium',
        impactScore: computeImpact({ scoreDeficit: 100 - densitySub.score, severityFactor: 0.6, breadthFactor: 0.3 }),
        estimatedLift: '+ stronger target-keyword match',
        category: 'keyword_naturalness',
        title: `Increase keyword presence for "${kw}"`,
        affectedDimensions: ['naturalness', 'intent'],
        changeToMake: `"${kw}" appears only ${totalCount} time(s). Work it naturally into the title and 1-2 bullets.`,
        whyItMatters: 'Too little keyword presence weakens the match between your listing and shopper search terms.',
        evidence: [`Current density: ${density.toFixed(2)}%.`],
        confidence: 'medium',
        claimSafety: 'Safe',
      })
    }
  }

  // 3. Title optimization
  const decorativeInTitle = /[+&*®™@]{2,}|!!+/.test(user.title)
  const kwMissingFromTitle = !!kw && countOccurrences(user.title, kw) === 0
  if (kwMissingFromTitle || decorativeInTitle || user.title.length > 190) {
    const reasons: string[] = []
    if (kwMissingFromTitle) reasons.push(`add the target keyword "${kw}"`)
    if (decorativeInTitle) reasons.push('remove decorative symbols')
    if (user.title.length > 190) reasons.push('shorten toward the 200-character limit')
    recs.push({
      id: 'title_optimization',
      rank: 0,
      priority: 'High',
      impactScore: computeImpact({ severityFactor: 1, breadthFactor: 0.5 }),
      estimatedLift: '+ stronger title-level match signal',
      category: 'title',
      title: 'Optimize the product title',
      affectedDimensions: ['intent', 'rufus', 'naturalness'],
      changeToMake: `Rewrite the title to ${reasons.join(', ')}.`,
      whyItMatters: 'The title is the single highest-weighted field for both classic search and COSMO entity extraction.',
      evidence: [`Current title is ${user.title.length} characters.`],
      before: user.title,
      after: rewrite.title,
      confidence: 'high',
      claimSafety: 'Safe',
      sourceIds: ['inriver_product_data_2026'],
    })
  }

  // 4. Bullet structure
  const scanClaritySub = findSubmetric(scores.rufus, 'Scan clarity & structure')
  const linkageSub = findSubmetric(scores.rufus, 'Feature / benefit linkage')
  if (scanClaritySub.score < 70 || linkageSub.score < 100) {
    const tmpl = RECOMMENDATION_LIBRARY.geo_outcome_feature_usecase_bullets
    recs.push({
      id: 'bullet_structure',
      rank: 0,
      priority: 'High',
      impactScore: computeImpact({ scoreDeficit: 100 - Math.min(scanClaritySub.score, linkageSub.score), severityFactor: 0.8, breadthFactor: 0.5 }),
      estimatedLift: '+ clearer assistant extraction of outcomes',
      category: 'bullet_structure',
      title: tmpl.title,
      affectedDimensions: ['rufus', 'intent'],
      changeToMake: tmpl.changeToMake,
      whyItMatters: tmpl.whyItMatters,
      evidence: [
        `Scan clarity & structure: ${scanClaritySub.score.toFixed(0)}/100.`,
        `Feature / benefit linkage: ${linkageSub.score.toFixed(0)}/100.`,
      ],
      confidence: 'high',
      claimSafety: 'Safe',
      sourceIds: tmpl.sourceIds,
    })
  }

  // 5. Semantic gap coverage
  const topGaps = gaps.slice(0, 4)
  topGaps.forEach((g, i) => {
    recs.push({
      id: `semantic_gap_${g.id}`,
      rank: 0,
      priority: 'Medium',
      impactScore: computeImpact({ scoreDeficit: g.gap * 100, severityFactor: 0.5 + (i === 0 ? 0.3 : 0), breadthFactor: g.weight / 1.2 }),
      estimatedLift: '+ closes a competitor semantic gap',
      category: 'semantic_gap',
      title: `Close the "${g.label}" semantic gap`,
      affectedDimensions: ['intent', 'rufus'],
      changeToMake: `Add a bullet or description line that clearly covers ${g.label.toLowerCase()} using terms like: ${g.competitorTermHits.slice(0, 5).join(', ') || 'category-standard terminology'}.`,
      whyItMatters: `${(g.competitorCoverage * 100).toFixed(0)}% of competitors cover this theme vs. only ${(g.userCoverage * 100).toFixed(0)}% coverage in your current copy.`,
      evidence: [`Competitor coverage ${(g.competitorCoverage * 100).toFixed(0)}% vs. your coverage ${(g.userCoverage * 100).toFixed(0)}%.`],
      confidence: 'medium',
      claimSafety: g.id === 'temperature' ? 'Do not claim unless proven' : 'Safe',
    })
  })

  // 6. USP coverage
  for (const usp of user.usps ?? []) {
    if (countOccurrences(text, usp) === 0) {
      recs.push({
        id: `usp_${usp.slice(0, 24).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        rank: 0,
        priority: 'Low',
        impactScore: computeImpact({ severityFactor: 0.3, breadthFactor: 0.2, cap: 60 }),
        estimatedLift: '+ differentiation vs. competitors',
        category: 'usp_coverage',
        title: `Surface the USP: "${usp}"`,
        affectedDimensions: ['intent'],
        changeToMake: `Work "${usp}" into a bullet or the description so shoppers and the assistant can see this differentiator.`,
        whyItMatters: 'Supplied USPs that never appear in the visible copy cannot influence ranking, assistant answers, or shopper perception.',
        evidence: [`"${usp}" was supplied as a USP but not found in the current title or bullets.`],
        confidence: 'medium',
        claimSafety: 'Safe',
      })
    }
  }

  // 7. Positioning (insulation trend)
  const temperatureCluster = clusters.find((c) => c.id === 'temperature')
  if (temperatureCluster && temperatureCluster.status !== 'covered' && temperatureCluster.competitorCoverage > 0) {
    recs.push({
      id: 'positioning_temperature',
      rank: 0,
      priority: 'Medium',
      impactScore: computeImpact({ scoreDeficit: temperatureCluster.gap * 100, severityFactor: 0.4, breadthFactor: 0.4 }),
      estimatedLift: '+ claim-safe competitive positioning',
      category: 'positioning',
      title: 'Address the insulation trend without overclaiming',
      affectedDimensions: ['intent'],
      changeToMake: 'Do not claim insulation or temperature retention this product does not have. Instead, explicitly position it as a lightweight, dishwasher-safe Tritan alternative to bulkier insulated bottles.',
      whyItMatters: `${(temperatureCluster.competitorCoverage * 100).toFixed(0)}% of competitors emphasize insulation/temperature retention; this product is Tritan, not insulated, so matching that language would be a false claim.`,
      evidence: ['Competitors DYSANKY and Swigina both lead with vacuum insulation and hot/cold retention hours.'],
      confidence: 'high',
      claimSafety: 'Do not claim unless proven',
    })
  }

  // 8a. Internal consistency
  const contradictions = detectContradictions(user)
  if (contradictions.count > 0) {
    const tmpl = RECOMMENDATION_LIBRARY.geo_internal_consistency
    recs.push({
      id: 'geo_internal_consistency',
      rank: 0,
      priority: 'Critical',
      impactScore: computeImpact({ scoreDeficit: 35 * contradictions.count, severityFactor: 1.2, breadthFactor: 0.4, cap: 96 }),
      estimatedLift: '+ restores COSMO trust signal',
      category: 'geo_kb',
      title: tmpl.title,
      affectedDimensions: ['rufus'],
      changeToMake: tmpl.changeToMake,
      whyItMatters: tmpl.whyItMatters,
      evidence: contradictions.details.map((d) => `${d.unit}: conflicting values ${d.values.join(', ')}`),
      confidence: 'high',
      claimSafety: 'Safe',
      sourceIds: tmpl.sourceIds,
    })
  }

  // 8b. Conversational Q&A coverage
  const qaSub = findSubmetric(scores.rufus, 'Alexa for Shopping Q&A coverage')
  if (qaSub.score < 80) {
    const tmpl = RECOMMENDATION_LIBRARY.geo_conversational_qa_coverage
    recs.push({
      id: 'geo_conversational_qa',
      rank: 0,
      priority: 'High',
      impactScore: computeImpact({ scoreDeficit: 100 - qaSub.score, severityFactor: 0.7, breadthFactor: 0.5 }),
      estimatedLift: '+ more Alexa for Shopping Q&A matches',
      category: 'geo_kb',
      title: tmpl.title,
      affectedDimensions: ['rufus', 'intent'],
      changeToMake: tmpl.changeToMake,
      whyItMatters: tmpl.whyItMatters,
      evidence: [`Currently answers ${qaSub.score.toFixed(0)}% of common buyer questions in-copy.`],
      confidence: 'medium',
      claimSafety: 'Safe',
      sourceIds: tmpl.sourceIds,
    })
  }

  // 8c. Backend attribute completeness
  const completenessSub = findSubmetric(scores.rufus, 'Entity / attribute completeness')
  if (completenessSub.score < 85 || gaps.length > 0) {
    const tmpl = RECOMMENDATION_LIBRARY.geo_backend_attribute_completeness
    recs.push({
      id: 'geo_backend_attributes',
      rank: 0,
      priority: 'Critical',
      impactScore: computeImpact({ scoreDeficit: 100 - completenessSub.score, severityFactor: 1.8, breadthFactor: 0.8, extra: gaps.length > 0 ? 8 : 0, cap: 97 }),
      estimatedLift: '+ fills the COSMO knowledge graph directly',
      category: 'geo_kb',
      title: tmpl.title,
      affectedDimensions: ['rufus', 'intent'],
      changeToMake: tmpl.changeToMake,
      whyItMatters: tmpl.whyItMatters,
      evidence: [`Entity / attribute completeness is ${completenessSub.score.toFixed(0)}/100; ${gaps.length} semantic gap(s) detected vs. competitors.`],
      confidence: 'high',
      claimSafety: 'Safe',
      sourceIds: tmpl.sourceIds,
    })
  }

  // 8d. Use-case narrative description
  const audienceCluster = clusters.find((c) => c.id === 'use_case_audience')
  const compatCluster = clusters.find((c) => c.id === 'compatibility_fit')
  const careCluster = clusters.find((c) => c.id === 'cleaning_maintenance')
  const componentsCluster = clusters.find((c) => c.id === 'included_components')
  const weakNarrative = [audienceCluster, compatCluster, careCluster, componentsCluster].some((c) => c && c.userCoverage < 0.5)
  if (weakNarrative || qaSub.score < 80) {
    const tmpl = RECOMMENDATION_LIBRARY.geo_use_case_narrative_description
    recs.push({
      id: 'geo_use_case_narrative',
      rank: 0,
      priority: 'Medium',
      impactScore: computeImpact({ severityFactor: 0.6, breadthFactor: 0.4 }),
      estimatedLift: '+ answers who/when/what-with in plain language',
      category: 'geo_kb',
      title: tmpl.title,
      affectedDimensions: ['rufus', 'intent'],
      changeToMake: tmpl.changeToMake,
      whyItMatters: tmpl.whyItMatters,
      evidence: ['Audience, compatibility, care, or included-components coverage is thin in the current description.'],
      confidence: 'medium',
      claimSafety: 'Safe',
      sourceIds: tmpl.sourceIds,
    })
  }

  recs.sort((a, b) => {
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore
    return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  })

  const top10 = recs.slice(0, 10)
  top10.forEach((r, i) => {
    r.rank = i + 1
    r.priority = impactToPriority(r.impactScore)
  })

  return top10
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export function analyzeListing(user: ListingInput, competitors: Competitor[]): AnalysisResult {
  const clusters = analyzeClusters(user, competitors)
  const focus = competitorFocusTerms(competitors, user)
  const gaps = clusters
    .filter((c) => c.status !== 'covered' && c.competitorCoverage > 0)
    .sort((a, b) => b.gap - a.gap)

  const rufus = scoreRufus(user, clusters)
  const intent = scoreIntent(user, clusters, focus)
  const naturalness = scoreNaturalness(user)
  const overall = Math.round((rufus.score + intent.score + naturalness.score) / 3)

  const rewrite = buildRewrite(user, clusters, gaps)

  const uncoveredFocusTerms = focus.filter((f) => !f.inUser).slice(0, 6).map((f) => f.term)
  const keywordStatsList = keywordStatsFor(user, [
    ...(user.targetKeyword ? [user.targetKeyword] : []),
    ...uncoveredFocusTerms,
  ])

  const recommendations = generateRecommendations(user, { rufus, intent, naturalness }, clusters, gaps, rewrite)

  const dimTopFixes = (key: DimensionKey) =>
    recommendations
      .filter((r) => r.affectedDimensions.includes(key))
      .slice(0, 3)
      .map((r) => r.title)
  rufus.topFixes = dimTopFixes('rufus')
  intent.topFixes = dimTopFixes('intent')
  naturalness.topFixes = dimTopFixes('naturalness')

  return {
    listing: user,
    competitors,
    scores: { rufus, intent, naturalness },
    overall,
    overallGrade: grade(overall),
    clusters,
    gaps,
    keywordStats: keywordStatsList,
    competitorFocus: focus,
    rewrite,
    recommendations,
    generatedAt: new Date().toISOString(),
  }
}
