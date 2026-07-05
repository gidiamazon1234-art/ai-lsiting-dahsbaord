import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface ScoreSnapshot {
  overall: number
  rufus: number
  intent: number
  naturalness: number
}

const ROWS: Array<{ key: keyof ScoreSnapshot; label: string }> = [
  { key: 'overall', label: 'Overall' },
  { key: 'rufus', label: 'AI Assistant Readability' },
  { key: 'intent', label: 'Search-Intent Alignment' },
  { key: 'naturalness', label: 'Keyword Naturalness' },
]

function DeltaChip({ before, after }: { before: number; after: number }) {
  const delta = after - before
  const tone = delta > 0 ? 'text-success' : delta < 0 ? 'text-destructive' : 'text-muted-foreground'
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : ArrowRight
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-xs font-medium', tone)}>
      <Icon className="size-3.5" />
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  )
}

export function ScoreDeltaBanner({ before, after }: { before: ScoreSnapshot; after: ScoreSnapshot }) {
  return (
    <Card className="border-primary/30 bg-accent/40" data-testid="score-delta-banner">
      <CardContent className="flex flex-col gap-3 py-4">
        <p className="text-sm font-medium">Re-audited your applied rewrite against the same competitors</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ROWS.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2">
              <span className="text-xs text-muted-foreground">{row.label}</span>
              <span className="flex items-center gap-2 font-mono text-sm tabular-nums">
                {before[row.key]}
                <ArrowRight className="size-3 text-muted-foreground" />
                {after[row.key]}
                <DeltaChip before={before[row.key]} after={after[row.key]} />
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
