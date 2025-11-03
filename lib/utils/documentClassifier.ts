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
      'identity', 'id', 'ausweis', 'identité', 'carta_identità',
      'identitätskarte', 'carte d\'identité', 'carta d\'identità'
    ],
    tags: ['identity', 'travel'],
    confidence: 0.9
  },
  birth_certificate: {
    keywords: [
      'birth', 'geburt', 'naissance', 'nascita', 'certificate', 'cert',
      'urkunde', 'certificat', 'certificato', 'born', 'geboren',
      'geburtsurkunde', 'acte de naissance', 'atto di nascita'
    ],
    tags: ['identity', 'family'],
    confidence: 0.95
  },
  marriage_certificate: {
    keywords: [
      'marriage', 'married', 'wedding', 'heirat', 'ehe', 'mariage',
      'matrimonio', 'sposalizio', 'certificate', 'cert',
      'heiratsurkunde', 'acte de mariage', 'atto di matrimonio'
    ],
    tags: ['family', 'identity'],
    confidence: 0.95
  },
  employment_contract: {
    keywords: [
      'employment', 'contract', 'arbeits', 'vertrag', 'contrat',
      'travail', 'contratto', 'lavoro', 'job', 'work', 'salary',
      'anstellung', 'stelle', 'arbeitsvertrag', 'contrat de travail',
      'contratto di lavoro', 'lohn', 'gehalt', 'salaire'
    ],
    tags: ['work', 'contract'],
    confidence: 0.85
  },
  rental_contract: {
    keywords: [
      'rental', 'rent', 'lease', 'miete', 'wohnung', 'apartment',
      'location', 'affitto', 'appartamento', 'housing', 'tenancy',
      'mietvertrag', 'bail', 'contratto di affitto', 'miete', 'mieter',
      'vermieter', 'landlord', 'tenant'
    ],
    tags: ['housing', 'contract'],
    confidence: 0.85
  },
  vaccination_record: {
    keywords: [
      'vaccination', 'vaccine', 'impf', 'vaccin', 'vaccinazione',
      'immunization', 'shot', 'covid', 'corona', 'health',
      'impfpass', 'carnet de vaccination', 'libretto vaccinale',
      'vaccination card', 'impfung', 'vaccination record'
    ],
    tags: ['health'],
    confidence: 0.9
  },
  residence_permit: {
    keywords: [
      'residence', 'permit', 'aufenthalt', 'bewilligung', 'permis',
      'séjour', 'permesso', 'soggiorno', 'visa', 'allow', 'authorization',
      'aufenthaltstitel', 'permis de séjour', 'permesso di soggiorno',
      'permit b', 'permit l', 'permit c', 'niederlassungsbewilligung',
      'befristete aufenthaltsbewilligung'
    ],
    tags: ['legal', 'residence'],
    confidence: 0.9
  },
  bank_documents: {
    keywords: [
      'bank', 'banking', 'account', 'statement', 'konto', 'banque',
      'compte', 'banca', 'conto', 'iban', 'swift', 'salary', 'wage',
      'kontoauszug', 'relevé de compte', 'estratto conto', 'bank statement',
      'bankkonto', 'compte bancaire', 'conto bancario', 'bankauszug'
    ],
    tags: ['financial', 'bank'],
    confidence: 0.8
  },
  insurance_documents: {
    keywords: [
      'insurance', 'versicherung', 'assurance', 'assicurazione',
      'coverage', 'policy', 'premium', 'claim', 'health_insurance',
      'liability', 'car_insurance', 'krankenversicherung', 'assurance maladie',
      'assicurazione sanitaria', 'haftpflichtversicherung', 'assurance responsabilité'
    ],
    tags: ['health', 'insurance', 'financial'],
    confidence: 0.8
  },
  school_documents: {
    keywords: [
      'school', 'university', 'education', 'schule', 'uni', 'université',
      'scuola', 'università', 'degree', 'diploma', 'transcript',
      'certificate', 'student', 'enrollment', 'kindergarten', 'kita',
      'anmeldung', 'registration', 'schulanmeldung', 'inscription',
      'schüler', 'student', 'schulbescheinigung', 'zeugnis', 'noten',
      'report card', 'bulletin', 'matrikel', 'immatrikulation',
      'kindergarten anmeldung', 'schulanmeldung', 'inscription scolaire',
      'iscrizione scolastica'
    ],
    tags: ['education', 'school'],
    confidence: 0.9
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
 * Rule-based classification based on filename patterns and document characteristics
 * This is a deterministic classifier that uses clear rules and patterns
 */
function classifyByRules(fileName: string, extractedText?: string): DocumentClassification {
  const lowerFileName = fileName.toLowerCase()
  const lowerText = (extractedText || '').toLowerCase()
  const combinedText = `${lowerFileName} ${lowerText}`

  // Define clear rules with properties/characteristics for each document type
  // Format: { patterns: [...], requiredPatterns: [...], confidence: 0.0-1.0 }
  const rules = [
    {
      type: 'school_documents',
      patterns: ['anmeldung', 'kindergarten', 'schule', 'schulanmeldung', 'kita', 'education', 'schüler', 'student', 'inscription', 'school'],
      // If filename contains ANY of these patterns, it's very likely school_documents
      requiredPatterns: [], // No strict requirements
      confidence: 0.95,
      tags: ['education', 'school'],
      description: 'Contains school-related terms like Anmeldung, Kindergarten, Schule'
    },
    {
      type: 'passport',
      patterns: [
        // Filename patterns
        'passport', 'reisepass', 'passeport', 'passaporto', 'id card', 'ausweis', 
        'identitätskarte', 'carte d\'identité', 'carta d\'identità', 'identity card',
        // OCR text patterns (common in passport documents)
        'passport number', 'passport no', 'passeport numéro', 'passport nummer',
        'date of birth', 'geboren', 'born', 'naissance', 'nascita',
        'nationality', 'nationalité', 'nazionalità', 'nationalität',
        'date of expiry', 'expiry date', 'expires', 'gültig bis', 'valable jusqu\'au',
        'place of birth', 'geburtsort', 'lieu de naissance', 'luogo di nascita',
        'passport holder', 'inhaber', 'titulaire', 'titolare',
        'mrz', 'machine readable zone', // MRZ is specific to passports/IDs
        'authority', 'ausstellungsbehörde', 'autorité', 'autorità',
        'document type', 'type de document', 'tipo di documento',
      ],
      requiredPatterns: [],
      confidence: 0.9,
      tags: ['identity', 'travel'],
      description: 'Contains passport/ID terms or passport-specific fields (MRZ, passport number, etc.)'
    },
    {
      type: 'birth_certificate',
      patterns: ['birth', 'geburt', 'naissance', 'geburtsurkunde', 'acte de naissance', 'atto di nascita', 'born', 'geboren'],
      requiredPatterns: [],
      confidence: 0.95,
      tags: ['identity', 'family'],
      description: 'Contains birth certificate terms'
    },
    {
      type: 'marriage_certificate',
      patterns: ['marriage', 'married', 'heirat', 'heiratsurkunde', 'acte de mariage', 'atto di matrimonio', 'wedding', 'ehe'],
      requiredPatterns: [],
      confidence: 0.95,
      tags: ['family', 'identity'],
      description: 'Contains marriage certificate terms'
    },
    {
      type: 'employment_contract',
      patterns: ['arbeitsvertrag', 'employment contract', 'contrat de travail', 'contratto di lavoro', 'work contract', 'arbeits', 'anstellung'],
      requiredPatterns: [],
      confidence: 0.9,
      tags: ['work', 'contract'],
      description: 'Contains employment/work contract terms'
    },
    {
      type: 'rental_contract',
      patterns: ['mietvertrag', 'rental contract', 'bail', 'contratto di affitto', 'contrat de location', 'lease', 'miete', 'rental'],
      requiredPatterns: [],
      confidence: 0.9,
      tags: ['housing', 'contract'],
      description: 'Contains rental/housing contract terms'
    },
    {
      type: 'vaccination_record',
      patterns: ['vaccination', 'impfung', 'impfpass', 'vaccin', 'vaccination card', 'carnet de vaccination', 'vaccine', 'immunization'],
      requiredPatterns: [],
      confidence: 0.9,
      tags: ['health'],
      description: 'Contains vaccination/immunization terms'
    },
    {
      type: 'residence_permit',
      patterns: ['residence permit', 'aufenthaltstitel', 'permis de séjour', 'permesso di soggiorno', 'permit b', 'permit l', 'permit c', 'niederlassungsbewilligung'],
      requiredPatterns: [],
      confidence: 0.9,
      tags: ['legal', 'residence'],
      description: 'Contains residence permit terms'
    },
    {
      type: 'bank_documents',
      patterns: ['bank', 'bankkonto', 'kontoauszug', 'compte bancaire', 'conto bancario', 'bank statement', 'relevé de compte', 'banking', 'iban'],
      requiredPatterns: [],
      confidence: 0.8,
      tags: ['financial', 'bank'],
      description: 'Contains bank/account terms'
    },
    {
      type: 'insurance_documents',
      patterns: ['insurance', 'versicherung', 'assurance', 'assicurazione', 'krankenversicherung', 'assurance maladie', 'policy', 'coverage'],
      requiredPatterns: [],
      confidence: 0.8,
      tags: ['health', 'insurance', 'financial'],
      description: 'Contains insurance terms'
    },
  ]

  // Find best match based on rules
  let bestMatch = {
    type: 'other' as string,
    tags: [] as string[],
    confidence: 0.3
  }

  for (const rule of rules) {
    // Count how many patterns match in filename (higher priority)
    const fileNameMatches = rule.patterns.filter(pattern => lowerFileName.includes(pattern)).length
    // Count how many patterns match in content
    const contentMatches = rule.patterns.filter(pattern => lowerText.includes(pattern)).length
    
    // Calculate confidence based on matches
    // Filename matches are more important
    const totalMatches = fileNameMatches + contentMatches
    const filenameWeight = fileNameMatches * 0.6 // Filename is 60% weight
    const contentWeight = contentMatches * 0.4 // Content is 40% weight
    
    if (totalMatches > 0) {
      // Higher confidence if filename matches (more reliable)
      const confidence = Math.min(0.98, rule.confidence + (filenameWeight * 0.1) + (contentWeight * 0.05))
      
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type: rule.type,
          tags: [...rule.tags],
          confidence
        }
      }
    }
  }

  return bestMatch
}

