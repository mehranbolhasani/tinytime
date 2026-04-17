import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'

const PROJECTS_QUERY_KEY = ['projects']

function sortProjectsByName(projects = []) {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name))
}

export function useProjects() {
  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()

  const { data: projects = [], isLoading, error } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, color, hourly_rate, created_at')
        .order('name', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load projects.'))
      }

      return sortProjectsByName(data ?? [])
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: async ({ name, color, hourly_rate }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name,
          color,
          hourly_rate,
        })
        .select('id, name, color, hourly_rate, created_at')
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

  const updateProjectMutation = useMutation({
    mutationFn: async (payload) => {
      const { id, updates } = payload
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select('id, name, color, hourly_rate, created_at')
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to update project.'))
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete project.'))
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    },
  })

  const createProject = async ({ name, color, hourly_rate }) =>
    createProjectMutation.mutateAsync({ name, color, hourly_rate })

  const updateProject = async (id, updates) =>
    updateProjectMutation.mutateAsync({ id, updates })

  const deleteProject = async (id) => deleteProjectMutation.mutateAsync(id)

  return {
    projects,
    isLoading,
    error,
    createProject,
    updateProject,
    deleteProject,
  }
}
