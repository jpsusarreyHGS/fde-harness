import { CircleAlert } from 'lucide-react'
import { PlaceholderPage } from '@/components/layout/placeholder-page'

export function NotFoundPage() {
  return (
    <PlaceholderPage
      title="Page not found"
      description="The page you are looking for does not exist yet."
      icon={CircleAlert}
    />
  )
}
