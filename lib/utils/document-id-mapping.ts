/**
 * Document ID to Type Mapping
 * 
 * GLOBAL ID SYSTEM: Each document TYPE has a fixed ID, regardless of task or position.
 * This ensures consistency: "Employment Contract" always has ID 3, even if it appears
 * in different tasks at different positions.
 */

export interface DocumentRequirement {
  id: number
  requirement: string
  document_type: string
}

/**
 * Global document type to ID mapping
 * Each document TYPE has ONE fixed ID that is used across all tasks
 * IDs are assigned based on document type, not task or position in list
 */
export const GLOBAL_DOCUMENT_TYPE_IDS: Record<string, number> = {
  // Residence Permit gets ID 1 (as per user requirement)
  'residence_permit': 1,
  
  // Core identity documents
  'passport': 2,
  
  // Contracts and agreements
  'employment_contract': 3,
  'rental_contract': 4,
  
  // Family documents
  'marriage_certificate': 5,
  'birth_certificate': 6,
  'divorce_certificate': 7,
  
  // Health and insurance
  'insurance_documents': 8,
  'vaccination_record': 9,
  
  // Financial and proof
  'bank_documents': 10,
  
  // Education
  'school_documents': 11,
  
  // Passport Photos (separate from passport/ID document)
  'passport_photos': 12,
  
  // Other
  'other': 99,
}

/**
 * Requirement text patterns to document type mapping
 * Used to determine the document type from requirement text
 */
const REQUIREMENT_TO_TYPE_MAP: Array<{
  patterns: string[]
  document_type: string
  priority?: number // Higher priority = checked first
}> = [
  // Residence Permit - HIGHEST PRIORITY (gets ID 1)
  // Must be checked BEFORE passport/ID patterns to avoid false matches
  { patterns: ['residence permit application', 'residence permit application confirmation', 'residence permit'], document_type: 'residence_permit', priority: 100 },
  
  // Passport Photos - HIGH PRIORITY (gets ID 12)
  // Must be checked BEFORE generic passport patterns to avoid false matches
  { patterns: ['passport photos', 'passport photo', 'passport photograph'], document_type: 'passport_photos', priority: 90 },
  
  // Passport/ID - checked after residence permit and passport photos
  { patterns: ['passport/id', 'passport or id', 'passport', 'id for', 'child\'s passport', 'valid passport'], document_type: 'passport' },
  
  // Employment Contract
  { patterns: ['employment contract', 'employment', 'proof of financial means', 'contract'], document_type: 'employment_contract' },
  
  // Rental Contract
  { patterns: ['rental contract', 'lease agreement', 'landlord confirmation', 'landlord', 'proof of address'], document_type: 'rental_contract' },
  
  // Marriage Certificate / Family Book
  { patterns: ['family book', 'marriage certificate', 'marriage'], document_type: 'marriage_certificate' },
  
  // Birth Certificate
  { patterns: ['birth certificate', 'birth'], document_type: 'birth_certificate' },
  
  // Divorce Certificate
  { patterns: ['divorce certificate', 'divorce'], document_type: 'divorce_certificate' },
  
  // Insurance
  { patterns: ['health insurance', 'proof of health insurance', 'insurance'], document_type: 'insurance_documents' },
  
  // Vaccination
  { patterns: ['vaccination record', 'vaccination', 'vaccination'], document_type: 'vaccination_record' },
  
  // Bank Documents
  { patterns: ['utility bill', 'bank statement', 'bank'], document_type: 'bank_documents' },
  
  // School Documents
  { patterns: ['school', 'education'], document_type: 'school_documents' },
]

/**
 * Get document type from requirement text
 */
function getDocumentTypeFromRequirement(requirement: string): string {
  const lower = requirement.toLowerCase().trim()
  
  // Sort by priority (higher first), then by pattern length (longer/more specific first)
  const sortedMappings = [...REQUIREMENT_TO_TYPE_MAP].sort((a, b) => {
    // First sort by priority (higher priority first)
    const priorityA = a.priority || 0
    const priorityB = b.priority || 0
    if (priorityA !== priorityB) return priorityB - priorityA
    
    // Then sort by longest pattern (more specific first)
    const maxPatternA = Math.max(...a.patterns.map(p => p.length))
    const maxPatternB = Math.max(...b.patterns.map(p => p.length))
    return maxPatternB - maxPatternA
  })
  
  // Find matching pattern (check in priority order)
  for (const mapping of sortedMappings) {
    for (const pattern of mapping.patterns) {
      if (lower.includes(pattern)) {
        // Special cases to avoid false matches
        if (pattern === 'insurance' && lower.includes('vaccination')) continue
        if (pattern === 'contract' && lower.includes('rental') && !lower.includes('employment')) continue
        if (pattern === 'passport' && lower.includes('residence permit')) continue // Don't match passport if it's actually residence permit
        return mapping.document_type
      }
    }
  }
  
  return 'other'
}

/**
 * Get global document ID by requirement text
 * Returns a consistent ID based on the document TYPE, not task or position
 */
export function getDocumentIdByRequirement(requirement: string): number {
  const documentType = getDocumentTypeFromRequirement(requirement)
  return GLOBAL_DOCUMENT_TYPE_IDS[documentType] || 99
}

/**
 * Get document type by global ID
 */
export function getDocumentTypeById(id: number): string | null {
  for (const [docType, docId] of Object.entries(GLOBAL_DOCUMENT_TYPE_IDS)) {
    if (docId === id) {
      return docType
    }
  }
  return null
}

/**
 * Get document requirement object by ID (for display purposes)
 */
export function getDocumentRequirementById(id: number): DocumentRequirement | null {
  const docType = getDocumentTypeById(id)
  if (!docType) return null
  
  // Create a display name from the document type
  const displayNames: Record<string, string> = {
    'passport': 'Passport/ID',
    'passport_photos': 'Passport Photos',
    'residence_permit': 'Residence Permit',
    'employment_contract': 'Employment Contract',
    'rental_contract': 'Rental Contract',
    'marriage_certificate': 'Marriage Certificate',
    'birth_certificate': 'Birth Certificate',
    'divorce_certificate': 'Divorce Certificate',
    'insurance_documents': 'Insurance Documents',
    'vaccination_record': 'Vaccination Record',
    'bank_documents': 'Bank Documents',
    'school_documents': 'School Documents',
    'other': 'Other Documents',
  }
  
  return {
    id,
    requirement: displayNames[docType] || docType,
    document_type: docType,
  }
}

/**
 * Get all document requirements for a specific task (for backward compatibility)
 * Note: This is now primarily for reference, as IDs are global
 */
export function getDocumentRequirementsForTask(taskId: number): DocumentRequirement[] {
  // Return empty array - we now use global IDs based on requirement text
  return []
}


