import { CopyButton } from '@/components/copy-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TITLE_CHAR_LIMIT } from '@/components/listing-form'
import type { AnalysisResult } from '@/engine/analysis'

export function RefactoredListingTab({ result }: { result: AnalysisResult }) {
  const { rewrite } = result

  return (
    <div className="flex flex-col gap-6" data-testid="refactored-listing-tab">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Refactored title</CardTitle>
            <CopyButton text={rewrite.title} data-testid="copy-title" />
          </div>
          <CardDescription className="font-mono text-xs">
            {rewrite.title.length} / {TITLE_CHAR_LIMIT} chars
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm" data-testid="rewrite-title">
            {rewrite.title}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Refactored bullets</CardTitle>
          <CardDescription>Rewritten as Outcome → Feature → Use case, claim-safe throughout.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rewrite.bullets.map((b, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 p-3" data-testid={`rewrite-bullet-${i}`}>
              <p className="text-sm">{b}</p>
              <CopyButton text={b} label="" className="shrink-0 px-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Paste-ready markdown</CardTitle>
            <CopyButton text={rewrite.markdown} label="Copy markdown" data-testid="copy-markdown" />
          </div>
          <CardDescription>Ready to paste into Seller Central's listing editor.</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 text-xs" data-testid="rewrite-markdown">
            {rewrite.markdown}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes made</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {rewrite.changesMade.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
