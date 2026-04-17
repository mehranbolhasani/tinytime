import { useState } from 'react'
import { Folder, MoreHorizontal } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
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
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const COLOR_PRESETS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
]

const COLOR_CLASSES = {
  '#6366f1': 'bg-[#6366f1]',
  '#f59e0b': 'bg-[#f59e0b]',
  '#10b981': 'bg-[#10b981]',
  '#ef4444': 'bg-[#ef4444]',
  '#3b82f6': 'bg-[#3b82f6]',
  '#ec4899': 'bg-[#ec4899]',
  '#8b5cf6': 'bg-[#8b5cf6]',
  '#14b8a6': 'bg-[#14b8a6]',
}

const DEFAULT_COLOR = COLOR_PRESETS[0]
const DEFAULT_TAG_COLOR = '#94a3b8'

const INITIAL_FORM_STATE = {
  name: '',
  color: DEFAULT_COLOR,
  hourlyRate: '',
}

const INITIAL_TAG_FORM_STATE = {
  name: '',
  color: DEFAULT_TAG_COLOR,
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

function getColorClass(color) {
  return COLOR_CLASSES[color] ?? 'bg-muted'
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function Projects() {
  const {
    projects,
    isLoading,
    error: projectsError,
    createProject,
    updateProject,
    deleteProject,
  } = useProjects()
  const {
    tags,
    isLoading: isLoadingTags,
    error: tagsError,
    createTag,
    updateTag,
    deleteTag,
  } = useTags()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [nameError, setNameError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTagFormOpen, setIsTagFormOpen] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [tagToDelete, setTagToDelete] = useState(null)
  const [tagFormData, setTagFormData] = useState(INITIAL_TAG_FORM_STATE)
  const [tagNameError, setTagNameError] = useState('')
  const [tagFormError, setTagFormError] = useState('')
  const [isSavingTag, setIsSavingTag] = useState(false)
  const [isDeletingTag, setIsDeletingTag] = useState(false)

  const isEditing = Boolean(editingProject)
  const isEditingTag = Boolean(editingTag)

  const resetForm = () => {
    setFormData(INITIAL_FORM_STATE)
    setEditingProject(null)
    setNameError('')
    setFormError('')
    setIsSaving(false)
  }

  const resetTagForm = () => {
    setTagFormData(INITIAL_TAG_FORM_STATE)
    setEditingTag(null)
    setTagNameError('')
    setTagFormError('')
    setIsSavingTag(false)
  }

  const handleOpenCreate = () => {
    resetForm()
    setIsFormOpen(true)
  }

  const handleOpenCreateTag = () => {
    resetTagForm()
    setIsTagFormOpen(true)
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

  const handleOpenEditTag = (tag) => {
    setEditingTag(tag)
    setTagFormData({
      name: tag.name,
      color: tag.color ?? DEFAULT_TAG_COLOR,
    })
    setTagNameError('')
    setTagFormError('')
    setIsTagFormOpen(true)
  }

  const handleFormCloseChange = (nextOpen) => {
    setIsFormOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleTagFormCloseChange = (nextOpen) => {
    setIsTagFormOpen(nextOpen)
    if (!nextOpen) {
      resetTagForm()
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
    } catch (error) {
      setFormError(error?.message ?? 'Unable to save project.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTagSubmit = async (event) => {
    event.preventDefault()

    const trimmedName = tagFormData.name.trim()
    if (!trimmedName) {
      setTagNameError('Name is required.')
      return
    }

    setTagNameError('')
    setTagFormError('')
    setIsSavingTag(true)

    try {
      if (isEditingTag && editingTag) {
        await updateTag(editingTag.id, {
          name: trimmedName,
          color: tagFormData.color,
        })
      } else {
        await createTag({
          name: trimmedName,
          color: tagFormData.color,
        })
      }

      handleTagFormCloseChange(false)
    } catch (error) {
      setTagFormError(error?.message ?? 'Unable to save tag.')
    } finally {
      setIsSavingTag(false)
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
    } catch {
      // keep dialog open so user can retry
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteTagConfirm = async () => {
    if (!tagToDelete) {
      return
    }

    setIsDeletingTag(true)
    try {
      await deleteTag(tagToDelete.id)
      setTagToDelete(null)
    } finally {
      setIsDeletingTag(false)
    }
  }

  return (
    <section className="space-y-8">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
        <Button
          onClick={handleOpenCreate}
          className="rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-150"
        >
          New project
        </Button>
      </header>

      {projectsError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {projectsError.message}
        </div>
      ) : null}

      <div className="space-y-2">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground/70">
            Loading projects...
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
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-shadow duration-150 hover:shadow-sm"
            >
              <span
                className={cn('h-2.5 w-2.5 shrink-0 rounded-full', getColorClass(project.color))}
              />
              <span className="flex-1 text-sm font-medium text-foreground">{project.name}</span>
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
                    className="opacity-0 transition-opacity duration-100 group-hover:opacity-100 text-muted-foreground/70 hover:text-foreground"
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

      <Separator className="bg-border" />

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Tags</h2>
          <Button
            onClick={handleOpenCreateTag}
            className="rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-150"
          >
            New tag
          </Button>
        </header>

        {tagsError ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {tagsError.message}
          </div>
        ) : null}

        <div className="space-y-2">
          {isLoadingTags ? (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground/70">
              Loading tags...
            </div>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-muted-foreground/70">No tags yet.</p>
            </div>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-shadow duration-150 hover:shadow-sm"
              >
                <span
                  className="rounded-full px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: hexToRgba(tag.color, 0.2),
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
                <span className="flex-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${tag.name}`}
                      className="opacity-0 transition-opacity duration-100 group-hover:opacity-100 text-muted-foreground/70 hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenEditTag(tag)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setTagToDelete(tag)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Create/Edit Project Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormCloseChange}>
        <DialogContent className="rounded-2xl border-border shadow-md">
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
                className="rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
              />
              {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => {
                  const isSelected = formData.color === color
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color }))}
                      className={cn(
                        'h-7 w-7 rounded-full cursor-pointer transition-transform duration-100',
                        getColorClass(color),
                        isSelected && 'ring-2 ring-offset-2 ring-foreground'
                      )}
                      aria-label={`Select ${color} color`}
                    />
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="hourly-rate" className="text-sm font-medium text-muted-foreground">
                Hourly rate (€)
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
                className="rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
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
                className="rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Create project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Dialog */}
      <Dialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="rounded-2xl border-border shadow-md">
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
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="rounded-lg bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Tag Dialog */}
      <Dialog open={isTagFormOpen} onOpenChange={handleTagFormCloseChange}>
        <DialogContent className="rounded-2xl border-border shadow-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{isEditingTag ? 'Edit tag' : 'Create tag'}</DialogTitle>
            <DialogDescription>
              {isEditingTag ? 'Update your tag details.' : 'Add a new global tag.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTagSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="tag-name" className="text-sm font-medium text-muted-foreground">
                Name
              </label>
              <Input
                id="tag-name"
                value={tagFormData.name}
                onChange={(event) =>
                  setTagFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Tag name"
                required
                className="rounded-lg border-border bg-secondary focus:bg-white focus:ring-1 focus:ring-ring/40"
              />
              {tagNameError ? <p className="text-sm text-destructive">{tagNameError}</p> : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => {
                  const isSelected = tagFormData.color === color
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTagFormData((prev) => ({ ...prev, color }))}
                      className={cn(
                        'h-7 w-7 rounded-full cursor-pointer transition-transform duration-100',
                        getColorClass(color),
                        isSelected && 'ring-2 ring-offset-2 ring-foreground'
                      )}
                      aria-label={`Select ${color} color`}
                    />
                  )
                })}
              </div>
            </div>

            {tagFormError ? <p className="text-sm text-destructive">{tagFormError}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTagFormCloseChange(false)}
                className="rounded-lg bg-secondary text-foreground hover:bg-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingTag}
                className="rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                {isSavingTag ? 'Saving...' : isEditingTag ? 'Save changes' : 'Create tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Dialog */}
      <Dialog open={Boolean(tagToDelete)} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <DialogContent className="rounded-2xl border-border shadow-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Delete {tagToDelete?.name}?</DialogTitle>
            <DialogDescription>
              It will be removed from all entries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTagToDelete(null)}
              className="rounded-lg bg-secondary text-foreground hover:bg-border"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteTagConfirm}
              disabled={isDeletingTag}
              className="rounded-lg bg-red-500 text-white hover:bg-red-600"
            >
              {isDeletingTag ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
