import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { useTimerNotification } from '@/hooks/useTimerNotification'

interface NotificationSettingProps {
  notification: ReturnType<typeof useTimerNotification>
}

export default function NotificationSetting({ notification }: NotificationSettingProps) {
  return (
    <div className="py-5 space-y-2 border-t border-border/20">
      <p className="text-xs font-medium text-background">Timer notifications</p>
      {notification.permissionState === 'unsupported' ? (
        <p className="text-xs text-background/70">Not supported in this browser.</p>
      ) : (
        <div className="flex items-center gap-2">
          <Select
            value={String(notification.thresholdMinutes)}
            onValueChange={(value) => notification.setThreshold(Number(value))}
          >
            <SelectTrigger
              aria-label="Notify after"
              size="sm"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Off</SelectItem>
              <SelectItem value="60">After 1 h</SelectItem>
              <SelectItem value="90">After 1.5 h</SelectItem>
              <SelectItem value="120">After 2 h</SelectItem>
              <SelectItem value="180">After 3 h</SelectItem>
            </SelectContent>
          </Select>
          {notification.permissionState === 'denied' ? (
            <p className="text-xs text-destructive">Permission denied in browser settings.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
