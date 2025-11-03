/**
 * Document Processor
 * Handles PDF parsing, OCR, and AI classification for uploaded documents
 */

// Dynamic imports for server-side only (these packages don't work in client-side)
// pdf-parse doesn't have a default export in ESM
import type { PDFInfo } from 'pdf-parse'

// Google Generative AI (Gemini) - dynamic import to avoid client-side bundling
let GoogleGenerativeAI: any = null

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
  private genAI: any = null

  constructor() {
    // Initialize Gemini AI if API key is available (lazy load)
    if (process.env.GEMINI_API_KEY) {
      this.initGemini()
    }
  }

  private async initGemini() {
    if (!GoogleGenerativeAI) {
      const module = await import('@google/generative-ai')
      GoogleGenerativeAI = module.GoogleGenerativeAI
    }
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
        // Dynamic import for pdf-parse (server-side only)
        const pdfParse = await import('pdf-parse')
        const pdfData = await pdfParse.default(fileBuffer)
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
      console.log('🔍 PDF has little/no text or is image - performing OCR...')
      extractedText = await this.performOCR(fileBuffer, mimeType)
      metadata.isImage = mimeType.startsWith('image/')
      
      if (extractedText.length > 0) {
        console.log(`✅ OCR extracted ${extractedText.length} characters`)
      } else {
        console.warn('⚠️ OCR returned no text - document may be image-only or require manual review')
      }
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

    // Step 3: AI Classification (preferred method - uses LLM)
    // Initialize Gemini if not already done
    if (!this.genAI && process.env.GEMINI_API_KEY) {
      await this.initGemini()
    }

    if (this.genAI && extractedText.length > 20) {
      try {
        console.log('🤖 Using AI (Gemini) for document classification...')
        classification = await this.classifyWithAI(extractedText, fileName)
        console.log(`✅ AI classification: ${classification.documentType} (confidence: ${classification.confidence})`)
      } catch (error) {
        console.error('⚠️ AI classification failed, using keyword-based fallback:', error)
        // Fallback to keyword-based classification
        classification = this.classifyWithKeywords(extractedText)
      }
    } else {
      if (!this.genAI) {
        console.log('⚠️ Gemini API key not configured, using keyword-based classification')
      }
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
      // Dynamic imports for server-side only
      const Tesseract = await import('tesseract.js')
      const sharpModule = await import('sharp')
      
      // Convert to image format if needed
      let imageBuffer = buffer
      
      if (mimeType === 'application/pdf') {
        // Convert first page of PDF to image for OCR
        try {
          console.log('📄 Converting PDF first page to image for OCR...')
          const pdf2pic = await import('pdf2pic')
          const { fromBuffer } = pdf2pic.default
          
          const convert = fromBuffer(buffer, {
            density: 300,           // Higher density = better OCR quality
            saveFilename: 'temp',
            savePath: '/tmp',        // Temporary path (server-side only)
            format: 'png',
            width: 2000,            // Large enough for good OCR
            height: 2000,
          })
          
          const result = await convert(1, { responseType: 'buffer' }) // First page
          
          if (result && result.buffer) {
            console.log('✅ PDF converted to image, running OCR...')
            // Use the converted image buffer for OCR
            imageBuffer = result.buffer
          } else {
            console.warn('⚠️ PDF conversion failed, skipping OCR for this PDF')
            return ''
          }
        } catch (error) {
          console.error('❌ PDF to image conversion error:', error)
          // Fallback: try to extract text from PDF directly (might have embedded text)
          return ''
        }
      }

      // Ensure image is in supported format (JPEG/PNG)
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        imageBuffer = await sharpModule.default(buffer)
          .jpeg({ quality: 90 })
          .toBuffer()
      }

      // Run Tesseract OCR with Swiss languages (German, French, Italian, English)
      // Use deu+fra+ita+eng for multi-language support
      const { data } = await Tesseract.default.recognize(imageBuffer, 'deu+fra+ita+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      const ocrText = data.text || ''
      console.log(`✅ OCR completed: ${ocrText.length} characters extracted`)
      return ocrText
    } catch (error) {
      console.error('❌ OCR error:', error)
      return ''
    }
  }

  /**
   * AI Classification using Gemini with enhanced prompt
   */
  private async classifyWithAI(text: string, fileName?: string): Promise<{
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

    // Enhanced prompt with Swiss document context
    const prompt = `
You are an expert document classifier for Swiss administrative documents. Analyze the document content and classify it accurately.

AVAILABLE DOCUMENT TYPES (choose ONE):
1. "passport" - Passport or ID card (contains passport number, photo, expiry date, nationality)
2. "birth_certificate" - Birth certificate (contains date of birth, place of birth, parents' names, Geburtsurkunde)
3. "marriage_certificate" - Marriage certificate (contains spouses' names, marriage date, place, Heiratsurkunde)
4. "employment_contract" - Employment/work contract (contains employer name, employee name, salary, contract dates, Arbeitsvertrag)
5. "rental_contract" - Rental/housing contract (contains landlord, tenant, rent amount, property address, Mietvertrag, bail)
6. "vaccination_record" - Vaccination/immunization record (contains vaccination dates, vaccine names, Impfpass, vaccination card)
7. "residence_permit" - Swiss residence permit (contains permit type B/L/C, expiry date, Aufenthaltstitel, permis de séjour)
8. "bank_documents" - Bank statements, account documents (contains account number, transactions, Kontoauszug, relevé de compte)
9. "insurance_documents" - Insurance documents (health, liability, etc. - contains Versicherung, Assurance, policy number, insurance company)
10. "school_documents" - School enrollment, diplomas, certificates (contains school name, student info, Zeugnis, Bildung, education records)
11. "other" - Anything that doesn't clearly fit the above categories

INSTRUCTIONS:
- Analyze the document content carefully
- Consider file name as additional context: "${fileName || 'unknown'}"
- Look for Swiss-specific terms (German: Geburtsurkunde, Mietvertrag, Aufenthaltstitel; French: acte de naissance, bail, permis de séjour; Italian: atto di nascita, contratto di affitto, permesso di soggiorno)
- Return high confidence (0.8-1.0) only if you're very sure of the classification
- Extract relevant fields from the document (name, dates, numbers, addresses)
- Detect the language (de/fr/it/en) based on content
- Set requires_review to true if confidence < 0.7 or document is unclear

Return ONLY valid JSON (no markdown, no code blocks, no explanations):

{
  "document_type": "passport" | "birth_certificate" | "marriage_certificate" | "employment_contract" | "rental_contract" | "vaccination_record" | "residence_permit" | "bank_documents" | "insurance_documents" | "school_documents" | "other",
  "confidence": 0.0-1.0,
  "tags": ["tag1", "tag2"],
  "extracted_fields": {
    "name": "extracted name or null",
    "date_of_birth": "extracted date or null",
    "passport_number": "extracted number or null",
    "expiry_date": "extracted date or null",
    "address": "extracted address or null",
    "document_date": "extracted date or null"
  },
  "language": "de" | "fr" | "it" | "en",
  "requires_review": true | false
}

Document text (first 6000 chars):
${text.substring(0, 6000)}
${text.length > 6000 ? '\n... (text truncated for analysis)' : ''}
`

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const textResponse = response.text()

      console.log('📝 Raw AI response:', textResponse.substring(0, 500))

      // Parse JSON from response (might have markdown code blocks)
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const classification = JSON.parse(jsonMatch[0])
          
          // Validate document_type is in the allowed list
          const allowedTypes = [
            'passport', 'birth_certificate', 'marriage_certificate', 'employment_contract',
            'rental_contract', 'vaccination_record', 'residence_permit', 'bank_documents',
            'insurance_documents', 'school_documents', 'other'
          ]
          
          const docType = classification.document_type || 'other'
          const validType = allowedTypes.includes(docType) ? docType : 'other'
          
          return {
            documentType: validType,
            confidence: Math.min(1.0, Math.max(0.0, classification.confidence || 0.5)),
            tags: Array.isArray(classification.tags) ? classification.tags : [],
            extractedFields: classification.extracted_fields || {},
            language: ['de', 'fr', 'it', 'en'].includes(classification.language) 
              ? classification.language 
              : 'en',
            requiresReview: classification.requires_review !== false || (classification.confidence || 0.5) < 0.7,
          }
        } catch (parseError) {
          console.error('❌ Failed to parse AI response JSON:', parseError)
          throw parseError
        }
      } else {
        console.warn('⚠️ No JSON found in AI response')
        throw new Error('Invalid AI response format')
      }
    } catch (error) {
      console.error('❌ AI classification error:', error)
      throw error
    }
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

    // Document type patterns (matching the specified document types)
    const patterns = {
      passport: {
        keywords: ['passport', 'reisepass', 'passeport', 'passaporto', 'passport number', 'passeport numéro', 'id card', 'identity card', 'ausweis'],
        confidence: 0.8,
        tags: ['identity', 'travel'],
      },
      birth_certificate: {
        keywords: ['birth certificate', 'geburtsurkunde', 'acte de naissance', 'atto di nascita', 'born', 'geboren', 'certificat de naissance'],
        confidence: 0.75,
        tags: ['identity', 'family'],
      },
      marriage_certificate: {
        keywords: ['marriage certificate', 'heiratsurkunde', 'acte de mariage', 'atto di matrimonio', 'married', 'verheiratet', 'certificat de mariage'],
        confidence: 0.75,
        tags: ['family', 'identity'],
      },
      employment_contract: {
        keywords: ['employment contract', 'arbeitsvertrag', 'contrat de travail', 'contratto di lavoro', 'employee', 'employer', 'work contract', 'arbeitsvertrag'],
        confidence: 0.8,
        tags: ['work', 'contract'],
      },
      rental_contract: {
        keywords: ['rental contract', 'mietvertrag', 'bail', 'contratto di affitto', 'lease', 'tenant', 'landlord', 'rental agreement', 'mietvertrag'],
        confidence: 0.8,
        tags: ['housing', 'contract'],
      },
      vaccination_record: {
        keywords: ['vaccination', 'impfung', 'vaccination', 'vaccino', 'vaccine', 'immunization', 'vaccination card', 'impfpass'],
        confidence: 0.7,
        tags: ['health'],
      },
      residence_permit: {
        keywords: ['residence permit', 'aufenthaltstitel', 'permis de séjour', 'permesso di soggiorno', 'permit b', 'permit l', 'permit c', 'niederlassungsbewilligung'],
        confidence: 0.85,
        tags: ['legal', 'residence'],
      },
      bank_documents: {
        keywords: ['bank', 'bank account', 'bankkonto', 'compte bancaire', 'conto bancario', 'account statement', 'kontoauszug', 'relevé de compte', 'bank statement', 'banking'],
        confidence: 0.75,
        tags: ['financial', 'bank'],
      },
      insurance_documents: {
        keywords: ['insurance', 'versicherung', 'assurance', 'assicurazione', 'health insurance', 'krankenversicherung', 'assurance maladie', 'liability insurance', 'haftpflichtversicherung'],
        confidence: 0.75,
        tags: ['health', 'insurance', 'financial'],
      },
      school_documents: {
        keywords: ['school', 'schule', 'école', 'scuola', 'education', 'bildung', 'education', 'school enrollment', 'schulanmeldung', 'inscription scolaire', 'school registration', 'diploma', 'zeugnis'],
        confidence: 0.75,
        tags: ['education', 'school'],
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
      // Dynamic import for server-side only
      const sharpModule = await import('sharp')
      
      if (mimeType.startsWith('image/')) {
        // Resize image to thumbnail
        return await sharpModule.default(fileBuffer)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()
      } else if (mimeType === 'application/pdf') {
        // Convert first page of PDF to thumbnail image
        try {
          const pdf2pic = await import('pdf2pic')
          const { fromBuffer } = pdf2pic.default
          
          const convert = fromBuffer(fileBuffer, {
            density: 200,           // Lower density for thumbnails (faster)
            saveFilename: 'temp',
            savePath: '/tmp',
            format: 'jpg',
            width: 300,
            height: 300,
          })
          
          const result = await convert(1, { responseType: 'buffer' })
          
          if (result && result.buffer) {
            // Resize to thumbnail
            return await sharpModule.default(result.buffer)
              .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer()
          }
        } catch (error) {
          console.error('❌ PDF thumbnail generation error:', error)
        }
        return Buffer.from('')
      }
    } catch (error) {
      console.error('❌ Thumbnail generation error:', error)
    }

    return Buffer.from('')
  }
}

