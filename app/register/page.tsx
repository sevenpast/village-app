'use client'

import RegistrationWizard from '@/components/forms/RegistrationWizard'
import RegistrationHeader from '@/components/forms/RegistrationHeader'
import RegistrationFooter from '@/components/forms/RegistrationFooter'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()

  const handleComplete = (data: any) => {
    console.log('Registration completed:', data)
    // Redirect to success page with email and firstName
    if (data.success) {
      const params = new URLSearchParams({
        email: data.email || '',
      })
      if (data.firstName) {
        params.append('firstName', data.firstName)
      }
      router.push(`/register/success?${params.toString()}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#FAF6F0' }}>
      <RegistrationHeader />
      <div className="flex-1">
        <RegistrationWizard onComplete={handleComplete} />
      </div>
      <RegistrationFooter />
    </div>
  )
}

