'use client'

import { useQuery } from '@tanstack/react-query'
import { FormConfig } from '@/lib/config/form-reader'

export function useFormSchema(formId: string = 'registration') {
  return useQuery<FormConfig>({
    queryKey: ['formSchema', formId],
    queryFn: async () => {
      const response = await fetch(`/api/config/form/${formId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch form schema')
      }
      return response.json()
    },
  })
}

export function useDictionary(
  key: string,
  locale: string = 'en'
) {
  return useQuery<Array<{ value: string; label: string }>>({
    queryKey: ['dictionary', key, locale],
    queryFn: async () => {
      const response = await fetch(
        `/api/config/dictionary/${key}?locale=${locale}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch dictionary')
      }
      const data = await response.json()
      return data.items
    },
  })
}

/**
 * Hook to load multiple dictionaries at once
 */
export function useDictionaries(
  keys: string[],
  locale: string = 'en'
) {
  return useQuery<Record<string, Array<{ value: string; label: string }>>>({
    queryKey: ['dictionaries', keys, locale],
    queryFn: async () => {
      const results = await Promise.all(
        keys.map(async (key) => {
          const response = await fetch(
            `/api/config/dictionary/${key}?locale=${locale}`
          )
          if (!response.ok) {
            console.warn(`Failed to fetch dictionary: ${key}`)
            return { key, items: [] }
          }
          const data = await response.json()
          return { key, items: data.items }
        })
      )

      const dictionaries: Record<string, Array<{ value: string; label: string }>> = {}
      results.forEach(({ key, items }) => {
        dictionaries[key] = items
      })
      return dictionaries
    },
    enabled: keys.length > 0,
  })
}




