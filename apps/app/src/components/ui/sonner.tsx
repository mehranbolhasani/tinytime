import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/hooks/useTheme'

export default function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-center"
      offset={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      {...props}
    />
  )
}
