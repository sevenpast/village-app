import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    // Await params (Next.js 15+ requirement)
    const params = await context.params
    const taskId = parseInt(params.taskId, 10)

    console.log('API Route called with taskId:', taskId)

    if (isNaN(taskId) || taskId < 1 || taskId > 5) {
      console.error('Invalid taskId:', params.taskId)
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Auth error details:', {
        message: userError.message,
        status: userError.status,
        name: userError.name,
      })
      
      // Check if it's an API key issue
      if (userError.message?.includes('Invalid API key') || userError.message?.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'Unauthorized: Invalid API key',
            details: process.env.NODE_ENV === 'development' 
              ? 'Check your NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local' 
              : undefined
          },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'Unauthorized', details: userError.message },
        { status: 401 }
      )
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: No user found' }, { status: 401 })
    }

    // Get user profile with country and children
    // Try to get all available columns (some may not exist yet)
    let profile: any = null
    let countryName = null
    let visaStatus = null
    let childrenAges: number[] = []
    let municipalityName: string | null = null

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileError) {
        // If profile doesn't exist or has an error, continue with null values
        console.log('Profile query result:', { 
          error: profileError.code, 
          message: profileError.message,
          hint: profileError.hint 
        })
        profile = null
      } else {
        profile = profileData
      }

      // Get country information if available
      // Check if country_of_origin_id exists in profile
      if (profile && profile.country_of_origin_id) {
        try {
          const { data: country, error: countryError } = await supabase
            .from('countries')
            .select('name_en, visa_status')
            .eq('id', profile.country_of_origin_id)
            .single()

          if (countryError) {
            console.log('Error fetching country from countries table:', countryError)
            // Fallback to country text field if exists
            if (profile?.country) {
              countryName = profile.country
            }
          } else if (country) {
            countryName = country.name_en
            visaStatus = country.visa_status
          }
        } catch (countryError: any) {
          console.log('Exception fetching country:', countryError?.message || countryError)
          // Fallback to country text field if exists
          if (profile?.country) {
            countryName = profile.country
          }
        }
      } else if (profile?.country) {
        // Fallback: use country text field if country_of_origin_id doesn't exist
        countryName = profile.country
      }

      // Parse children ages (stored as JSON string or array)
      if (profile && profile.children_ages) {
        try {
          const parsed = typeof profile.children_ages === 'string' 
            ? JSON.parse(profile.children_ages) 
            : profile.children_ages
          childrenAges = Array.isArray(parsed) 
            ? parsed.filter((age: any) => age && age > 0).map((age: any) => Number(age))
            : []
        } catch {
          childrenAges = []
        }
      }

      // Get municipality name from profile
      if (profile) {
        // Try different possible field names
        municipalityName = profile.municipality || profile.city || profile.gemeinde || null
      }
    } catch (error: any) {
      console.error('Error processing profile data:', error?.message || error)
      // Continue with null values - API will still work but without user-specific data
    }

    // Task-specific data
    let goal = ''
    let infobox: any = null
    let resources: any[] = []

    switch (taskId) {
      case 1: {
        // Secure residence permit / visa
        goal = 'Make sure your legal right to stay in Switzerland is secured.'

        if (!countryName) {
          // No country provided
          infobox = {
            type: 'no_country',
            message:
              "You haven't shared your country of origin with us, therefore we cannot offer you tailored information in regards to this topic.\n\nWould you like to complete your profile, so you get the most out of your experience on Village?",
          }
        } else if (visaStatus === 'exempt') {
          // Visa-exempt (e.g., USA, Canada, Australia)
          infobox = {
            type: 'visa_exempt',
            country_name: countryName,
            faqs: [
              {
                question: 'Do I need a visa to enter Switzerland?',
                answer:
                  "You may enter without a visa for up to 90 days as a tourist, but you'll need a residence permit (L or B) to live or work.\n\nL-permit: short-term (usually under 1 year).\nB-permit: long-term (1+ years).",
              },
              {
                question: 'Who applies for the permit?',
                answer: 'Your Swiss employer must apply for this permit before you start work.',
              },
              {
                question: 'When and where do I register?',
                answer:
                  'Once approved, you can enter Switzerland visa-free and must register at your Gemeinde (municipality) within 14 days (see task 2).',
              },
            ],
          }
        } else if (visaStatus === 'required') {
          // Visa-required (e.g., India, China, Brazil)
          infobox = {
            type: 'visa_required',
            country_name: countryName,
            faqs: [
              {
                question: 'Do I need a visa to enter Switzerland?',
                answer:
                  "Yes. You'll need a D visa issued by the Swiss embassy/consulate in your home country.",
              },
              {
                question: 'Who applies for the permit?',
                answer:
                  'Your Swiss employer must apply on your behalf for a D visa before you move to Switzerland.',
              },
              {
                question: 'When and where do I register?',
                answer:
                  'Once you have received your D visa, you are allowed to enter Switzerland to take up residence and employment.\nYou must then register at your Gemeinde (municipality) within 14 days of your arrival (see task 2).',
              },
            ],
          }
        } else {
          // EU/EFTA or unknown - show generic info
          infobox = {
            type: 'eu_efta',
            country_name: countryName,
            message:
              "Good news! As an EU/EFTA citizen, you don't need a visa or residence permit to enter Switzerland. However, you must still register at your Gemeinde within 14 days.\n\n→ Next Step: Task 2 - Register at Gemeinde",
          }
        }

        resources = [
          { type: 'faq', title: 'FAQs / Good to Know', expanded: false },
        ]
        break
      }

      case 2: {
        // Register at the Gemeinde (municipality)
        goal = 'Make your residence official within 14 days of arrival'

        infobox = {
          type: 'gemeinde_registration',
          country_name: countryName || 'your country',
          municipality_name: municipalityName,
          faqs: [
            {
              question: 'Why do I need to register?',
              answer:
                'Registering your residence within 14 days of arrival at your local Gemeinde (municipality) is legally required and unlocks access to key services such as health insurance, school enrollment and opening a Swiss bank account.',
            },
            {
              question: 'Where do I go to register?',
              answer:
                'You register in person at your Gemeinde office.\nSome municipalities allow address changes online (via eUmzugCH), but first-time arrivals from abroad must appear in person.',
              show_opening_hours: true, // Flag to show opening hours after this FAQ
            },
            {
              question: 'What type of permit will I get?',
              answer:
                'You will usually receive an L permit (short-term) or B permit (longer-term) depending on your work contract duration.',
            },
          ],
        }

        resources = [
          { type: 'faq', title: 'FAQs / Good to Know', expanded: false },
          { type: 'documents', title: 'Documents you need', expanded: false },
          { type: 'pdf', title: 'Translate & Pre-fill a PDF', expanded: false },
        ]
        break
      }

      case 3: {
        // Find a place that fits your needs
        goal = 'The first step to building a home is finding a place that fits your needs.'

        infobox = {
          type: 'housing',
          faqs: [
            {
              question: 'How do I find apartments in Switzerland?',
              answer:
                'Most listings appear on large online portals like Flatfox, Homegate, ImmoScout24, Comparis, and local Facebook groups.\nA popular paid newsletter that offers listings before they hit the open market is immomailing.',
            },
            {
              question: 'Should I go through a real estate agency?',
              answer:
                'Most apartments in Switzerland are managed by property agencies (Verwaltungen) on behalf of owners. Applying directly through these agencies or via official platforms (like Homegate, ImmoScout24, Comparis, Flatfox) is the usual way to go and will be free.\n\nBe careful with third-party "apartment-finding" or "relocation" companies that target foreigners. They often charge high fees and can\'t guarantee that you\'ll get a place.\n\n⚠️ Also, be aware that:\n> Viewings are free.\n> You should never make any payments before signing a rental contract.\n> If someone offers to "secure an apartment for you" for a fee, it could be a scam.',
            },
            {
              question: 'How do I filter for size in Switzerland?',
              answer:
                'Apartments are usually listed by room count (e.g., 2.5 rooms = 1 bedroom + living room + small dining area. Kitchen and bathrooms are not counted).',
            },
            {
              question: 'What should I prepare before applying?',
              answer:
                'To apply for an apartment in Switzerland, you\'ll usually need to send an application dossier (rental file).\n\nTypical documents include:\n> copy of passport or ID\n> Swiss residence permit (if already issued; otherwise visa approval or confirmation letter)\n> Debt-register extract (Betreibungsauszug, if available; otherwise an employer letter and a clean credit report)\n> References from former rental agencies / property owners and your employer\n> Cover letter (Motivationsschreiben)\n> potentially a form given out at the viewing\n\n→ Use our tool to build your perfect application dossier!',
            },
            {
              question: 'What does "Kaution" mean?',
              answer:
                '"Kaution" is your rental deposit. It\'s usually 1 to 3 months\' rent, held as security for the landlord.\n\nYou can either:\n> Open a rental deposit account (Mietkautionskonto) at a Swiss bank, or\n> Use a rental deposit insurance ("Kautionsversicherung").',
            },
            {
              question: 'Should I use rental deposit insurance instead of paying a deposit?',
              answer:
                'Be cautious. These insurances (e.g. SwissCaution, FirstCaution, etc.) let you skip the upfront payment, but they charge an annual premium. These fees are not refundable, and if the insurer pays the landlord for damages, you must reimburse that amount.\n\nOver time, they\'re usually more expensive than a regular deposit account.\n\nIf you can afford it, a traditional deposit account is usually the safer choice.',
            },
            {
              question: 'What\'s included in the rent and what\'s extra?',
              answer:
                'In Switzerland, rent usually consists of two parts:\n\n1) Net rent (Nettomiete): the base cost for using the apartment.\n2) Additional costs (Nebenkosten): utilities and services like heating, water, and building maintenance.\n\nBe aware that:\n> Nebenkosten may be included as a flat rate (pauschal) or billed separately (akonto) every few months or annually.\n> Electricity is almost always paid directly by the tenant to the local electricity provider.\n> Parking spaces (indoor or outdoor) are rented separately and listed as an extra line in the contract.',
            },
            {
              question: 'Things that might surprise you about Swiss apartments',
              answer:
                'These small details are part of everyday life in Switzerland and vary slightly by canton and building.\n\n> Most apartments include a cellar storage room (Keller), usually in the basement.\n> Laundry rooms are often shared and may have assigned time slots (Waschplan).\n> Pets and loud instruments aren\'t always allowed. Check your rental contract or ask before applying.\n> Move-in and move-out days are often fixed. Check your contract.\n> Sunday and public holiday moving is restricted under cantonal noise and labor laws. Professional movers aren\'t allowed to operate and neighbors could file a complaint for disturbance.\n> Quiet hours ("Ruhezeiten") are taken seriously. No laundry, drilling, or loud vacuuming between 10 p.m. and 6 a.m. or on Sundays.\n> You\'re expected to deep-clean before moving out. "Endreinigung" (final cleaning) standards are strict: ovens, blinds, and even window tracks must be spotless. Many people hire professional cleaners to avoid losing their deposit.',
            },
          ],
        }

        resources = [
          { type: 'faq', title: 'FAQs / Good to Know', expanded: false },
          { type: 'application', title: 'Build the perfect application dossier', expanded: false },
          { type: 'budget', title: 'Budget vs. Wishlist', expanded: false },
        ]
        break
      }

      case 4: {
        // Register your kids at school / kindergarten
        goal = 'Register for school/kindergarten'

        const hasChildren = childrenAges.length > 0
        const hasSchoolAgeChildren = childrenAges.some((age) => age >= 4 && age <= 15)

        if (!hasChildren) {
          infobox = {
            type: 'no_children',
            message:
              "You are seeing this task, because we don't know whether you have children. For a more tailored experience, please complete your profile.",
          }
        } else if (!hasSchoolAgeChildren) {
          infobox = {
            type: 'no_school_age',
            message:
              'Your children are not yet school-age (under 4) or have already completed compulsory education (over 15).',
          }
        } else {
          infobox = {
            type: 'school_registration',
            children_count: childrenAges.length,
            faqs: [
              {
                question: 'I have already registered our arrival at the Gemeinde (municipality). Do I need to register my child for school separately?',
                answer:
                  'Yes. Enrolling your child(ren) in the local school or kindergarten is a separate step from the Gemeinde registration. It does not happen automatically.',
              },
              {
                question: 'When is school mandatory?',
                answer:
                  'School attendance is compulsory from age 4–6 (varies by canton).\nKindergarten is mandatory in most cantons and lasts two years before primary school begins. (2 years before primary school).',
              },
              {
                question: 'Where will my child(ren) go to school?',
                answer:
                  'Public schools are assigned based on your home address (catchment area system). Your Gemeinde will tell you which school your child will attend and when the school year starts.',
              },
              {
                question: 'What about private or international schools?',
                answer:
                  'You\'re free to apply directly to private or international schools, but these charge tuition and have their own application processes and timelines.',
              },
              {
                question: 'How do I enroll my child?',
                answer:
                  'Most Gemeinden have an online form or a downloadable PDF for new residents.\nIn larger towns and cities, the process can be fully online; in smaller ones, you may need to download a form and submit it via email or in person.',
              },
              {
                question: '💡 Tip',
                answer:
                  'In many municipalities, the school administration (Schulverwaltung) automatically contacts new families after registration, but it\'s a good idea to be proactive, so you don\'t miss any deadlines.\n\nThis task is shown to you because your profile states that you have children between the ages of 4 and 15. If that is incorrect, you can change your information here: [change profile]',
              },
            ],
          }
        }

        resources = [
          { type: 'faq', title: 'FAQs / Good to Know', expanded: false },
          { type: 'documents', title: 'Documents you need', expanded: false },
          { type: 'pdf', title: 'Translate & Pre-fill a PDF', expanded: false },
        ]
        break
      }

      case 5: {
        // Receive residence permit card
        goal = 'Complete the last step to your Swiss residence permit.'

        infobox = {
          type: 'permit_card',
          faqs: [
            {
              question: 'What happens after I register at my Gemeinde (municipality)?',
              answer:
                'Once you register (see task 2), your details are automatically forwarded to the cantonal migration office.\nAbout 1-2 weeks later, you receive a letter by mail (signature required) with an appointment to collect biometric data (fingerprints + photo).\n\n💡 Tip: Keep your biometric appointment letter safe! You\'ll need it to attend the appointment and identify yourself.',
            },
            {
              question: 'How long does it take to get my residence permit card?',
              answer:
                'Once you\'ve been to your biometric data appointment, processing usually takes 2–8 weeks, depending on your canton.\nThe physical card (plastic ID) is produced by the federal authorities and sent to your Swiss address by registered post.',
            },
            {
              question: 'What happens if I miss the delivery?',
              answer:
                'If you miss the delivery, you\'ll receive a notice from the post office. You\'ll need to pick up the letter in person within a few days.',
            },
            {
              question: 'Do children also need to attend the biometric appointment?',
              answer:
                'Children receive their own permit card and are required to provide data at the appointment. Younger kids do not have to provide fingerprints.',
            },
            {
              question: 'What is the permit card used for?',
              answer:
                'This card is needed for many admin tasks (opening a Swiss bank account, renting long-term housing, some insurances, travelling within the Schengen area).',
            },
            {
              question: 'How much does it cost?',
              answer:
                'Fees usually range between CHF 60–150 per adult, depending on the canton and the permit type.',
            },
          ],
        }

        resources = [
          { type: 'faq', title: 'FAQs / Good to Know', expanded: false },
        ]
        break
      }
    }

    return NextResponse.json({
      task_id: taskId,
      goal,
      infobox,
      resources,
      user_data: {
        country_name: countryName,
        visa_status: visaStatus,
        children_ages: childrenAges,
        municipality_name: municipalityName,
      },
      municipality_info: municipalityName
        ? {
            name: municipalityName,
            // Info will be fetched separately via /api/municipality/[name]
            // to avoid blocking the main API call
          }
        : null,
    })
  } catch (error: any) {
    console.error('Error fetching task data:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
