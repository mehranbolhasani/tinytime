import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { hexToRgba } from '@/lib/color'
import { cn } from '@/lib/utils'

function TagPill({ tag, compact = false }) {
  return (
    <span
      className={cn('rounded-full px-2 py-0.5 font-medium transition-opacity duration-100', compact ? 'text-[11px]' : 'text-xs')}
      style={{
        backgroundColor: hexToRgba(tag.color, 0.15),
        color: tag.color,
      }}
    >
      {tag.name}
    </span>
  )
}

export default function TagSelector({
  tags,
  selectedTagIds,
  onChange,
  disabled = false,
  triggerLabel = 'Select tags',
  showSelectedPills = true,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTags = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return tags
    }

    return tags.filter((tag) => tag.name.toLowerCase().includes(normalizedSearch))
  }, [tags, searchTerm])

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  )

  const handleToggleTag = (tagId) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId))
      return
    }

    onChange([...selectedTagIds, tagId])
  }

  return (
    <div className={cn('w-full space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className="h-8 w-full justify-between rounded-md border-input bg-card px-3 text-sm font-normal transition-colors duration-150"
          >
            <span className="truncate">
              {selectedTagIds.length > 0 ? `${selectedTagIds.length} tag(s) selected` : triggerLabel}
            </span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(320px,calc(100vw-1.5rem))] space-y-2 rounded-xl border-border p-3"
        >
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search tags..."
            className="rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40"
          />
          <div className="max-h-56 space-y-1 overflow-auto pr-1">
            {filteredTags.length === 0 ? (
              <p className="px-2 py-1 text-sm text-muted-foreground/70">No tags found.</p>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm transition-colors duration-100 hover:bg-secondary',
                      isSelected && 'bg-secondary'
                    )}
                    onClick={() => handleToggleTag(tag.id)}
                  >
                    <TagPill tag={tag} />
                    {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {showSelectedPills && selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <TagPill key={tag.id} tag={tag} compact />
          ))}
        </div>
      ) : null}
    </div>
  )
}
