import ProjectsSection from '@/components/projects/ProjectsSection'
import { useProjects } from '@/hooks/useProjects'

export default function Projects() {
  const { projects, isLoading, error: projectsError, createProject, updateProject, deleteProject } =
    useProjects()

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between">
        <h1 className="text-2xl font-pixel font-bold text-foreground tracking-tighter">Projects</h1>
        <p className="text-sm text-muted-foreground tracking-tight">{projects.length}</p>
      </header>

      <ProjectsSection
        projects={projects}
        isLoading={isLoading}
        error={projectsError}
        createProject={createProject}
        updateProject={updateProject}
        deleteProject={deleteProject}
      />
    </section>
  )
}
