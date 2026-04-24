import ProjectsSection from '@/components/projects/ProjectsSection'
import TagsSection from '@/components/tags/TagsSection'
import { useProjects } from '@/hooks/useProjects'
import { useTags } from '@/hooks/useTags'

export default function Projects() {
  const { projects, isLoading, error: projectsError, createProject, updateProject, deleteProject } =
    useProjects()
  const { tags, isLoading: isLoadingTags, error: tagsError, createTag, updateTag, deleteTag } =
    useTags()

  return (
    <section className="space-y-3">
      <header className="rounded-xl bg-card p-3">
        <h1 className="text-sm font-medium text-foreground">Projects & Tags</h1>
      </header>

      <ProjectsSection
        projects={projects}
        isLoading={isLoading}
        error={projectsError}
        createProject={createProject}
        updateProject={updateProject}
        deleteProject={deleteProject}
      />

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
