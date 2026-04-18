import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
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
import { COLOR_PRESETS, hexToRgba } from '@/lib/color'

const DEFAULT_TAG_COLOR = '#94a3b8'

const INITIAL_TAG_FORM_STATE = {
  name: '',
  color: DEFAULT_TAG_COLOR,
}

export default function TagsSection({
  tags,
  isLoading,
  error,
  createTag,
  updateTag,
  deleteTag,
}) {
  const [isTagFormOpen, setIsTagFormOpen] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [tagToDelete, setTagToDelete] = useState(null)
  const [tagFormData, setTagFormData] = useState(INITIAL_TAG_FORM_STATE)
  const [tagNameError, setTagNameError] = useState('')
  const [tagFormError, setTagFormError] = useState('')
  const [isSavingTag, setIsSavingTag] = useState(false)
  const [isDeletingTag, setIsDeletingTag] = useState(false)
  const isEditingTag = Boolean(editingTag)

  const resetTagForm = () => {
    setTagFormData(INITIAL_TAG_FORM_STATE)
    setEditingTag(null)
    setTagNameError('')
    setTagFormError('')
    setIsSavingTag(false)
  }

  const handleOpenCreateTag = () => {
    resetTagForm()
    setIsTagFormOpen(true)
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

  const handleTagFormCloseChange = (nextOpen) => {
    setIsTagFormOpen(nextOpen)
    if (!nextOpen) {
      resetTagForm()
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
    } catch (saveError) {
      setTagFormError(saveError?.message ?? 'Unable to save tag.')
    } finally {
      setIsSavingTag(false)
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
    <section className="space-y-4">
      <header className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <h2 className="text-sm font-medium text-muted-foreground">Tags</h2>
        <Button
          onClick={handleOpenCreateTag}
          className="w-full rounded-lg transition-colors duration-150 sm:w-auto"
        >
          New tag
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
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-muted-foreground/70">No tags yet.</p>
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-shadow duration-150 hover:shadow-sm sm:flex-row sm:items-center"
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
              <span className="hidden sm:flex sm:flex-1" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${tag.name}`}
                    className="text-muted-foreground/70 opacity-0 transition-opacity duration-100 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100 hover:text-foreground"
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

      <Dialog open={isTagFormOpen} onOpenChange={handleTagFormCloseChange}>
        <DialogContent>
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
                className="rounded-lg border-border bg-secondary focus:bg-background focus:ring-1 focus:ring-ring/40"
              />
              {tagNameError ? <p className="text-sm text-destructive">{tagNameError}</p> : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">Color</p>
              <ColorSwatchPicker
                value={tagFormData.color}
                onChange={(color) => setTagFormData((prev) => ({ ...prev, color }))}
                colors={[...COLOR_PRESETS, DEFAULT_TAG_COLOR]}
              />
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
                className="rounded-lg"
              >
                {isSavingTag ? 'Saving...' : isEditingTag ? 'Save changes' : 'Create tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(tagToDelete)} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <DialogContent>
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
              variant="destructive"
              onClick={handleDeleteTagConfirm}
              disabled={isDeletingTag}
              className="rounded-lg"
            >
              {isDeletingTag ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
