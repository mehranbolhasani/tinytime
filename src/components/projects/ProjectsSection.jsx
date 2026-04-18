import { useState } from 'react'
import { Folder, MoreHorizontal } from 'lucide-react'
import ColorSwatchPicker from '@/components/projects/ColorSwatchPicker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { COLOR_PRESETS, toSafeHexColor } from '@/lib/color'

const DEFAULT_COLOR = COLOR_PRESETS[0]

const INITIAL_FORM_STATE = {
  name: '',
  color: DEFAULT_COLOR,
  hourlyRate: '',
}

function formatHourlyRate(hourlyRate) {
  if (hourlyRate === null || hourlyRate === undefined) {
    return '—'
  }

  const amount = Number(hourlyRate)
  if (Number.isNaN(amount)) {
    return '—'
  }

  return `€${amount}/hr`
}

export default function ProjectsSection({
  projects,
  isLoading,
  error,
  createProject,
  updateProject,
  deleteProject,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isEditing = Boolean(editingProject)

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setEditingProject(null)
    setNameError('')
    setFormError('')
    setIsSaving(false)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const handleOpenEdit = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      color: project.color ?? DEFAULT_COLOR,
      hourlyRate:
        project.hourly_rate === null || project.hourly_rate === undefined
          ? ''
          : String(project.hourly_rate),
    })
    setNameError('')
    setFormError('')
    setIsFormOpen(true)
  }

  const handleFormCloseChange = (nextOpen) => {
    setIsFormOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      setNameError('Name is required.')
      return
    }

    const parsedHourlyRate =
      formData.hourlyRate === '' ? null : Number.parseFloat(formData.hourlyRate)
    const normalizedHourlyRate =
      parsedHourlyRate === null || Number.isFinite(parsedHourlyRate) ? parsedHourlyRate : null

    setNameError('')
    setFormError('')
    setIsSaving(true)

    try {
      if (isEditing && editingProject) {
        await updateProject(editingProject.id, {
          name: trimmedName,
          color: formData.color,
          hourly_rate: normalizedHourlyRate,
        })
      } else {
        await createProject({
          name: trimmedName,
          color: formData.color,
          hourly_rate: normalizedHourlyRate,
        })
      }

      handleFormCloseChange(false)
    } catch (saveError) {
      setFormError(saveError?.message ?? 'Unable to save project.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteProject(projectToDelete.id)
      setProjectToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-sm font-medium text-muted-foreground">Projects</h2>
        <Button
          onClick={handleOpenCreate}
          className="w-full rounded-lg transition-colors duration-150 sm:w-auto"
        >
          New project
        </Button>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Folder className="mb-2 h-8 w-8 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground/70">No projects yet.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-shadow duration-150 hover:shadow-sm sm:flex-row sm:items-center"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: toSafeHexColor(project.color) }}
              />
              <span className="text-sm font-medium text-foreground sm:flex-1">{project.name}</span>
              {project.hourly_rate != null ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {formatHourlyRate(project.hourly_rate)}
                </span>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${project.name}`}
                    className="text-muted-foreground/70 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 hover:text-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenEdit(project)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setProjectToDelete(project)}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={handleFormCloseChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{isEditing ? 'Edit project' : 'Create project'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update your project details.' : 'Add a new project to track your work.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="project-name" className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <Input
                id="project-name"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Project name"
                required
                className="rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40"
              />
              {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Color</p>
              <ColorSwatchPicker
                value={formData.color}
                onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="hourly-rate" className="text-sm font-medium text-muted-foreground">
                Hourly rate (EUR)
              </label>
              <Input
                id="hourly-rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.hourlyRate}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, hourlyRate: event.target.value }))
                }
                className="rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40"
              />
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleFormCloseChange(false)}
                className="rounded-lg bg-secondary text-foreground hover:bg-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-lg"
              >
                {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Delete {projectToDelete?.name}?</DialogTitle>
            <DialogDescription>
              This won&apos;t delete its time entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProjectToDelete(null)}
              className="rounded-lg bg-secondary text-foreground hover:bg-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="rounded-lg"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
