/**
 * Requirement-Based Document Matching System
 * 
 * This system provides dynamic, requirement-specific document matching
 * instead of just type-based matching. Each requirement gets a unique identifier,
 * and documents track which specific requirement they fulfill.
 */

/**
 * Generate a unique requirement ID from requirement text
 * Uses a hash-based approach for consistency
 */
export function getRequirementId(requirementText: string): string {
  // Normalize text for consistent hashing
  const normalized = requirementText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
  
  // Simple hash function (for uniqueness, not cryptographic security)
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Return as positive number string
  return Math.abs(hash).toString()
}

/**
 * Generate a stable requirement key from requirement text
 * This is used for consistent matching across tasks
 */
export function getRequirementKey(requirementText: string): string {
  // Normalize and create a key
  return requirementText
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')
    .substring(0, 100) // Limit length
}

/**
 * Check if a document fulfills a specific requirement
 * This is more precise than type-based matching
 * 
 * @param document - Document from vault
 * @param requirementText - The requirement text to check
 * @returns true if document fulfills this specific requirement
 */
export function documentFulfillsRequirement(
  document: { fulfilled_requirement?: string | null, document_type?: string | null },
  requirementText: string
): boolean {
  // First check: Exact requirement match (most precise)
  if (document.fulfilled_requirement) {
    const docReqKey = getRequirementKey(document.fulfilled_requirement)
    const checkReqKey = getRequirementKey(requirementText)
    
    // Exact match
    if (docReqKey === checkReqKey) {
      return true
    }
    
    // Similarity check (for slight variations in text)
    // Use Levenshtein distance or simple substring matching
    const similarity = calculateSimilarity(
      document.fulfilled_requirement.toLowerCase(),
      requirementText.toLowerCase()
    )
    
    // If similarity > 0.9, consider it a match
    if (similarity > 0.9) {
      return true
    }
  }
  
  // Fallback: Type-based matching (for backward compatibility)
  // Only use if no fulfilled_requirement is set
  if (!document.fulfilled_requirement && document.document_type) {
    return false // Don't auto-match by type alone - too imprecise
  }
  
  return false
}

/**
 * Simple similarity calculation using word overlap
 * Returns a value between 0 and 1
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  if (union.size === 0) return 0
  return intersection.size / union.size
}

/**
 * Get all requirements that a document could potentially fulfill
 * Returns an array of requirement texts that match this document type
 */
export function getPotentialRequirements(
  documentType: string,
  allRequirements: string[]
): string[] {
  const docType = documentType.toLowerCase()
  
  return allRequirements.filter(req => {
    const reqLower = req.toLowerCase()
    
    // Type-specific matching
    if (docType === 'passport' || docType === 'passport_photos') {
      // Passport documents can fulfill passport/ID requirements
      if (reqLower.includes('passport/id') || reqLower.includes('passport or id')) {
        return docType === 'passport'
      }
      // Passport photos fulfill passport photos requirements
      if (reqLower.includes('passport photo')) {
        return docType === 'passport_photos'
      }
      return false
    }
    
    // Generic matching based on document type keywords
    const typeKeywords: Record<string, string[]> = {
      'employment_contract': ['employment contract'],
      'rental_contract': ['rental contract', 'lease agreement', 'landlord'],
      'birth_certificate': ['birth certificate'],
      'marriage_certificate': ['marriage certificate', 'family book'],
      'divorce_certificate': ['divorce certificate'],
      'residence_permit': ['residence permit'],
      'vaccination_record': ['vaccination'],
      'insurance_documents': ['health insurance', 'insurance'],
    }
    
    const keywords = typeKeywords[docType] || []
    return keywords.some(keyword => reqLower.includes(keyword))
  })
}

