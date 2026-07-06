import { Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface FormState {
  brand: string
  asin: string
  targetKeyword: string
  title: string
  bullets: string[]
  usps: string
  competitorsText: string
}

export const TITLE_CHAR_LIMIT = 200

interface ListingFormProps {
  value: FormState
  onChange: (next: FormState) => void
  onRunAudit: () => void
  onUsePastedCompetitors: () => void
  onFetchFromAmazon: () => void
  isFetchingAsin: boolean
  asinLookupError?: string
  competitorCount: number
  isRunning: boolean
  error?: string
}

export function ListingForm({
  value,
  onChange,
  onRunAudit,
  onUsePastedCompetitors,
  onFetchFromAmazon,
  isFetchingAsin,
  asinLookupError,
  competitorCount,
  isRunning,
  error,
}: ListingFormProps) {
  function set<K extends keyof FormState>(key: K, next: FormState[K]) {
    onChange({ ...value, [key]: next })
  }

  function setBullet(index: number, text: string) {
    const bullets = [...value.bullets]
    bullets[index] = text
    set('bullets', bullets)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Your listing</CardTitle>
          <CardDescription>The product copy you want audited.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" data-testid="input-brand" value={value.brand} onChange={(e) => set('brand', e.target.value)} placeholder="EnergyBud" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asin">ASIN (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="asin"
                  data-testid="input-asin"
                  value={value.asin}
                  onChange={(e) => set('asin', e.target.value)}
                  placeholder="B085LL6253"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={onFetchFromAmazon}
                  disabled={isFetchingAsin || !value.asin.trim()}
                  data-testid="fetch-from-amazon-button"
                  title="Pull title and bullets for this ASIN from Amazon via Keepa"
                >
                  <Search />
                  {isFetchingAsin ? 'Fetching…' : 'Fetch from Amazon'}
                </Button>
              </div>
            </div>
          </div>
          {asinLookupError && (
            <p role="alert" className="text-sm text-destructive" data-testid="asin-lookup-error">
              {asinLookupError}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetKeyword">Target search keyword</Label>
            <Input
              id="targetKeyword"
              data-testid="input-target-keyword"
              value={value.targetKeyword}
              onChange={(e) => set('targetKeyword', e.target.value)}
              placeholder="1 gallon water bottle"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="title">Product title</Label>
              <span className="font-mono text-xs text-muted-foreground" data-testid="title-char-count">
                {value.title.length} chars · Amazon limit {TITLE_CHAR_LIMIT}
              </span>
            </div>
            <Textarea
              id="title"
              data-testid="input-title"
              value={value.title}
              onChange={(e) => set('title', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label>Bullet points (up to 5)</Label>
            {Array.from({ length: 5 }).map((_, i) => (
              <Textarea
                key={i}
                data-testid={`input-bullet-${i}`}
                value={value.bullets[i] ?? ''}
                onChange={(e) => setBullet(i, e.target.value)}
                placeholder={`Bullet ${i + 1}`}
                rows={2}
              />
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usps">USPs / compliance notes (one per line)</Label>
            <Textarea
              id="usps"
              data-testid="input-usps"
              value={value.usps}
              onChange={(e) => set('usps', e.target.value)}
              rows={3}
              placeholder={'Includes 2 cleaning brushes\nDishwasher-safe Tritan'}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Top organic competitors</CardTitle>
          <CardDescription>
            Paste title + bullets per competitor, separated by a line containing only <code className="rounded bg-muted px-1 py-0.5 font-mono">---</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            data-testid="input-competitors"
            value={value.competitorsText}
            onChange={(e) => set('competitorsText', e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground" data-testid="competitor-count">
              {competitorCount} competitor(s) parsed
            </span>
            <Button variant="secondary" size="sm" onClick={onUsePastedCompetitors} data-testid="use-competitors-button">
              Use pasted competitors
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-5 flex flex-col items-center gap-3 pt-2">
        <Button size="lg" onClick={onRunAudit} disabled={isRunning} data-testid="run-audit-button">
          <Sparkles />
          {isRunning ? 'Analyzing…' : 'Run audit'}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive" data-testid="run-audit-error">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
