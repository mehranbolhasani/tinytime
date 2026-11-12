import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toSafeHexColor } from '@/lib/color'
import type { Project } from '@/types'

const NO_PROJECT_VALUE = '__no_project__'
const DOT_CLASS = 'h-2.5 w-2.5 shrink-0 rounded-full'

interface ProjectSelectProps {
  /** Project id, or null for "No project". */
  value: string | null
  onChange: (projectId: string | null) => void
  projects: Project[]
  disabled?: boolean
  id?: string
  'aria-label'?: string
  placeholder?: string
  triggerClassName?: string
  size?: 'sm' | 'default' | 'lg'
}

export default function ProjectSelect({
  value,
  onChange,
  projects,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  placeholder = 'No project',
  triggerClassName,
  size,
}: ProjectSelectProps) {
  return (
    <Select
      value={value ?? NO_PROJECT_VALUE}
      onValueChange={(next) => onChange(next === NO_PROJECT_VALUE ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        size={size}
        className={triggerClassName}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_PROJECT_VALUE}>
          <span className="inline-flex items-center gap-2">
            <span
              className={`${DOT_CLASS} border border-border bg-transparent`}
              aria-hidden="true"
            />
            <span>No project</span>
          </span>
        </SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <span className="inline-flex items-center gap-2">
              <span
                className={DOT_CLASS}
                style={{ backgroundColor: toSafeHexColor(project.color) }}
                aria-hidden="true"
              />
              <span>{project.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
