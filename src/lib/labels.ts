import type { ClaimSafety, DimensionKey, Priority } from '@/engine/analysis'

export function dimensionLabel(key: DimensionKey): string {
  switch (key) {
    case 'rufus':
      return 'Alexa'
    case 'intent':
      return 'Intent'
    case 'naturalness':
      return 'Naturalness'
  }
}

export function priorityBadgeVariant(priority: Priority): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (priority) {
    case 'Critical':
      return 'destructive'
    case 'High':
      return 'default'
    case 'Medium':
      return 'secondary'
    case 'Low':
      return 'outline'
  }
}

export function claimSafetyVariant(safety: ClaimSafety): 'success' | 'warning' | 'destructive' {
  switch (safety) {
    case 'Safe':
      return 'success'
    case 'Verify claim':
      return 'warning'
    case 'Do not claim unless proven':
      return 'destructive'
  }
}
