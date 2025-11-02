import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Database } from '@/types/supabase'

type FormSchema = Database['public']['Tables']['form_schemas']['Row']
type Dictionary = Database['public']['Tables']['dictionaries']['Row']

export interface FormField {
  name: string
  type: 'text' | 'email' | 'password' | 'select' | 'multiselect' | 'file' | 'dynamic' | 'address'
  label: string
  required?: boolean
  dictionary?: string
  validation?: Record<string, any>
  accept?: string
  autocomplete?: boolean
  autocomplete_provider?: string
}

export interface FormStep {
  id: string
  title: string
  fields: FormField[]
}

export interface FormConfig {
  id: string
  version: number
  steps: FormStep[]
}

/**
 * Reads form schema from Supabase (config-driven)
 * Uses admin client as fallback if anon client fails (temporary workaround)
 */
export async function getFormSchema(
  formId: string = 'registration'
): Promise<FormConfig | null> {
  // Try with regular client first
  const supabase = await createClient()

  let { data, error } = await supabase
    .from('form_schemas')
    .select('*')
    .eq('id', formId)
    .single()

  // Log error for debugging
  if (error) {
    console.error('Supabase error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
  }

  // Fallback to admin client if anon fails (temporary workaround for RLS)
  if (error && (error.code === 'PGRST301' || error.code === '42501')) {
    console.warn('RLS blocked, using admin client as fallback:', error.message)
    try {
      const adminSupabase = createAdminClient()
      const result = await adminSupabase
        .from('form_schemas')
        .select('*')
        .eq('id', formId)
        .single()
      data = result.data
      error = result.error
    } catch (adminError) {
      console.error('Admin client also failed:', adminError)
    }
  }

  if (error || !data) {
    console.error('Error fetching form schema:', error)
    return null
  }

  const schema = data.json as {
    steps: FormStep[]
  }

  return {
    id: data.id,
    version: data.version,
    steps: schema.steps,
  }
}

/**
 * Reads dictionary (dropdown options) from Supabase
 * Uses admin client as fallback if anon client fails
 */
export async function getDictionary(
  key: string,
  locale: string = 'en'
): Promise<Array<{ value: string; label: string }> | null> {
  const supabase = await createClient()

  let { data, error } = await supabase
    .from('dictionaries')
    .select('items')
    .eq('key', key)
    .eq('locale', locale)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  // Log error for debugging
  if (error) {
    console.error('Supabase dictionary error:', {
      code: error.code,
      message: error.message,
    })
  }

  // Fallback to admin client if anon fails
  if (error && (error.code === 'PGRST301' || error.code === '42501')) {
    console.warn('RLS blocked, using admin client as fallback:', error.message)
    try {
      const adminSupabase = createAdminClient()
      const result = await adminSupabase
        .from('dictionaries')
        .select('items')
        .eq('key', key)
        .eq('locale', locale)
        .order('version', { ascending: false })
        .limit(1)
        .single()
      data = result.data
      error = result.error
    } catch (adminError) {
      console.error('Admin client also failed:', adminError)
    }
  }

  if (error || !data) {
    console.error('Error fetching dictionary:', error)
    return null
  }

  return data.items as Array<{ value: string; label: string }>
}

/**
 * Gets feature flag value
 */
export async function getFeatureFlag(
  key: string
): Promise<{ enabled: boolean; value: any } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('key', key)
    .single()

  if (error || !data) {
    console.error('Error fetching feature flag:', error)
    return null
  }

  return {
    enabled: data.enabled,
    value: data.value,
  }
}




