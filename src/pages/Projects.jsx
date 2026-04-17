import ProjectsSection from '@/components/projects/ProjectsSection'
import TagsSection from '@/components/tags/TagsSection'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'
import { Separator } from '@/components/ui/separator'

export default function Projects() {
  const { projects, isLoading, error: projectsError, createProject, updateProject, deleteProject } =
    useProjects()
  const { tags, isLoading: isLoadingTags, error: tagsError, createTag, updateTag, deleteTag } =
    useTags()

  return (
    <section className="space-y-8">
      <header className="border-b border-border pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
      </header>

      <ProjectsSection
        projects={projects}
        isLoading={isLoading}
        error={projectsError}
        createProject={createProject}
        updateProject={updateProject}
        deleteProject={deleteProject}
      />

      <Separator className="bg-border" />

      <TagsSection
        tags={tags}
        isLoading={isLoadingTags}
        error={tagsError}
        createTag={createTag}
        updateTag={updateTag}
        deleteTag={deleteTag}
      />
    </section>
  )
}
