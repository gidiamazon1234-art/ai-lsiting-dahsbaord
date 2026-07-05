import { Gauge } from '@/components/gauge'
import { RecommendationCard } from '@/components/recommendation-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { TERMINOLOGY } from '@/engine/kb'
import type { AnalysisResult, ScoreCard } from '@/engine/analysis'

function ScoreColumn({ card }: { card: ScoreCard }) {
  return (
    <Card data-testid={`scorecard-${card.key}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{card.label}</CardTitle>
          <span className="font-mono text-sm text-muted-foreground">
            {card.score}/100 · {card.grade}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{card.summary}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {card.submetrics.map((s) => (
          <div key={s.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{s.name}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(s.score)} · w{Math.round(s.weight * 100)}%
              </span>
            </div>
            <Progress value={s.score} />
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              {s.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ScorecardsTab({ result }: { result: AnalysisResult }) {
  const topFixes = result.recommendations.slice(0, 3)

  return (
    <div className="flex flex-col gap-8" data-testid="scorecards-tab">
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 sm:flex-row sm:justify-around">
          <Gauge score={result.overall} grade={result.overallGrade} label="Overall" size={140} />
          <Gauge score={result.scores.rufus.score} grade={result.scores.rufus.grade} label={result.scores.rufus.label} />
          <Gauge score={result.scores.intent.score} grade={result.scores.intent.grade} label={result.scores.intent.label} />
          <Gauge score={result.scores.naturalness.score} grade={result.scores.naturalness.grade} label={result.scores.naturalness.label} />
        </CardContent>
        <CardContent className="pt-0">
          <p className="text-center text-xs text-muted-foreground">{TERMINOLOGY.disclaimer}</p>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-xl font-semibold tracking-tight">Top fixes to prioritize</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {topFixes.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} compact />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreColumn card={result.scores.rufus} />
        <ScoreColumn card={result.scores.intent} />
        <ScoreColumn card={result.scores.naturalness} />
      </div>
    </div>
  )
}
