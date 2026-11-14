import { Check, Trash2 } from 'lucide-react'
import ProjectSelect from '@/components/projects/ProjectSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Project } from '@/types'

interface ClockCreateBarProps {
  description: string
  projectId: string | null
  projects: Project[]
  canConfirm: boolean
  isSaving?: boolean
  onDescriptionChange: (value: string) => void
  onProjectChange: (projectId: string | null) => void
  onConfirm: () => void
  onCancel: () => void
}

export default function ClockCreateBar({
  description,
  projectId,
  projects,
  canConfirm,
  isSaving = false,
  onDescriptionChange,
  onProjectChange,
  onConfirm,
  onCancel,
}: ClockCreateBarProps) {
  return (
    <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label="Cancel and discard"
        onClick={onCancel}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </Button>

      <Input
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Description"
        aria-label="Entry description"
        className="h-10 flex-1 rounded-xl"
        autoFocus
      />

      <ProjectSelect
        value={projectId}
        onChange={onProjectChange}
        projects={projects}
        aria-label="Project"
        placeholder="Project"
        triggerClassName="h-10 w-[7.5rem] shrink-0 rounded-xl"
      />

      <Button
        type="button"
        size="icon"
        className="h-11 w-11 shrink-0 rounded-full"
        aria-label="Save entry"
        disabled={!canConfirm || isSaving}
        onClick={onConfirm}
      >
        <Check className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  )
}
