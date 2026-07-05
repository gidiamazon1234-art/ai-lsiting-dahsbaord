import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalysisResult } from '@/engine/analysis'

export function CompetitorsTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-6" data-testid="competitors-tab">
      <Card>
        <CardHeader>
          <CardTitle>Competitor thematic focus</CardTitle>
          <CardDescription>
            Top recurring phrases across {result.competitors.length} competitor listing(s), weighted by frequency and
            spread. Phrases flagged <Badge variant="destructive" className="align-middle">missing</Badge> do not
            appear anywhere in your copy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Phrase</th>
                  <th className="py-2 pr-4">Frequency</th>
                  <th className="py-2 pr-4">Competitors using it</th>
                  <th className="py-2 pr-4">In your copy?</th>
                </tr>
              </thead>
              <tbody>
                {result.competitorFocus.map((f) => (
                  <tr key={f.term} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono">{f.term}</td>
                    <td className="py-2 pr-4 font-mono">{f.totalFreq}</td>
                    <td className="py-2 pr-4 font-mono">
                      {f.docFreq}/{result.competitors.length}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={f.inUser ? 'success' : 'destructive'}>{f.inUser ? 'covered' : 'missing'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {result.competitors.map((c, i) => (
          <Card key={i} data-testid={`competitor-card-${i}`}>
            <CardHeader>
              <CardTitle className="text-sm">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                {c.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
