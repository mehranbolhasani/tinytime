import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function getFilterLabel(items, noun) {
  if (items.length === 0) {
    return `All ${noun}`
  }
  if (items.length === 1) {
    return `1 ${noun.slice(0, -1)}`
  }
  return `${items.length} ${noun}`
}

export default function FilterBar({
  projects,
  tags,
  selectedProjectIds,
  selectedTagIds,
  onToggleProject,
  onToggleTag,
  onResetProjects,
  onResetTags,
}) {
  return (
    <section className="flex flex-wrap gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="rounded-lg border-border transition-colors duration-150">
            {getFilterLabel(selectedProjectIds, 'projects')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Project filter</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={selectedProjectIds.length === 0}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={onResetProjects}
          >
            All projects
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {projects.map((project) => (
            <DropdownMenuCheckboxItem
              key={project.id}
              checked={selectedProjectIds.includes(project.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => onToggleProject(project.id)}
            >
              {project.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="rounded-lg border-border transition-colors duration-150">
            {getFilterLabel(selectedTagIds, 'tags')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Tag filter</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={selectedTagIds.length === 0}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={onResetTags}
          >
            All tags
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {tags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag.id}
              checked={selectedTagIds.includes(tag.id)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => onToggleTag(tag.id)}
            >
              {tag.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </section>
  )
}
