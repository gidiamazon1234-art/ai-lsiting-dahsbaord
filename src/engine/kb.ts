// 2026 knowledge base: cited third-party sources on Alexa for Shopping (formerly
// Amazon Rufus), COSMO, and Generative Engine Optimization (GEO) for Amazon
// listings. Every KB-derived recommendation in the engine cites one or more
// of these source ids.

export type ConfidenceLevel = 'high' | 'medium' | 'cautious'

export interface KbSource {
  id: string
  title: string
  url: string
  publisher: string
  confidence: ConfidenceLevel
  note: string
}

export const KB_SOURCES: KbSource[] = [
  {
    id: 'perpetua_alexa_2026',
    title: 'Alexa for Shopping (Amazon Rufus): The Complete Guide for Brands and Sellers (2026)',
    url: 'https://perpetua.io/blog-alexa-for-shopping-amazon-rufus-the-complete-guide-for-brands-and-sellers/',
    publisher: 'Perpetua',
    confidence: 'medium',
    note: 'COSMO model, Outcome→Feature→Use case, backend attributes, contradiction trust signals, <4-star floor.',
  },
  {
    id: 'solcrys_alexa_2026',
    title: 'Alexa for Shopping Optimization Guide (formerly Amazon Rufus)',
    url: 'https://solcrys.com/amazon-rufus-optimization/',
    publisher: 'SolCrys AI',
    confidence: 'medium',
    note: 'Prompt types, entity attributes.',
  },
  {
    id: 'sellerlabs_rufus_4step_2026',
    title: 'How to Optimize Amazon Listings for Rufus AI: 4-Step Method',
    url: 'https://www.sellerlabs.com/blog/amazon-rufus-ai-listing-optimization-2026/',
    publisher: 'Seller Labs',
    confidence: 'medium',
    note: 'Four-step optimization method for AI assistant readability.',
  },
  {
    id: 'sellerlabs_structured_data_2026',
    title: 'Structured Data & Backend Attributes in the AI Era',
    url: 'https://www.sellerlabs.com/knowledge-base/structured-data-backend-attributes-in-the-ai-era/',
    publisher: 'Seller Labs',
    confidence: 'high',
    note: 'Named backend fields, 250-byte search terms.',
  },
  {
    id: 'teikametrics_rufus_2026',
    title: 'Amazon Rufus Optimization: How to Win in AI Driven Commerce',
    url: 'https://www.teikametrics.com/blog/amazon-rufus-optimization-with-ari/',
    publisher: 'Teikametrics',
    confidence: 'medium',
    note: 'AI-driven commerce optimization tactics.',
  },
  {
    id: 'zonguru_geo_amazon_2026',
    title: 'What Is Generative Engine Optimization (GEO) for Amazon?',
    url: 'https://www.zonguru.com/blog/generative-engine-optimization-amazon',
    publisher: 'ZonGuru',
    confidence: 'medium',
    note: 'COSMO intent (used_for/on/with, interested_in, capable_of), Benefit→Feature→Proof, "optional under A9 is essential under COSMO".',
  },
  {
    id: 'shopos_geo_2026',
    title: 'Generative Engine Optimization Best Practices for 2026',
    url: 'https://shopos.ai/blog/generative-engine-optimization-best-practices-2026',
    publisher: 'ShopOS',
    confidence: 'medium',
    note: 'GEO best practices for conversational commerce.',
  },
  {
    id: 'amzscaler_ai_listing_2026',
    title: 'AI Amazon Listing Optimization: The Complete Guide (2026)',
    url: 'https://amzscaler.com/ai-amazon-listing-optimization/',
    publisher: 'AMZ Scaler',
    confidence: 'medium',
    note: 'Human review mandatory for AI-assisted copy.',
  },
  {
    id: 'inriver_product_data_2026',
    title: 'Product data requirements for Amazon: The complete seller reference',
    url: 'https://www.inriver.com/resources/product-data-requirements-amazon-seller-reference/',
    publisher: 'Inriver',
    confidence: 'high',
    note: 'Title ≤200 chars, ≤5 bullets, category-specific attributes.',
  },
  {
    id: 'digitalapplied_ai_agent_policy_2026',
    title: 'Amazon AI Agent Policy: New Automated Seller Rules 2026',
    url: 'https://www.digitalapplied.com/blog/amazon-ai-agent-policy-march-2026-automated-seller-rules',
    publisher: 'Digital Applied',
    confidence: 'cautious',
    note: 'AI copy allowed via Listings API, SP-API only.',
  },
  {
    id: 'commerceiq_rufus_rename_2026',
    title: 'Alexa for Shopping Replaces Rufus: What Brands Must Know',
    url: 'https://www.commerceiq.ai/blog/amazon-rufus-gets-a-new-name',
    publisher: 'CommerceIQ',
    confidence: 'medium',
    note: 'Rebrand only — underlying COSMO model unchanged.',
  },
]

export const KB_SOURCE_MAP: Record<string, KbSource> = Object.fromEntries(
  KB_SOURCES.map((s) => [s.id, s]),
)

