/**
 * Document Classification Utility
 * Automatically detects document types and generates tags based on filename and content
 */

export interface DocumentClassification {
  type: string
  tags: string[]
  confidence: number
}

// Enhanced keyword patterns for document types
const documentTypePatterns = {
  passport: {
    keywords: [
      'passport', 'pass', 'reisepass', 'passeport', 'passaporto',
      'identity', 'id', 'ausweis', 'identité', 'carta_identità'
    ],
    tags: ['identity', 'travel', 'official'],
    confidence: 0.9
  },
  birth_certificate: {
    keywords: [
      'birth', 'geburt', 'naissance', 'nascita', 'certificate', 'cert',
      'urkunde', 'certificat', 'certificato', 'born', 'geboren'
    ],
    tags: ['civil_documents', 'birth', 'official', 'family'],
    confidence: 0.95
  },
  marriage_certificate: {
    keywords: [
      'marriage', 'married', 'wedding', 'heirat', 'ehe', 'mariage',
      'matrimonio', 'sposalizio', 'certificate', 'cert'
    ],
    tags: ['civil_documents', 'marriage', 'official', 'family'],
    confidence: 0.95
  },
  employment_contract: {
    keywords: [
      'employment', 'contract', 'arbeits', 'vertrag', 'contrat',
      'travail', 'contratto', 'lavoro', 'job', 'work', 'salary',
      'anstellung', 'stelle'
    ],
    tags: ['employment', 'work', 'contract', 'legal'],
    confidence: 0.85
  },
  rental_contract: {
    keywords: [
      'rental', 'rent', 'lease', 'miete', 'wohnung', 'apartment',
      'location', 'affitto', 'appartamento', 'housing', 'tenancy'
    ],
    tags: ['housing', 'rental', 'contract', 'legal'],
    confidence: 0.85
  },
  vaccination_record: {
    keywords: [
      'vaccination', 'vaccine', 'impf', 'vaccin', 'vaccinazione',
      'immunization', 'shot', 'covid', 'corona', 'health'
    ],
    tags: ['health', 'vaccination', 'medical', 'travel'],
    confidence: 0.9
  },
  residence_permit: {
    keywords: [
      'residence', 'permit', 'aufenthalt', 'bewilligung', 'permis',
      'séjour', 'permesso', 'soggiorno', 'visa', 'allow', 'authorization'
    ],
    tags: ['residence', 'permit', 'official', 'immigration'],
    confidence: 0.9
  },
  bank_documents: {
    keywords: [
      'bank', 'banking', 'account', 'statement', 'konto', 'banque',
      'compte', 'banca', 'conto', 'iban', 'swift', 'salary', 'wage'
    ],
    tags: ['banking', 'financial', 'account', 'money'],
    confidence: 0.8
  },
  insurance_documents: {
    keywords: [
      'insurance', 'versicherung', 'assurance', 'assicurazione',
      'coverage', 'policy', 'premium', 'claim', 'health_insurance',
      'liability', 'car_insurance'
    ],
    tags: ['insurance', 'coverage', 'policy', 'protection'],
    confidence: 0.8
  },
  school_documents: {
    keywords: [
      'school', 'university', 'education', 'schule', 'uni', 'université',
      'scuola', 'università', 'degree', 'diploma', 'transcript',
      'certificate', 'student', 'enrollment'
    ],
    tags: ['education', 'school', 'academic', 'certificate'],
    confidence: 0.8
  },
  tax_documents: {
    keywords: [
      'tax', 'steuer', 'impôt', 'tassa', 'return', 'declaration',
      'erklärung', 'déclaration', 'dichiarazione', 'income', 'revenue'
    ],
    tags: ['tax', 'financial', 'government', 'annual'],
    confidence: 0.85
  },
  medical_documents: {
    keywords: [
      'medical', 'health', 'doctor', 'hospital', 'medizin', 'arzt',
      'médical', 'santé', 'medico', 'salute', 'prescription', 'therapy'
    ],
    tags: ['medical', 'health', 'doctor', 'treatment'],
    confidence: 0.8
  }
}

// Additional tag patterns for more granular classification
const additionalTagPatterns = {
  urgent: ['urgent', 'important', 'asap', 'deadline', 'expires'],
  annual: ['annual', 'yearly', 'jahr', 'année', 'anno', '2024', '2025'],
  swiss: ['swiss', 'switzerland', 'schweiz', 'suisse', 'svizzera', 'ch'],
  german: ['german', 'germany', 'deutschland', 'deutsch', 'allemagne'],
  french: ['french', 'france', 'français', 'francese'],
  italian: ['italian', 'italy', 'italien', 'italiano', 'italia'],
  expired: ['expired', 'abgelaufen', 'expiré', 'scaduto'],
  valid: ['valid', 'gültig', 'valide', 'valido'],
  copy: ['copy', 'kopie', 'copie', 'copia'],
  original: ['original', 'original', 'originale'],
  scan: ['scan', 'scanned', 'gescannt', 'scanné', 'scansionato']
}

/**
 * Classify a document based on its filename and extracted text
 */
export function classifyDocument(fileName: string, extractedText?: string): DocumentClassification {
  const text = `${fileName} ${extractedText || ''}`.toLowerCase()

  let bestMatch = {
    type: 'other',
    tags: [] as string[],
    confidence: 0.5
  }

  // Check against document type patterns
  for (const [type, pattern] of Object.entries(documentTypePatterns)) {
    const matches = pattern.keywords.filter(keyword =>
      text.includes(keyword.toLowerCase())
    )

    if (matches.length > 0) {
      const confidence = Math.min(
        pattern.confidence * (matches.length / pattern.keywords.length) +
        (matches.length * 0.1),
        1.0
      )

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type,
          tags: [...pattern.tags],
          confidence
        }
      }
    }
  }

  // Add additional tags
  for (const [tag, keywords] of Object.entries(additionalTagPatterns)) {
    const hasMatch = keywords.some(keyword => text.includes(keyword.toLowerCase()))
    if (hasMatch && !bestMatch.tags.includes(tag)) {
      bestMatch.tags.push(tag)
    }
  }

  // Add year tags if found
  const yearMatch = text.match(/20\d{2}/)
  if (yearMatch) {
    bestMatch.tags.push(yearMatch[0])
  }

  // Add file type tag
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension && ['pdf', 'jpg', 'jpeg', 'png', 'heic'].includes(extension)) {
    bestMatch.tags.push(extension)
  }

  return bestMatch
}

/**
 * Generate smart tags based on common Swiss expat document needs
 */
export function generateSmartTags(fileName: string, extractedText?: string): string[] {
  const classification = classifyDocument(fileName, extractedText)

  // Add contextual tags based on classification
  const contextualTags: string[] = []

  if (classification.type === 'passport' || classification.type === 'residence_permit') {
    contextualTags.push('travel_documents', 'border_control')
  }

  if (classification.type === 'employment_contract' || classification.type === 'bank_documents') {
    contextualTags.push('work_permit_requirement')
  }

  if (classification.type === 'vaccination_record') {
    contextualTags.push('covid_certificate', 'health_requirements')
  }

  if (classification.type === 'rental_contract') {
    contextualTags.push('address_proof', 'residence_proof')
  }

  // Remove duplicates and return
  return Array.from(new Set([...classification.tags, ...contextualTags]))
}

/**
 * Get document type from classification
 */
export function getDocumentType(fileName: string, extractedText?: string): string {
  return classifyDocument(fileName, extractedText).type
}

/**
 * Get confidence score for classification
 */
export function getClassificationConfidence(fileName: string, extractedText?: string): number {
  return classifyDocument(fileName, extractedText).confidence
}