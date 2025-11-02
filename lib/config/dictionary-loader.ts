import { getDictionary } from './form-reader'

/**
 * Preloads all dictionaries for a locale
 * Useful for client-side caching
 */
export async function loadAllDictionaries(
  locale: string = 'en'
): Promise<Record<string, Array<{ value: string; label: string }>>> {
  const dictionaryKeys = [
    'countries',
    'languages',
    'living_situations',
    'current_situations',
    'interests',
  ]

  const dictionaries: Record<string, Array<{ value: string; label: string }>> =
    {}

  for (const key of dictionaryKeys) {
    const items = await getDictionary(key, locale)
    if (items) {
      dictionaries[key] = items
    }
  }

  return dictionaries
}

/**
 * Gets dictionary items for a specific key and locale
 * Falls back to 'en' if locale not found
 */
export async function getDictionaryItems(
  key: string,
  locale: string = 'en'
): Promise<Array<{ value: string; label: string }>> {
  let items = await getDictionary(key, locale)

  // Fallback to English if locale not found
  if (!items && locale !== 'en') {
    items = await getDictionary(key, 'en')
  }

  return items || []
}





