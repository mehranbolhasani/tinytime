import { CalendarDays, ClipboardList, Clock, Folder } from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/', label: 'Today', icon: Clock },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/reports', label: 'Reports', icon: ClipboardList },
  { to: '/projects', label: 'Projects', icon: Folder },
]
