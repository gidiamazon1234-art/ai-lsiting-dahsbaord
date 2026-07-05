import type { Competitor } from '@/engine/analysis'

export function parseCompetitorsPaste(text: string): Competitor[] {
  return text
    .split(/^---$/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      const [title, ...bullets] = lines
      return { title: title ?? '', bullets, source: 'manual' as const }
    })
    .filter((c) => c.title.length > 0)
}
