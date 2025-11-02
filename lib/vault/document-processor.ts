/**
 * Document Processor
 * Handles PDF parsing, OCR, and AI classification for uploaded documents
 */

import pdf from 'pdf-parse'
import Tesseract from 'tesseract.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import sharp from 'sharp'

export interface ProcessedDocument {
  extractedText: string
  documentType: string
  confidence: number
  tags: string[]
  extractedFields: Record<string, any>
  language: string
  requiresReview: boolean
  metadata: {
    pages?: number
    hasText?: boolean
    isImage?: boolean
  }
}

export class DocumentProcessor {
  private genAI: GoogleGenerativeAI | null = null

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    }
  }

  /**
   * Main processing pipeline: PDF → OCR → AI Classification
   */
  async processDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ProcessedDocument> {
    console.log(`📄 Processing document: ${fileName} (${mimeType})`)

    let extractedText = ''
    let metadata: ProcessedDocument['metadata'] = {}

    // Step 1: Try PDF text extraction first (fastest, free)
    if (mimeType === 'application/pdf') {
      try {
        const pdfData = await pdf(fileBuffer)
        extractedText = pdfData.text
        metadata = {
          pages: pdfData.numpages,
          hasText: extractedText.length > 50,
        }
        console.log(`✅ Extracted ${extractedText.length} chars from PDF (${pdfData.numpages} pages)`)
      } catch (error) {
        console.warn('⚠️ PDF parsing failed, will try OCR:', error)
      }
    }

    // Step 2: If PDF has no text or is an image, try OCR
    if (!extractedText || extractedText.length < 50 || mimeType.startsWith('image/')) {
      console.log('🔍 Performing OCR...')
      extractedText = await this.performOCR(fileBuffer, mimeType)
      metadata.isImage = true
    }

    // Step 3: AI Classification (if API key available)
    let classification = {
      documentType: 'other',
      confidence: 0.5,
      tags: [] as string[],
      extractedFields: {} as Record<string, any>,
      language: 'en',
      requiresReview: true,
    }

    if (this.genAI && extractedText.length > 20) {
      try {
        classification = await this.classifyWithAI(extractedText)
      } catch (error) {
        console.error('⚠️ AI classification failed, using fallback:', error)
        // Fallback to keyword-based classification
        classification = this.classifyWithKeywords(extractedText)
      }
    } else {
      // Fallback to keyword-based classification
      classification = this.classifyWithKeywords(extractedText)
    }

    return {
      extractedText,
      documentType: classification.documentType,
      confidence: classification.confidence,
      tags: classification.tags,
      extractedFields: classification.extractedFields,
      language: classification.language,
      requiresReview: classification.requiresReview,
      metadata,
    }
  }

  /**
   * Perform OCR using Tesseract.js
   */
  private async performOCR(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Convert to image format if needed
      let imageBuffer = buffer
      
      if (mimeType === 'application/pdf') {
        // Convert first page of PDF to image
        // Note: This requires pdf2pic or similar - simplified for now
        console.log('⚠️ PDF to image conversion not yet implemented, using first page extraction')
        // For now, return empty - would need pdf2pic or pdf-lib to extract page as image
        return ''
      }

      // Ensure image is in supported format (JPEG/PNG)
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        imageBuffer = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer()
      }

      // Run Tesseract OCR with Swiss languages
      const { data } = await Tesseract.recognize(imageBuffer, 'deu+fra+ita+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      return data.text
    } catch (error) {
      console.error('❌ OCR error:', error)
      return ''
    }
  }

  /**
   * AI Classification using Gemini
   */
  private async classifyWithAI(text: string): Promise<{
    documentType: string
    confidence: number
    tags: string[]
    extractedFields: Record<string, any>
    language: string
    requiresReview: boolean
  }> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured')
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
Analyze this Swiss document and extract information. Return ONLY valid JSON:

{
  "document_type": "passport" | "birth_certificate" | "employment_contract" | "rental_contract" | "marriage_certificate" | "vaccination_record" | "residence_permit" | "other",
  "confidence": 0.0-1.0,
  "tags": ["tag1", "tag2"],
  "extracted_fields": {
    "name": "...",
    "date_of_birth": "...",
    "passport_number": "...",
    "expiry_date": "..."
  },
  "language": "de" | "fr" | "it" | "en",
  "requires_review": true | false
}