export const TERMINOLOGY = {
  assistantLabel: 'AI Assistant Readability (Alexa for Shopping)',
  legacyName: 'Rufus',
  knowledgeGraph: 'COSMO (Common Sense Knowledge Generation and Serving System)',
  bulletStructure: 'Outcome → Feature → Use case',
  disclaimer:
    'Deterministic proxy score based on listing structure, semantic completeness, conversational answerability, and internal consistency — not an official Amazon ranking metric. Guidance synthesized from 11 third-party 2026 sources; not affiliated with Amazon.',
}

export const GEO_BULLET_STRUCTURE = {
  preferred: 'Outcome (what the shopper gets) → Feature (what enables it) → Use case (who/when)',
  rules: [
    'One distinct question per bullet.',
    'No repeated content across bullets.',
    'Lead with benefit, not feature.',
    'Include a use-case or audience cue.',
    'Back claims with specifics, not superlatives.',
  ],
}

export const BACKEND_ATTRIBUTE_FIELDS = [
  'Product Type / Item Type',
  'Intended Use',
  'Subject Matter',
  'Target Audience',
  'Material',
  'Size / Dimensions',
  'Compatibility / Compatible Devices',
  'Care Instructions',
  'Included Components',
  'Special Features',
]

export const BACKEND_ATTRIBUTE_RULES = [
  'Every blank field is a severed COSMO connection — the assistant cannot answer what it cannot read.',
  '"Optional" under classic A9 search is essential under COSMO / Alexa for Shopping.',
  'Backend search terms: ≤250 bytes, space-separated, no repeats of visible copy.',
  'Allow 7–14 days for backend attribute changes to propagate into assistant answers.',
]

export const COSMO_INTENT_QUESTIONS = [
  'Who is this for?',
  'What does it do?',
  'When/where would I use it?',
  'What problem does it solve?',
  'What is included?',
  'What is it compatible with?',
  'How do I use/clean/maintain it?',
  'What is it made of?',
]

export interface RecommendationTemplate {
  id: string
  title: string
  whyItMatters: string
  changeToMake: string
  sourceIds: string[]
}

export const RECOMMENDATION_LIBRARY: Record<string, RecommendationTemplate> = {
  geo_outcome_feature_usecase_bullets: {
    id: 'geo_outcome_feature_usecase_bullets',
    title: 'Restructure bullets as Outcome → Feature → Use case',
    whyItMatters:
      'COSMO extracts entities more reliably when copy follows a consistent outcome-first pattern. Bullets that lead with a feature name or an all-caps label without an outcome are harder for the assistant to summarize into a shopper-facing answer.',
    changeToMake:
      'Rewrite each bullet as: (1) the outcome the shopper gets, (2) the feature that enables it, (3) a concrete use case or audience cue — in that order.',
    sourceIds: ['perpetua_alexa_2026', 'zonguru_geo_amazon_2026'],
  },
  geo_use_case_narrative_description: {
    id: 'geo_use_case_narrative_description',
    title: 'Turn the description into a use-case narrative',
    whyItMatters:
      'COSMO intent types (used_for, used_on, used_with, interested_in, capable_of) are populated from narrative descriptions of who uses a product and when — not from keyword lists.',
    changeToMake:
      'Add a short narrative description that answers "who is this for" and "when/where would I use it" in full sentences, covering audience, setting, and routine.',
    sourceIds: ['perpetua_alexa_2026', 'zonguru_geo_amazon_2026'],
  },
  geo_backend_attribute_completeness: {
    id: 'geo_backend_attribute_completeness',
    title: 'Complete every applicable backend attribute in Seller Central',
    whyItMatters:
      'Backend attributes (material, intended use, target audience, compatibility, care instructions, included components, special features) feed the COSMO knowledge graph directly. A blank field is a fact the assistant cannot retrieve, even if it is implied in the bullets.',
    changeToMake:
      'Fill in every applicable backend attribute field in Seller Central: ' +
      BACKEND_ATTRIBUTE_FIELDS.join(', ') +
      '. Keep backend search terms under 250 bytes and avoid repeating visible copy.',
    sourceIds: ['perpetua_alexa_2026', 'sellerlabs_structured_data_2026', 'zonguru_geo_amazon_2026'],
  },
  geo_conversational_qa_coverage: {
    id: 'geo_conversational_qa_coverage',
    title: 'Add natural buyer-question coverage to the copy',
    whyItMatters:
      'Alexa for Shopping answers conversational questions ("does it fit in a cupholder?", "is it dishwasher safe?") by matching listing text to buyer intent. Copy that never states the answer in words forces the assistant to guess or skip the product.',
    changeToMake:
      'Explicitly answer the most common buyer questions for this category (capacity, leakproof, safety, cleaning, carry, lifestyle fit, what motivates repeat use, what is included, who it is for, compatibility) somewhere in the title, bullets, or description.',
    sourceIds: ['shopos_geo_2026', 'zonguru_geo_amazon_2026', 'perpetua_alexa_2026'],
  },
  geo_internal_consistency: {
    id: 'geo_internal_consistency',
    title: 'Resolve contradictions across title, bullets, and image text',
    whyItMatters:
      'COSMO treats internally inconsistent listings (e.g. two different capacities stated for the same product) as a trust signal failure, which can suppress how confidently the assistant recommends the product.',
    changeToMake:
      'Pick a single, verified value for every measurable attribute (capacity, count, duration, dimensions) and use it consistently across the title, every bullet, and any on-image text.',
    sourceIds: ['perpetua_alexa_2026'],
  },
}
