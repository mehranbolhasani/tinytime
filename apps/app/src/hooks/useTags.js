import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { assertSupabaseClient, getFriendlySupabaseError } from '@/lib/supabase'

const TAGS_QUERY_KEY = ['tags']

function sortTagsByName(tags = []) {
  return [...tags].sort((a, b) => a.name.localeCompare(b.name))
}

export function useTags() {
  const queryClient = useQueryClient()
  const supabase = assertSupabaseClient()

  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color, created_at')
        .order('name', { ascending: true })

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to load tags.'))
      }

      return sortTagsByName(data ?? [])
    },
  })

  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: name.trim(),
          color,
        })
        .select('id, name, color, created_at')
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to create tag.'))
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const { data, error } = await supabase
        .from('tags')
        .update({
          ...updates,
          name: updates.name?.trim(),
        })
        .eq('id', id)
        .select('id, name, color, created_at')
        .single()

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to update tag.'))
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('tags').delete().eq('id', id)

      if (error) {
        throw new Error(getFriendlySupabaseError(error, 'Unable to delete tag.'))
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })

  const setEntryTagsMutation = useMutation({
    mutationFn: async ({ entryId, tagIds }) => {
      const { error: deleteError } = await supabase
        .from('time_entry_tags')
        .delete()
        .eq('time_entry_id', entryId)

      if (deleteError) {
        throw new Error(getFriendlySupabaseError(deleteError, 'Unable to update entry tags.'))
      }

      if (tagIds.length === 0) {
        return []
      }

      const payload = tagIds.map((tagId) => ({
        time_entry_id: entryId,
        tag_id: tagId,
      }))

      const { error: insertError } = await supabase.from('time_entry_tags').insert(payload)

      if (insertError) {
        throw new Error(getFriendlySupabaseError(insertError, 'Unable to update entry tags.'))
      }

      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['entry_tags'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
    },
  })

  const createTag = useCallback(
    async ({ name, color }) => createTagMutation.mutateAsync({ name, color }),
    [createTagMutation]
  )

  const updateTag = useCallback(
    async (id, updates) => updateTagMutation.mutateAsync({ id, updates }),
    [updateTagMutation]
  )

  const deleteTag = useCallback(async (id) => deleteTagMutation.mutateAsync(id), [deleteTagMutation])

  const getEntryTags = useCallback(async (entryId) => {
    const { data, error } = await supabase
      .from('time_entry_tags')
      .select('tags(id, name, color)')
      .eq('time_entry_id', entryId)

    if (error) {
      throw new Error(getFriendlySupabaseError(error, 'Unable to load entry tags.'))
    }

    return (data ?? [])
      .map((row) => (Array.isArray(row.tags) ? row.tags[0] : row.tags))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [supabase])

  const setEntryTags = useCallback(async (entryId, tagIds) => {
    const uniqueTagIds = [...new Set((tagIds ?? []).filter(Boolean))]
    return setEntryTagsMutation.mutateAsync({ entryId, tagIds: uniqueTagIds })
  }, [setEntryTagsMutation])

  return {
    tags,
    isLoading,
    error,
    createTag,
    updateTag,
    deleteTag,
    getEntryTags,
    setEntryTags,
  }
}
