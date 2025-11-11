/**
 * PDF Text Extraction Service
 * Extracts text content from PDF documents for Chat with Documents feature
 */

import pdfParse from 'pdf-parse'

export interface PDFExtractionResult {
  text: string
  pages: PageContent[]
  metadata: {
    totalPages: number
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
  }
}

export interface PageContent {
  pageNumber: number
  text: string
  wordCount: number
}

/**
 * Extract text content from PDF buffer
 * @param buffer - PDF file buffer
 * @returns Extracted text with page breakdown and metadata
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    const data = await pdfParse(buffer)

    // Split text by page breaks if available, otherwise estimate pages
    const pages = estimatePages(data.text, data.numpages)

    const result: PDFExtractionResult = {
      text: data.text,
      pages,
      metadata: {
        totalPages: data.numpages,
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        subject: data.info?.Subject || undefined,
        creator: data.info?.Creator || undefined,
        producer: data.info?.Producer || undefined,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      }
    }

    return result
  } catch (error) {
    console.error('PDF extraction failed:', error)
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Estimate page content when page breaks are not available
 * @param text - Full PDF text
 * @param totalPages - Number of pages
 * @returns Array of estimated page content
 */
function estimatePages(text: string, totalPages: number): PageContent[] {
  if (!text) {
    return []
  }

  // Try to split by common page break patterns
  let pageTexts = text.split(/\f|\n\s*(?:Page\s+\d+|\d+\s*\/\s*\d+)\s*\n/i)

  // If we don't get the right number of pages, fall back to estimated splitting
  if (pageTexts.length !== totalPages) {
    const avgCharsPerPage = text.length / totalPages
    pageTexts = []

    for (let i = 0; i < totalPages; i++) {
      const start = Math.floor(i * avgCharsPerPage)
      const end = Math.floor((i + 1) * avgCharsPerPage)

      // Find natural break points near the estimated boundaries
      let actualEnd = end
      if (i < totalPages - 1 && end < text.length) {
        // Look for paragraph breaks near the split point
        const searchWindow = Math.min(200, avgCharsPerPage * 0.1)
        const windowStart = Math.max(start, end - searchWindow)
        const windowEnd = Math.min(text.length, end + searchWindow)

        const paragraphBreaks = []
        for (let j = windowStart; j < windowEnd; j++) {
          if (text.substring(j, j + 2) === '\n\n') {
            paragraphBreaks.push(j)
          }
        }

        if (paragraphBreaks.length > 0) {
          // Find the break closest to our estimated split
          actualEnd = paragraphBreaks.reduce((prev, curr) =>
            Math.abs(curr - end) < Math.abs(prev - end) ? curr : prev
          )
        }
      }

      const pageText = text.substring(start, actualEnd).trim()
      pageTexts.push(pageText)
    }
  }

  // Convert to PageContent objects
  return pageTexts.map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText.trim(),
    wordCount: pageText.trim().split(/\s+/).length
  })).filter(page => page.text.length > 0)
}

/**
 * Extract text for specific pages
 * @param buffer - PDF file buffer
 * @param pageNumbers - Array of page numbers to extract (1-based)
 * @returns Text content for specified pages
 */
export async function extractTextFromPages(
  buffer: Buffer,
  pageNumbers: number[]
): Promise<{ pageNumber: number; text: string }[]> {
  const fullExtraction = await extractTextFromPDF(buffer)

  return pageNumbers
    .map(pageNum => {
      const page = fullExtraction.pages.find(p => p.pageNumber === pageNum)
      return page ? { pageNumber: pageNum, text: page.text } : null
    })
    .filter((page): page is { pageNumber: number; text: string } => page !== null)
}

/**
 * Search for text within PDF content
 * @param extraction - PDF extraction result
 * @param searchTerm - Term to search for
 * @param options - Search options
 * @returns Search results with page references
 */
export function searchInPDF(
  extraction: PDFExtractionResult,
  searchTerm: string,
  options: {
    caseSensitive?: boolean
    wholeWord?: boolean
    contextLength?: number
  } = {}
): Array<{
  pageNumber: number
  text: string
  contextBefore: string
  contextAfter: string
  position: number
}> {
  const {
    caseSensitive = false,
    wholeWord = false,
    contextLength = 100
  } = options

  const results: Array<{
    pageNumber: number
    text: string
    contextBefore: string
    contextAfter: string
    position: number
  }> = []

  const searchPattern = wholeWord
    ? new RegExp(`\\b${searchTerm}\\b`, caseSensitive ? 'g' : 'gi')
    : new RegExp(searchTerm, caseSensitive ? 'g' : 'gi')

  for (const page of extraction.pages) {
    let match
    while ((match = searchPattern.exec(page.text)) !== null) {
      const position = match.index
      const contextStart = Math.max(0, position - contextLength)
      const contextEnd = Math.min(page.text.length, position + match[0].length + contextLength)

      results.push({
        pageNumber: page.pageNumber,
        text: match[0],
        contextBefore: page.text.substring(contextStart, position),
        contextAfter: page.text.substring(position + match[0].length, contextEnd),
        position
      })
    }
  }

  return results
}

/**
 * Get document summary statistics
 * @param extraction - PDF extraction result
 * @returns Document statistics
 */
export function getDocumentStats(extraction: PDFExtractionResult): {
  totalPages: number
  totalWords: number
  totalCharacters: number
  averageWordsPerPage: number
  language?: string
  estimatedReadingTime: number // in minutes
} {
  const totalWords = extraction.pages.reduce((sum, page) => sum + page.wordCount, 0)
  const totalCharacters = extraction.text.length
  const averageWordsPerPage = totalWords / extraction.metadata.totalPages

  // Estimate reading time (200 words per minute average)
  const estimatedReadingTime = Math.ceil(totalWords / 200)

  // Simple language detection (very basic)
  let language: string | undefined
  const germanWords = ['der', 'die', 'das', 'und', 'oder', 'mit', 'für', 'von', 'zu', 'auf', 'bei', 'nach', 'über']
  const englishWords = ['the', 'and', 'or', 'with', 'for', 'from', 'to', 'on', 'at', 'after', 'over']
  const frenchWords = ['le', 'la', 'les', 'et', 'ou', 'avec', 'pour', 'de', 'du', 'sur', 'après']

  const lowercaseText = extraction.text.toLowerCase()
  const germanCount = germanWords.filter(word => lowercaseText.includes(word)).length
  const englishCount = englishWords.filter(word => lowercaseText.includes(word)).length
  const frenchCount = frenchWords.filter(word => lowercaseText.includes(word)).length

  if (germanCount > englishCount && germanCount > frenchCount) {
    language = 'de'
  } else if (frenchCount > englishCount && frenchCount > germanCount) {
    language = 'fr'
  } else if (englishCount > 0) {
    language = 'en'
  }

  return {
    totalPages: extraction.metadata.totalPages,
    totalWords,
    totalCharacters,
    averageWordsPerPage,
    language,
    estimatedReadingTime
  }
}