'use client'

import { FormStep } from '@/lib/config/form-reader'
import { ConfigFormField } from './ConfigFormField'
import { useDictionaries } from '@/hooks/useFormSchema'

interface ConfigFormStepProps {
  step: FormStep
  locale?: string
}

export default function ConfigFormStep({
  step,
  locale = 'en',
}: ConfigFormStepProps) {
  // Collect all dictionary keys needed for this step
  const dictionaryKeys = step.fields
    .filter((field) => field.dictionary)
    .map((field) => field.dictionary!)
    .filter((key, index, self) => self.indexOf(key) === index) // unique

  // Load all required dictionaries at once
  const { data: dictionaries = {}, isLoading } = useDictionaries(
    dictionaryKeys,
    locale
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
        <div className="animate-pulse space-y-4">
          {step.fields.map((field) => (
            <div key={field.name} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {step.fields.map((field) => {
        const dictionaryItems = field.dictionary
          ? dictionaries[field.dictionary]
          : undefined

        return (
          <ConfigFormField
            key={field.name}
            field={field}
            locale={locale}
            dictionaryItems={dictionaryItems}
          />
        )
      })}
    </div>
  )
}




