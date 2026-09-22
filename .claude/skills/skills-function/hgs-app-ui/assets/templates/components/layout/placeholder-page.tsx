import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
      <Icon className="size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Badge variant="secondary">Coming in a future milestone</Badge>
    </div>
  )
}
