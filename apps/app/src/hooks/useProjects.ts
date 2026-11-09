import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TIME_ENTRIES_QUERY_KEY } from '@/hooks/useTimeEntries'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'
import type { Project } from '@/types'

const PROJECTS_QUERY_KEY = ['projects']

function sortProjectsByName(projects: Project[] = []): Project[] {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name))
}

interface CreateProjectInput {
  name: string
  color: string | null
}

interface UpdateProjectInput {
  name?: string
  color?: string | null
}

interface UseProjectsResult {
  projects: Project[]
  isLoading: boolean
  error: Error | null
  createProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (id: string, updates: UpdateProjectInput) => Promise<Project>
  deleteProject: (id: string) => Promise<string>
}

export function useProjects(): UseProjectsResult {
  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()

  const { data: projects = [], isLoading, error } = useQuery<Project[], Error>({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, color, created_at')
        .order('name', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load projects.'))
      }

      return sortProjectsByName(data ?? [])
    },
  })

  const createProjectMutation = useMutation<Project, Error, CreateProjectInput>({
    mutationFn: async ({ name, color }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, color: color ?? undefined })
        .select('id, name, color, created_at')
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to create project.'))
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })

  const updateProjectMutation = useMutation<Project, Error, { id: string; updates: UpdateProjectInput }>({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ name: updates.name, color: updates.color ?? undefined })
        .eq('id', id)
        .select('id, name, color, created_at')
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to update project.'))
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    },
  })

  const deleteProjectMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete project.'))
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TIME_ENTRIES_QUERY_KEY })
    },
  })

  const { mutateAsync: createProjectAsync } = createProjectMutation
  const { mutateAsync: updateProjectAsync } = updateProjectMutation
  const { mutateAsync: deleteProjectAsync } = deleteProjectMutation

  const createProject = useCallback(
    (input: CreateProjectInput) => createProjectAsync(input),
    [createProjectAsync]
  )
  const updateProject = useCallback(
    (id: string, updates: UpdateProjectInput) => updateProjectAsync({ id, updates }),
    [updateProjectAsync]
  )
  const deleteProject = useCallback((id: string) => deleteProjectAsync(id), [deleteProjectAsync])

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  }
}
