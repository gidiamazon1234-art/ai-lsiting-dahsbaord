import { KB_SOURCE_MAP } from '@/engine/kb'
import type { Recommendation } from '@/engine/analysis'

export function recommendationsToMarkdown(recs: Recommendation[]): string {
  return recs
    .map((r) => {
      const lines = [
        `### ${r.rank}. ${r.title} (${r.priority}, impact ${Math.round(r.impactScore)})`,
        `- Category: ${r.category}`,
        `- Change to make: ${r.changeToMake}`,
        `- Why it matters: ${r.whyItMatters}`,
        `- Confidence: ${r.confidence} · Claim safety: ${r.claimSafety}`,
      ]
      if (r.before) lines.push(`- Before: ${r.before}`)
      if (r.after) lines.push(`- After: ${r.after}`)
      if (r.sourceIds?.length) {
        const sources = r.sourceIds.map((id) => KB_SOURCE_MAP[id]).filter(Boolean)
        lines.push(`- Sources: ${sources.map((s) => `[${s.publisher}](${s.url})`).join(', ')}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}
