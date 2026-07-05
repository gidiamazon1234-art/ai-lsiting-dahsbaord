import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { KB_SOURCES, TERMINOLOGY, type ConfidenceLevel } from '@/engine/kb'
import type { AnalysisResult } from '@/engine/analysis'

const DIMENSIONS = [
  {
    key: 'rufus' as const,
    label: 'AI Assistant Readability (Alexa for Shopping)',
    submetrics: [
      ['Feature / benefit linkage', '22%'],
      ['Entity / attribute completeness', '18%'],
      ['Scan clarity & structure', '18%'],
      ['Alexa for Shopping Q&A coverage', '12%'],
      ['Conversational phrasing', '10%'],
      ['Compliance cleanliness', '10%'],
      ['Internal consistency', '10%'],
    ],
  },
  {
    key: 'intent' as const,
    label: 'Search-Intent Alignment',
    submetrics: [
      ['Target keyword coverage', '35%'],
      ['Competitor semantic cluster coverage', '25%'],
      ['Use-case coverage', '15%'],
      ['Core attribute match', '15%'],
      ['Differentiation / USP coverage', '10%'],
    ],
  },
  {
    key: 'naturalness' as const,
    label: 'Keyword Naturalness',
    submetrics: [
      ['Density in range', '30%'],
      ['Distribution across fields', '25%'],
      ['Syntactic integration', '20%'],
      ['Keyword variation', '15%'],
      ['Readability / no stuffing', '10%'],
    ],
  },
]

function confidenceVariant(level: ConfidenceLevel): 'success' | 'secondary' | 'warning' {
  if (level === 'high') return 'success'
  if (level === 'medium') return 'secondary'
  return 'warning'
}

export function MethodologyTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-6" data-testid="methodology-tab">
      <Card>
        <CardHeader>
          <CardTitle>Methodology</CardTitle>
          <CardDescription>{TERMINOLOGY.disclaimer}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Scores are computed at {new Date(result.generatedAt).toLocaleString()} by pure, deterministic TypeScript
            functions — no language model is called at any point in the analysis.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {DIMENSIONS.map((d) => (
          <Card key={d.key}>
            <CardHeader>
              <CardTitle className="text-sm">{d.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {d.submetrics.map(([name, weight]) => (
                  <li key={name} className="flex items-center justify-between gap-2">
                    <span>{name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{weight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Confidence-level legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="success">high</Badge> Directly sourced, high editorial confidence.
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">medium</Badge> Reasonably corroborated, evolving guidance.
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="warning">cautious</Badge> Emerging or policy-sensitive; verify before acting.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Knowledge base sources ({KB_SOURCES.length})</CardTitle>
          <CardDescription>Every KB-derived recommendation in this audit cites one or more of these sources.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <ul className="flex flex-col gap-4">
            {KB_SOURCES.map((s) => (
              <li key={s.id} className="flex flex-col gap-1" data-testid={`kb-source-${s.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    {s.title}
                    <ExternalLink className="size-3.5" />
                  </a>
                  <Badge variant={confidenceVariant(s.confidence)}>{s.confidence}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.publisher} — {s.note}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
