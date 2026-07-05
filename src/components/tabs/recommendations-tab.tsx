import { Hammer } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { RecommendationCard } from '@/components/recommendation-card'
import { Button } from '@/components/ui/button'
import { recommendationsToMarkdown } from '@/lib/export-markdown'
import type { AnalysisResult } from '@/engine/analysis'

export function RecommendationsTab({
  result,
  onApplyAndReaudit,
}: {
  result: AnalysisResult
  onApplyAndReaudit: () => void
}) {
  return (
    <div className="flex flex-col gap-4" data-testid="recommendations-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Prioritized fix recommendations</h3>
          <p className="text-sm text-muted-foreground">
            {result.recommendations.length} claim-safe recommendations, ranked by estimated impact.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={recommendationsToMarkdown(result.recommendations)} label="Copy all" data-testid="copy-all-recommendations" />
          <Button onClick={onApplyAndReaudit} data-testid="apply-and-reaudit-button">
            <Hammer />
            Build fixed listing & re-audit
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Applies the deterministic rewrite from the Refactored Listing tab back into the form and re-runs the audit
        against the same competitors, so you can see the score change immediately.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {result.recommendations.map((rec) => (
          <RecommendationCard key={rec.id} rec={rec} />
        ))}
      </div>
    </div>
  )
}
