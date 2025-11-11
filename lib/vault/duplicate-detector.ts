/**
 * Duplicate Detection Service
 * Detects similar documents to suggest linking as new versions
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

interface SimilarDocument {
  id: string
  file_name: string
  document_type: string | null
  extracted_text: string | null
  similarity_score: number
  match_type: 'filename' | 'text' | 'both'
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy filename matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + 1   // substitution
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1.0
  return 1 - (distance / maxLength)
}

/**
 * Calculate Jaccard similarity between two text strings
 * Used for text content similarity
 */
function jaccardSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0

  // Normalize and tokenize
  const normalize = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out short words

  const tokens1 = new Set(normalize(text1))
  const tokens2 = new Set(normalize(text2))

  if (tokens1.size === 0 && tokens2.size === 0) return 1
  if (tokens1.size === 0 || tokens2.size === 0) return 0

  // Calculate intersection and union
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])

  return intersection.size / union.size
}

/**
 * Calculate SHA256 hash of file buffer
 */
function calculateFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Check for exact duplicate before upload
 * Only blocks if the file hash is identical (100% same content)
 * Returns the duplicate document if found, null otherwise
 */
export async function checkExactDuplicate(
  supabase: SupabaseClient,
  userId: string,
  fileName: string,
  fileSize: number,
  fileBuffer?: Buffer
): Promise<{ id: string; file_name: string; file_size: number; file_hash?: string } | null> {
  try {
    // We need the file buffer to calculate hash - without it, we can't reliably detect duplicates
    if (!fileBuffer) {
      console.warn('⚠️ No file buffer provided - cannot check for exact duplicates')
      return null // Don't block upload if we can't check
    }

    const newFileHash = calculateFileHash(fileBuffer)

    // Check for documents with the same hash (exact duplicate)
    const { data: hashMatches, error: hashError } = await supabase
      .from('documents')
      .select('id, file_name, file_size, file_hash')
      .eq('user_id', userId)
      .eq('file_hash', newFileHash)
      .is('deleted_at', null)

    if (hashError) {
      console.error('❌ Error checking for duplicate by hash:', hashError)
      return null // Don't block upload if check fails
    }

    if (hashMatches && hashMatches.length > 0) {
      // Found exact duplicate by hash (same content)
      console.log(`🔍 Found exact duplicate by hash: ${hashMatches[0].id}`)
      return {
        id: hashMatches[0].id,
        file_name: hashMatches[0].file_name,
        file_size: hashMatches[0].file_size,
        file_hash: hashMatches[0].file_hash,
      }
    }

    // No exact duplicate found - allow upload
    // Even if filename is the same, different hash means different content (e.g., filled form)
    // This can be handled as a new version if needed
    return null
  } catch (error) {
    console.error('❌ Error in exact duplicate check:', error)
    return null // Don't block upload if check fails
  }
}

/**
 * Detect similar documents for a new upload
 */
export async function detectSimilarDocuments(
  supabase: SupabaseClient,
  userId: string,
  fileName: string,
  extractedText: string | null,
  documentType: string | null,
  minSimilarity: number = 0.8
): Promise<SimilarDocument[]> {
  try {
    const similarDocuments: SimilarDocument[] = []

    // Get all user's documents (excluding deleted)
    const { data: userDocuments, error } = await supabase
      .from('documents')
      .select('id, file_name, document_type, extracted_text')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('extracted_text', 'is', null) // Only documents with extracted text

    if (error) {
      console.error('❌ Error fetching user documents for duplicate detection:', error)
      return []
    }

    if (!userDocuments || userDocuments.length === 0) {
      return []
    }

    // Check filename similarity
    for (const doc of userDocuments) {
      const filenameSimilarity = calculateSimilarity(fileName, doc.file_name)
      
      // Check text similarity if both have extracted text
      let textSimilarity = 0
      if (extractedText && doc.extracted_text) {
        // Use first 5000 chars for performance
        const text1 = extractedText.substring(0, 5000)
        const text2 = doc.extracted_text.substring(0, 5000)
        textSimilarity = jaccardSimilarity(text1, text2)
      }

      // Determine match type and overall similarity
      let overallSimilarity = 0
      let matchType: 'filename' | 'text' | 'both' = 'filename'

      if (filenameSimilarity >= minSimilarity && textSimilarity >= minSimilarity) {
        overallSimilarity = (filenameSimilarity + textSimilarity) / 2
        matchType = 'both'
      } else if (textSimilarity >= minSimilarity) {
        overallSimilarity = textSimilarity
        matchType = 'text'
      } else if (filenameSimilarity >= minSimilarity) {
        overallSimilarity = filenameSimilarity
        matchType = 'filename'
      }

      // Only include if overall similarity meets threshold
      if (overallSimilarity >= minSimilarity) {
        similarDocuments.push({
          id: doc.id,
          file_name: doc.file_name,
          document_type: doc.document_type,
          extracted_text: doc.extracted_text,
          similarity_score: overallSimilarity,
          match_type: matchType,
        })
      }
    }

    // Sort by similarity score (highest first)
    similarDocuments.sort((a, b) => b.similarity_score - a.similarity_score)

    // Return top 3 most similar
    return similarDocuments.slice(0, 3)
  } catch (error) {
    console.error('❌ Error in duplicate detection:', error)
    return []
  }
}