/**
 * Classify a document based on its filename and extracted text
 * Uses rule-based classification first, then falls back to pattern matching
 */
export function classifyDocument(fileName: string, extractedText?: string): DocumentClassification {
  // FIRST: Use rule-based classification (deterministic, reliable)
  const ruleBased = classifyByRules(fileName, extractedText)
  
  // If rule-based found a match with high confidence, use it
  if (ruleBased.confidence >= 0.7) {
    return ruleBased
  }

  // FALLBACK: Use pattern-based classification (original method)
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

  // Use rule-based if it's better
  if (ruleBased.confidence > bestMatch.confidence) {
    return ruleBased
  }

  return bestMatch
}

  /**
   * Generate smart tags based on common Swiss expat document needs
   * Tags must match available tags in DocumentVault: identity, travel, family, work, contract, housing,
   * health, legal, residence, financial, education, bank, insurance, school, personal, official, other
   */
export function generateSmartTags(fileName: string, extractedText?: string): string[] {
  const classification = classifyDocument(fileName, extractedText)

  // Start with base tags from classification
  const tags: string[] = [...classification.tags]

  // Map classification types to appropriate tags from the available tag list
  const typeTagMap: Record<string, string[]> = {
    passport: ['identity', 'travel'],
    birth_certificate: ['identity', 'family'],
    marriage_certificate: ['family', 'identity'],
    employment_contract: ['work', 'contract'],
    rental_contract: ['housing', 'contract'],
    vaccination_record: ['health'],
    residence_permit: ['legal', 'residence'],
    bank_documents: ['financial', 'bank'],
    insurance_documents: ['health', 'insurance', 'financial'],
    school_documents: ['education', 'school'],
  }

  // Add type-specific tags if not already present
  const typeTags = typeTagMap[classification.type] || []
  typeTags.forEach(tag => {
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  })

  // Add 'official' tag for government/official documents
  const officialTypes = ['passport', 'birth_certificate', 'marriage_certificate', 'residence_permit']
  if (officialTypes.includes(classification.type) && !tags.includes('official')) {
    tags.push('official')
  }

  // Remove duplicates and filter to only include valid tags
  const validTags = [
    'identity', 'travel', 'family', 'work', 'contract', 'housing',
    'health', 'legal', 'residence', 'financial', 'education',
    'bank', 'insurance', 'school', 'personal', 'official', 'other'
  ]
  
  return Array.from(new Set(tags.filter(tag => validTags.includes(tag))))
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