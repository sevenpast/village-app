/**
 * APDF.io Service for PDF Text Extraction
 * https://apdf.io - Free PDF processing API
 */

interface ApdfResponse {
  success: boolean
  data?: {
    total_pages: number
    total_characters: number
    pages: Array<{
      page_number: number
      content: string
      character_count: number
    }>
  }
  error?: string
  message?: string
}

export class ApdfService {
  private apiKey: string
  private baseUrl = 'https://apdf.io/api'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APDF_IO_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('APDF.io API key not configured')
    }
  }

  /**
   * Extract text from PDF using apdf.io API
   *
   * Uses direct file upload to apdf.io API
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('🌐 Sending PDF directly to APDF.io API...')

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'document.pdf')

      // Call apdf.io API with direct file upload
      const response = await fetch(`${this.baseUrl}/pdf/content/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ APDF.io API error (${response.status}):`, errorText)
        throw new Error(`APDF.io API error: ${response.status} ${response.statusText}`)
      }

      const result: ApdfResponse = await response.json()

      if (!result.success || !result.data) {
        console.error('❌ APDF.io extraction failed:', result.error || result.message)
        throw new Error(result.error || result.message || 'Failed to extract text')
      }

      // Combine text from all pages
      const extractedText = result.data.pages
        .map(page => page.content)
        .join('\n\n')

      console.log(`✅ APDF.io extracted ${result.data.total_characters} characters from ${result.data.total_pages} pages`)

      return extractedText
    } catch (error) {
      console.error('❌ APDF.io extraction error:', error)
      throw error
    }
  }


  /**
   * Check if apdf.io service is available
   */
  static isAvailable(): boolean {
    return !!process.env.APDF_IO_API_KEY
  }
}