import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisResult, ClusterStatus } from '@/engine/analysis'

function statusVariant(status: ClusterStatus): 'success' | 'warning' | 'destructive' {
  if (status === 'covered') return 'success'
  if (status === 'partial') return 'warning'
  return 'destructive'
}

export function SemanticGapsTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-4" data-testid="semantic-gaps-tab">
      <Card>
        <CardHeader>
          <CardTitle>Semantic gap analysis</CardTitle>
          <CardDescription>
            Thematic coverage vs. your {result.competitors.length} seeded competitors, across{' '}
            {result.clusters.length} category themes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Theme</th>
                  <th className="py-2 pr-4">Competitor coverage</th>
                  <th className="py-2 pr-4">Your coverage</th>
                  <th className="py-2 pr-4">Gap</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Competitor terms</th>
                </tr>
              </thead>
              <tbody>
                {result.clusters.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/60"
                    data-testid={`cluster-row-${c.id}`}
                    data-status={c.status}
                  >
                    <td className="py-2 pr-4">
                      <div className="font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    </td>
                    <td className="py-2 pr-4 font-mono">{Math.round(c.competitorCoverage * 100)}%</td>
                    <td className="py-2 pr-4 font-mono">{Math.round(c.userCoverage * 100)}%</td>
                    <td className="py-2 pr-4 font-mono">{c.gap > 0 ? '+' : ''}{Math.round(c.gap * 100)}%</td>
                    <td className="py-2 pr-4">
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs text-muted-foreground">
                      {c.competitorTermHits.slice(0, 5).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
