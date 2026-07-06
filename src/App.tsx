import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { ListingForm, type FormState } from '@/components/listing-form'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScorecardsTab } from '@/components/tabs/scorecards-tab'
import { RecommendationsTab } from '@/components/tabs/recommendations-tab'
import { CompetitorsTab } from '@/components/tabs/competitors-tab'
import { SemanticGapsTab } from '@/components/tabs/semantic-gaps-tab'
import { RefactoredListingTab } from '@/components/tabs/refactored-listing-tab'
import { MethodologyTab } from '@/components/tabs/methodology-tab'
import { COMPETITOR_PASTE_TEMPLATE, ENERGYBUD_LISTING, SEEDED_COMPETITORS } from '@/data/fixtures'
import { parseCompetitorsPaste } from '@/lib/parse-competitors'
import { analyzeListing, type AnalysisResult, type Competitor, type ListingInput } from '@/engine/analysis'
import type { ScoreSnapshot } from '@/components/score-delta-banner'

function snapshotScores(result: AnalysisResult): ScoreSnapshot {
  return {
    overall: result.overall,
    rufus: result.scores.rufus.score,
    intent: result.scores.intent.score,
    naturalness: result.scores.naturalness.score,
  }
}

const EMPTY_FORM: FormState = {
  brand: '',
  asin: '',
  targetKeyword: '',
  title: '',
  bullets: ['', '', '', '', ''],
  usps: '',
  competitorsText: COMPETITOR_PASTE_TEMPLATE,
}

const DEMO_FORM: FormState = {
  brand: ENERGYBUD_LISTING.brand ?? '',
  asin: ENERGYBUD_LISTING.asin ?? '',
  targetKeyword: ENERGYBUD_LISTING.targetKeyword ?? '',
  title: ENERGYBUD_LISTING.title,
  bullets: ENERGYBUD_LISTING.bullets,
  usps: (ENERGYBUD_LISTING.usps ?? []).join('\n'),
  competitorsText: COMPETITOR_PASTE_TEMPLATE,
}

function buildListingInput(form: FormState): ListingInput | null {
  const title = form.title.trim()
  const bullets = form.bullets.map((b) => b.trim()).filter(Boolean)
  if (!title || bullets.length === 0) return null
  return {
    brand: form.brand.trim() || undefined,
    asin: form.asin.trim() || undefined,
    targetKeyword: form.targetKeyword.trim() || undefined,
    title,
    bullets,
    usps: form.usps
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean),
  }
}

function App() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [competitors, setCompetitors] = useState<Competitor[]>(SEEDED_COMPETITORS)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [previousScores, setPreviousScores] = useState<ScoreSnapshot | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState('scorecards')
  const [isFetchingAsin, setIsFetchingAsin] = useState(false)
  const [asinLookupError, setAsinLookupError] = useState<string | undefined>()

  function loadDemo() {
    setForm(DEMO_FORM)
    setCompetitors(SEEDED_COMPETITORS)
    setPreviousScores(null)
    setError(undefined)
  }

  function usePastedCompetitors() {
    setCompetitors(parseCompetitorsPaste(form.competitorsText))
  }

  async function fetchFromAmazon() {
    const asin = form.asin.trim()
    if (!asin) return
    setAsinLookupError(undefined)
    setIsFetchingAsin(true)
    try {
      const res = await fetch(`/api/lookup-asin?asin=${encodeURIComponent(asin)}`)
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error ?? 'Could not fetch this ASIN from Amazon.')
      }
      setForm((prev) => ({
        ...prev,
        asin,
        brand: data.brand ?? prev.brand,
        title: data.title ?? prev.title,
        bullets: [...(data.bullets ?? []), '', '', '', ''].slice(0, 5),
      }))
    } catch (e) {
      setAsinLookupError(e instanceof Error ? e.message : 'Could not fetch this ASIN from Amazon.')
    } finally {
      setIsFetchingAsin(false)
    }
  }

  function runAudit() {
    setError(undefined)
    const listing = buildListingInput(form)
    if (!listing) {
      setError(
        !form.title.trim()
          ? 'Add a product title before running the audit.'
          : 'Add at least one bullet point before running the audit.',
      )
      return
    }
    setIsRunning(true)
    try {
      const activeCompetitors = competitors.length > 0 ? competitors : parseCompetitorsPaste(form.competitorsText)
      setResult(analyzeListing(listing, activeCompetitors))
      setPreviousScores(null)
      setActiveTab('scorecards')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while analyzing the listing.')
    } finally {
      setIsRunning(false)
    }
  }

  function applyRewriteAndReaudit() {
    if (!result) return
    const nextForm: FormState = {
      ...form,
      title: result.rewrite.title,
      bullets: [...result.rewrite.bullets, '', '', '', ''].slice(0, 5),
    }
    setForm(nextForm)
    setError(undefined)
    const listing = buildListingInput(nextForm)
    if (!listing) return
    try {
      const nextResult = analyzeListing(listing, result.competitors)
      setPreviousScores(snapshotScores(result))
      setResult(nextResult)
      setActiveTab('scorecards')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong while re-auditing the rewrite.')
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo className="size-9" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Listing Auditor</h1>
            <p className="text-sm text-muted-foreground">Amazon copy scoring & competitive rewrite</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadDemo} data-testid="load-demo-button">
            <Sparkles />
            Load EnergyBud demo
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-8">
        <ListingForm
          value={form}
          onChange={setForm}
          onRunAudit={runAudit}
          onUsePastedCompetitors={usePastedCompetitors}
          onFetchFromAmazon={fetchFromAmazon}
          isFetchingAsin={isFetchingAsin}
          asinLookupError={asinLookupError}
          competitorCount={competitors.length}
          isRunning={isRunning}
          error={error}
        />

        {result && (
          <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="results-tabs">
            <TabsList>
              <TabsTrigger value="scorecards" data-testid="tab-scorecards">Scorecards</TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="competitors" data-testid="tab-competitors">Competitors</TabsTrigger>
              <TabsTrigger value="gaps" data-testid="tab-gaps">Semantic Gaps</TabsTrigger>
              <TabsTrigger value="rewrite" data-testid="tab-rewrite">Refactored Listing</TabsTrigger>
              <TabsTrigger value="methodology" data-testid="tab-methodology">Methodology</TabsTrigger>
            </TabsList>
            <TabsContent value="scorecards">
              <ScorecardsTab result={result} previousScores={previousScores} />
            </TabsContent>
            <TabsContent value="recommendations">
              <RecommendationsTab result={result} onApplyAndReaudit={applyRewriteAndReaudit} />
            </TabsContent>
            <TabsContent value="competitors">
              <CompetitorsTab result={result} />
            </TabsContent>
            <TabsContent value="gaps">
              <SemanticGapsTab result={result} />
            </TabsContent>
            <TabsContent value="rewrite">
              <RefactoredListingTab result={result} onApplyAndReaudit={applyRewriteAndReaudit} />
            </TabsContent>
            <TabsContent value="methodology">
              <MethodologyTab result={result} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="mt-12 border-t border-border pt-6 pb-4 text-center text-xs text-muted-foreground">
        Listing Auditor · deterministic scoring (Alexa for Shopping readability, search-intent alignment, keyword
        naturalness) · competitor semantic-gap analysis · markdown-ready rewrite. Scores are deterministic proxies,
        not official Amazon / Alexa for Shopping metrics. Guidance is synthesized from 11 third-party 2026 sources;
        not affiliated with Amazon.
      </footer>
    </div>
  )
}

export default App
