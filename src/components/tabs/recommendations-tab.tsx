import { CopyButton } from '@/components/copy-button'
import { RecommendationCard } from '@/components/recommendation-card'
import { recommendationsToMarkdown } from '@/lib/export-markdown'
import type { AnalysisResult } from '@/engine/analysis'

export function RecommendationsTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-4" data-testid="recommendations-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Prioritized fix recommendations</h3>
          <p className="text-sm text-muted-foreground">
            {result.recommendations.length} claim-safe recommendations, ranked by estimated impact.
          </p>
        </div>
        <CopyButton text={recommendationsToMarkdown(result.recommendations)} label="Copy all" data-testid="copy-all-recommendations" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {result.recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
    </div>
  )
}
