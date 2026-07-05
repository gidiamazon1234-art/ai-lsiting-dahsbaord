import type { Competitor, ListingInput } from '@/engine/analysis'

export const ENERGYBUD_LISTING: ListingInput = {
  brand: 'EnergyBud',
  asin: 'B085LL6253',
  targetKeyword: '1 gallon water bottle',
  title:
    'EnergyBud 1 Gallon Water Bottle Removable Straw And Handle Dishwasher-Safe BPS & BPA & DEHP Free +2 Brushes Big/Large Bottle With Time Markers Wide Mouth Leakproof 128 oz Jug (Blue & Black)',
  bullets: [
    'ULTIMATE HYDRATION SAFETY: Crafted from premium, food-grade, BPS & BPA & DEHP-free materials, this 100 oz / 128 oz water bottle ensures pure, 100% odorless hydration with every sip — your health, guaranteed.',
    '6-IN-1 SIP VERSATILE: Switch between straw, chug, and direct pour with the flip-top leakproof cap and removable straw — no lid swapping needed.',
    'NO-SPILL, ALL THRILL: Engineered with a secure silicone seal and locking lid for 100% leakproof confidence — toss it in your gym bag, car, or backpack with zero worries.',
    'DESIGNED FOR THE DYNAMIC: The detachable, adjustable shoulder strap and anti-slip handle turn this gallon jug into a wearable companion for the gym, office, commute, hike, and trail.',
    'MOTIVATIONAL HYDRATION TRACKING: Time markers from 8 AM to 10 PM guide your hourly intake so you stay on track and crush your daily hydration goals without apps or reminders.',
  ],
  usps: ['Includes 2 cleaning brushes', 'Dishwasher-safe Tritan', 'Detachable shoulder strap'],
}

export const SEEDED_COMPETITORS: Competitor[] = [
  {
    title: 'DYSANKY 1 Gallon Water Bottle Insulated | Thickened Stainless Steel',
    bullets: [
      'Stainless steel vacuum insulation keeps drinks cold for 48 hours or hot for 24 hours.',
      'Leakproof flip lid and sturdy carry handle for the gym, office, or car.',
      'Wide mouth opening, BPA free, powder-coated exterior that is cupholder-friendly.',
    ],
    source: 'manual',
  },
  {
    title: 'AQUAFIT 1 Gallon Water Bottle with Time Marker - Straw & Spout Lid',
    bullets: [
      'Time marker motivation from morning to night keeps your daily hydration goal on track.',
      'BPA free Tritan construction with a leakproof, wide mouth design.',
      'Straw lid and chug lid included, dishwasher safe, 128 oz capacity with motivational quotes.',
    ],
    source: 'manual',
  },
  {
    title: 'Swigina 1 Gallon Insulated Water Bottle with Silicone Boot',
    bullets: [
      'Double wall vacuum insulation keeps water cold for 36 hours, sweat-free every time.',
      'Leakproof cap with a silicone base that protects against drops and impact.',
      '128 oz capacity fits most cupholders, BPA free, includes 2 straws plus a cleaning brush.',
    ],
    source: 'manual',
  },
]

export const COMPETITOR_PASTE_TEMPLATE = SEEDED_COMPETITORS.map(
  (c) => `${c.title}\n${c.bullets.join('\n')}`,
).join('\n---\n')
