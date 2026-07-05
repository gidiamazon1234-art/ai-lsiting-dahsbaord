import { cn } from '@/lib/utils'

function gradeColor(g: string): string {
  switch (g) {
    case 'A':
      return 'stroke-success'
    case 'B':
      return 'stroke-primary'
    case 'C':
      return 'stroke-warning'
    default:
      return 'stroke-destructive'
  }
}

export function Gauge({
  score,
  grade,
  label,
  size = 128,
  className,
}: {
  score: number
  grade: string
  label: string
  size?: number
  className?: string
}) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clampScore(score) / 100)

  return (
    <div className={cn('flex flex-col items-center gap-3', className)} data-testid="gauge">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            className="stroke-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-700 ease-out', gradeColor(grade))}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums">{Math.round(score)}</span>
          <span className="font-mono text-xs text-muted-foreground">{grade}</span>
        </div>
      </div>
      <span className="max-w-[10rem] text-center text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  )
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score))
}
