import PageShell from '@/components/layout/PageShell'
import ProjectsSection from '@/components/projects/ProjectsSection'
import { useProjects } from '@/hooks/useProjects'

export default function Projects() {
  const { projects, isLoading, error: projectsError, createProject, updateProject, deleteProject } =
    useProjects()

  return (
    <PageShell
      title="Projects"
      subtitle={
        isLoading ? undefined : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`
      }
      contentClassName="p-3"
    >
      <ProjectsSection
        projects={projects}
        isLoading={isLoading}
        error={projectsError}
        createProject={createProject}
        updateProject={updateProject}
        deleteProject={deleteProject}
      />
    </PageShell>
  )
}
