// Replace these with the app's own top-level modules. Order here is the
// order in the sidebar; keep it to roughly 6-10 entries.

import {
  LayoutDashboard,
  Briefcase,
  Users,
  Compass,
  Settings2,
  Calculator,
  FileText,
  Handshake,
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Opportunities', path: '/opportunities', icon: Briefcase },
  { title: 'Customers', path: '/customers', icon: Users },
  { title: 'Discovery', path: '/discovery', icon: Compass },
  { title: 'Configuration', path: '/configuration', icon: Settings2 },
  { title: 'Pricing', path: '/pricing', icon: Calculator },
  { title: 'Quotes', path: '/quotes', icon: FileText },
  { title: 'Commercial', path: '/commercial', icon: Handshake },
  { title: 'Analytics', path: '/analytics', icon: BarChart3 },
  { title: 'Administration', path: '/administration', icon: ShieldCheck },
]
