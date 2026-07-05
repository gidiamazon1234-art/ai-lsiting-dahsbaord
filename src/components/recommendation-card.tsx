import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KB_SOURCE_MAP } from '@/engine/kb'
import type { Recommendation } from '@/engine/analysis'
import { claimSafetyVariant, dimensionLabel, priorityBadgeVariant } from '@/lib/labels'

export function RecommendationCard({ rec, compact = false }: { rec: Recommendation; compact?: boolean }) {
  return (
    <Card data-testid={`recommendation-${rec.id}`} className="flex h-full flex-col">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={priorityBadgeVariant(rec.priority)}>{rec.priority}</Badge>
          <Badge variant="outline">{rec.category.replace(/_/g, ' ')}</Badge>
          {rec.affectedDimensions.map((d) => (
            <Badge key={d} variant="accent">
              {dimensionLabel(d)}
            </Badge>
          ))}
          <span className="ml-auto font-mono text-xs text-muted-foreground">impact {Math.round(rec.impactScore)}</span>
        </div>
        <CardTitle className="text-sm">{rec.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Change to make</p>
          <p className="mt-1">{rec.changeToMake}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</p>
          <p className="mt-1 text-muted-foreground">{rec.whyItMatters}</p>
        </div>
        {(rec.before || rec.after) && !compact && (
          <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs">
            {rec.before && (
              <div>
                <span className="font-semibold text-destructive">Before: </span>
                <span className="font-mono">{rec.before}</span>
              </div>
            )}
            {rec.after && (
              <div>
                <span className="font-semibold text-success">After: </span>
                <span className="font-mono">{rec.after}</span>
              </div>
            )}
          </div>
        )}
        {!compact && rec.evidence.length > 0 && (
          <ul className="list-inside list-disc text-xs text-muted-foreground">
            {rec.evidence.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <Badge variant="outline">Confidence: {rec.confidence}</Badge>
          <Badge variant={claimSafetyVariant(rec.claimSafety)}>{rec.claimSafety}</Badge>
        </div>
        {rec.sourceIds && rec.sourceIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
            {rec.sourceIds.map((id) => {
              const source = KB_SOURCE_MAP[id]
              if (!source) return null
              return (
                <a
                  key={id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`source-link-${id}`}
                >
                  {source.publisher}
                  <ExternalLink className="size-3" />
                </a>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