Document text (first 4000 chars):
${text.substring(0, 4000)}
`

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const textResponse = response.text()

      // Parse JSON from response (might have markdown code blocks)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0])
        return {
          documentType: classification.document_type || 'other',
          confidence: classification.confidence || 0.5,
          tags: classification.tags || [],
          extractedFields: classification.extracted_fields || {},
          language: classification.language || 'en',
          requiresReview: classification.requires_review !== false,
        }
      }
    } catch (error) {
      console.error('❌ AI classification error:', error)
      throw error
    }

    // Fallback
    return this.classifyWithKeywords(text)
  }

  /**
   * Keyword-based classification (fallback, free)
   */
  private classifyWithKeywords(text: string): {
    documentType: string
    confidence: number
    tags: string[]
    extractedFields: Record<string, any>
    language: string
    requiresReview: boolean
  } {
    const lowerText = text.toLowerCase()

    // Document type patterns
    const patterns = {
      passport: {
        keywords: ['passport', 'reisepass', 'passeport', 'passaporto', 'passport number', 'passeport numéro'],
        confidence: 0.8,
        tags: ['identity', 'travel'],
      },
      birth_certificate: {
        keywords: ['birth certificate', 'geburtsurkunde', 'acte de naissance', 'atto di nascita', 'born', 'geboren'],
        confidence: 0.75,
        tags: ['identity', 'family'],
      },
      employment_contract: {
        keywords: ['employment contract', 'arbeitsvertrag', 'contrat de travail', 'contratto di lavoro', 'employee', 'employer'],
        confidence: 0.8,
        tags: ['work', 'contract'],
      },
      rental_contract: {
        keywords: ['rental contract', 'mietvertrag', 'bail', 'contratto di affitto', 'lease', 'tenant', 'landlord'],
        confidence: 0.8,
        tags: ['housing', 'contract'],
      },
      marriage_certificate: {
        keywords: ['marriage certificate', 'heiratsurkunde', 'acte de mariage', 'atto di matrimonio', 'married', 'verheiratet'],
        confidence: 0.75,
        tags: ['family', 'identity'],
      },
      vaccination_record: {
        keywords: ['vaccination', 'impfung', 'vaccination', 'vaccino', 'vaccine', 'immunization'],
        confidence: 0.7,
        tags: ['health'],
      },
      residence_permit: {
        keywords: ['residence permit', 'aufenthaltstitel', 'permis de séjour', 'permesso di soggiorno', 'permit b', 'permit l'],
        confidence: 0.85,
        tags: ['legal', 'residence'],
      },
    }

    // Find best match
    let bestMatch = { type: 'other', confidence: 0.3, tags: [] as string[] }
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = pattern.keywords.filter((keyword) => lowerText.includes(keyword)).length
      if (matches > 0) {
        const confidence = Math.min(0.95, pattern.confidence + (matches * 0.05))
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type,
            confidence,
            tags: pattern.tags,
          }
        }
      }
    }

    // Detect language
    const language = this.detectLanguage(text)

    return {
      documentType: bestMatch.type,
      confidence: bestMatch.confidence,
      tags: bestMatch.tags,
      extractedFields: {},
      language,
      requiresReview: bestMatch.confidence < 0.7,
    }
  }

  /**
   * Simple language detection
   */
  private detectLanguage(text: string): string {
    const lowerText = text.toLowerCase()
    
    // German indicators
    if (/\b(der|die|das|und|ist|sind|für|mit|von|zu)\b/.test(lowerText)) {
      return 'de'
    }
    
    // French indicators
    if (/\b(le|la|les|et|est|sont|pour|avec|de|à)\b/.test(lowerText)) {
      return 'fr'
    }
    
    // Italian indicators
    if (/\b(il|la|gli|e|è|sono|per|con|di|a)\b/.test(lowerText)) {
      return 'it'
    }
    
    return 'en'
  }

  /**
   * Generate thumbnail for document
   */
  async generateThumbnail(fileBuffer: Buffer, mimeType: string): Promise<Buffer> {
    try {
      if (mimeType.startsWith('image/')) {
        // Resize image to thumbnail
        return await sharp(fileBuffer)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()
      } else if (mimeType === 'application/pdf') {
        // TODO: Extract first page of PDF as image
        // For now, return a placeholder
        console.warn('⚠️ PDF thumbnail generation not yet implemented')
        return Buffer.from('')
      }
    } catch (error) {
      console.error('❌ Thumbnail generation error:', error)
    }

    return Buffer.from('')
  }
}

