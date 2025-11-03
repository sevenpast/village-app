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
    // Lower threshold: if less than 50 chars, it's likely a scanned image
    if (!extractedText || extractedText.length < 50 || mimeType.startsWith('image/')) {
      console.log(`🔍 PDF has little/no text (${extractedText.length} chars) or is image - performing OCR...`)
      const ocrText = await this.performOCR(fileBuffer, mimeType)
      metadata.isImage = mimeType.startsWith('image/')
      
      if (ocrText.length > 0) {
        // Use OCR text if it's longer than extracted text, or if no text was extracted
        if (ocrText.length > extractedText.length || extractedText.length === 0) {
          extractedText = ocrText
          console.log(`✅ OCR extracted ${extractedText.length} characters (better than PDF text extraction)`)
        } else {
          // Combine both if we have some from both sources
          extractedText = `${extractedText}\n\n${ocrText}`
          console.log(`✅ OCR added ${ocrText.length} characters to existing ${extractedText.length - ocrText.length} chars`)
        }
      } else {
        console.warn('⚠️ OCR returned no text - document may be too blurry, unreadable, or require manual review')
        // Keep the minimal text we have from PDF extraction (if any)
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

    // Step 3: AI Classification (ALWAYS try LLM first, then fallback to keywords)
    // Initialize Gemini if not already done
    if (!this.genAI && process.env.GEMINI_API_KEY) {
      await this.initGemini()
    }

    // Combine filename and extracted text for better context
    // Filename is often very informative (e.g., "Anmeldung_Kindergarten_und_Schule_neu.pdf")
    const fullContext = `${fileName}\n\n${extractedText || 'No text extracted from document'}`

    if (this.genAI && fullContext.length > 10) {
      try {
        console.log('🤖 Using AI (Gemini) for document classification...')
        console.log(`📝 Context length: ${fullContext.length} chars (filename: ${fileName.substring(0, 50)}...)`)
        
        // Always use LLM for classification - it's much better than keywords
        classification = await this.classifyWithAI(fullContext, fileName)
        console.log(`✅ AI classification: ${classification.documentType} (confidence: ${classification.confidence}, tags: ${classification.tags.join(', ')})`)
      } catch (error) {
        console.error('⚠️ AI classification failed, using keyword-based fallback:', error)
        // Fallback to keyword-based classification (combines filename + text)
        classification = this.classifyWithKeywords(fullContext)
        console.log(`📋 Keyword fallback: ${classification.documentType} (confidence: ${classification.confidence})`)
      }
    } else {
      if (!this.genAI) {
        console.log('⚠️ Gemini API key not configured, using keyword-based classification')
      } else if (fullContext.length <= 10) {
        console.log('⚠️ Not enough text extracted, using keyword-based classification')
      }
      // Fallback to keyword-based classification
      classification = this.classifyWithKeywords(fullContext)
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
        // Convert PDF pages to image for OCR
        // For passports/documents, we might need multiple pages, but start with first page
        try {
          console.log('📄 Converting PDF to image for OCR (density: 400 DPI for better quality)...')
          const pdf2pic = await import('pdf2pic')
          const { fromBuffer } = pdf2pic.default
          
          const convert = fromBuffer(buffer, {
            density: 400,           // Higher density (400 DPI) = much better OCR quality
            saveFilename: 'temp',
            savePath: '/tmp',
            format: 'png',
            width: 3000,            // Higher resolution for better text recognition
            height: 3000,
            preserveAspectRatio: true, // Keep aspect ratio
          })
          
          // Convert first page (most important for identification documents)
          const result = await convert(1, { responseType: 'buffer' })
          
          if (result && result.buffer) {
            console.log('✅ PDF converted to image, running OCR...')
            imageBuffer = result.buffer
            
            // Enhance image quality for better OCR using sharp
            try {
              const sharp = await import('sharp')
              imageBuffer = await sharp.default(imageBuffer)
                .sharpen()                    // Sharpen edges for better text recognition
                .normalize()                   // Normalize contrast
                .greyscale()                   // Convert to greyscale (often better for OCR)
                .toBuffer()
              console.log('✅ Image preprocessed for OCR')
            } catch (enhanceError) {
              console.warn('⚠️ Image enhancement failed, using original:', enhanceError)
            }
          } else {
            console.warn('⚠️ PDF conversion failed, skipping OCR for this PDF')
            return ''
          }
        } catch (error) {
          console.error('❌ PDF to image conversion error:', error)
          return ''
        }
      }

      // Ensure image is in supported format (JPEG/PNG)
      if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        imageBuffer = await sharpModule.default(buffer)
          .jpeg({ quality: 90 })
          .toBuffer()
      }

      // Run Tesseract OCR with optimized settings for document recognition
      // Use deu+fra+ita+eng for multi-language support
      // Add English for passports (often in English)
      const { data } = await Tesseract.default.recognize(imageBuffer, 'deu+fra+ita+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`🔍 OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        },
        // OCR Engine Mode 3 = LSTM (better accuracy)
        oem: 3,
        // Page Segmentation Mode 6 = Assume uniform block of text (good for documents)
        psm: 6,
      })

      const ocrText = data.text || ''
      console.log(`✅ OCR completed: ${ocrText.length} characters extracted`)
      
      // Log first 200 chars for debugging
      if (ocrText.length > 0) {
        console.log(`📝 OCR text preview: ${ocrText.substring(0, 200)}...`)
      } else {
        console.warn('⚠️ OCR returned empty text - document might be too blurry or unreadable')
      }
      
      return ocrText
    } catch (error) {
      console.error('❌ OCR error:', error)
      return ''
    }
  }

  /**
   * AI Classification using Gemini with enhanced prompt
   * text: Contains filename + document content
   * fileName: The original filename for reference
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

    // Enhanced prompt with Swiss document context - optimized for better classification
    const prompt = `
You are an expert document classifier for Swiss administrative documents. Your task is to accurately classify documents based on their content AND filename.

FILE NAME: "${fileName || 'unknown'}"

CRITICAL: The filename is often VERY informative. For example:
- "Anmeldung_Kindergarten_und_Schule.pdf" → school_documents
- "Passport_John_Doe.pdf" → passport
- "Mietvertrag_Zuerich.pdf" → rental_contract
- "Arbeitsvertrag_Firma.pdf" → employment_contract

AVAILABLE DOCUMENT TYPES (choose ONE - be specific and accurate):
1. "passport" - Passport or ID card. KEYWORDS: passport number, passport no, passeport numéro, Reisepass, Ausweis, ID card, identity card, identitätskarte, carte d'identité, MRZ (machine readable zone), date of expiry, expiry date, expires, gültig bis, nationality, nationalité, date of birth, geboren, born, place of birth, geburtsort, lieu de naissance, authority, ausstellungsbehörde, autorité. Look for passport-specific fields even if text is from OCR!
2. "birth_certificate" - Birth certificate (date of birth, place of birth, parents' names, Geburtsurkunde, acte de naissance)
3. "marriage_certificate" - Marriage certificate (spouses' names, marriage date, Heiratsurkunde, acte de mariage)
4. "employment_contract" - Employment/work contract (employer, employee, salary, Arbeitsvertrag, contrat de travail)
5. "rental_contract" - Rental/housing contract (landlord, tenant, rent, address, Mietvertrag, bail, contrat de location)
6. "vaccination_record" - Vaccination/immunization record (vaccination dates, Impfpass, carnet de vaccination)
7. "residence_permit" - Swiss residence permit (permit type B/L/C, Aufenthaltstitel, permis de séjour)
8. "bank_documents" - Bank statements, account documents (account number, transactions, Kontoauszug, relevé de compte)
9. "insurance_documents" - Insurance documents (Versicherung, Assurance, policy number, health insurance, liability)
10. "school_documents" - School enrollment, diplomas, certificates (school name, student info, Zeugnis, Bildung, Anmeldung, Kindergarten, Schule, Schulanmeldung, inscription scolaire)
11. "other" - ONLY if it truly doesn't fit any category above

ANALYSIS INSTRUCTIONS:
1. FIRST, look at the filename - it often contains the answer (e.g., "Anmeldung" = school_documents, "Mietvertrag" = rental_contract, "Pass" = passport)
2. THEN, analyze the document content for confirmation
3. Look for Swiss-specific terms in German/French/Italian/English
4. For PASSWORDS: Look for passport-specific OCR text patterns even if unclear:
   - "passport number", "passport no", "passeport numéro", "passport nummer"
   - "MRZ" or "machine readable zone" (highly specific to passports/IDs!)
   - "date of expiry", "expiry date", "expires", "gültig bis"
   - "nationality", "nationalité", "nationalität"
   - "authority", "ausstellungsbehörde", "autorité"
   - Even partial matches like "pass" + "number" or "MRZ" = strong passport indicator!
5. Match keywords: "Anmeldung", "Kindergarten", "Schule", "Schulanmeldung" → school_documents
6. Match keywords: "Mietvertrag", "bail", "contrat de location" → rental_contract
7. Match keywords: "Arbeitsvertrag", "contrat de travail" → employment_contract
8. Return high confidence (0.8-1.0) if filename + content match
9. Extract relevant fields (name, dates, numbers, addresses, passport numbers)
10. Detect language (de/fr/it/en)
11. Set requires_review to true ONLY if confidence < 0.6
12. IMPORTANT: For scanned documents (OCR text), passport documents often have fragmented text. Look for partial matches like "pass" + "port" or passport field names even if incomplete!

IMPORTANT: Tags must be chosen from this EXACT list only:
- identity, travel, family, work, contract, housing, health, legal, residence, financial, education, bank, insurance, school, personal, official, other

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

Tag mapping guidelines:
- passport → ["identity", "travel", "official"]
- birth_certificate → ["identity", "family", "official"]
- marriage_certificate → ["family", "identity", "official"]
- employment_contract → ["work", "contract"]
- rental_contract → ["housing", "contract"]
- vaccination_record → ["health"]
- residence_permit → ["legal", "residence", "official"]
- bank_documents → ["financial", "bank"]
- insurance_documents → ["health", "insurance", "financial"]
- school_documents → ["education", "school"]
- other → ["other"]

DOCUMENT CONTENT (analyze carefully):
${text.substring(0, 10000)}
${text.length > 10000 ? '\n... (text truncated - analyze first 10000 chars)' : ''}

Remember: The FIRST LINE contains the filename - analyze it carefully. 
If you see "Anmeldung" or "Kindergarten" or "Schule" in the filename → school_documents
If you see "Mietvertrag" or "rental" or "bail" → rental_contract
If you see "Arbeitsvertrag" or "employment contract" → employment_contract
The filename is your strongest clue!
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
          
          // Validate and filter tags to only include allowed ones
          const validTags = [
            'identity', 'travel', 'family', 'work', 'contract', 'housing',
            'health', 'legal', 'residence', 'financial', 'education',
            'bank', 'insurance', 'school', 'personal', 'official', 'other'
          ]
          const providedTags = Array.isArray(classification.tags) ? classification.tags : []
          const filteredTags = providedTags.filter(tag => validTags.includes(tag))
          
          // If no valid tags provided, use default tags based on document type
          let finalTags = filteredTags
          if (finalTags.length === 0) {
            const defaultTags: Record<string, string[]> = {
              passport: ['identity', 'travel', 'official'],
              birth_certificate: ['identity', 'family', 'official'],
              marriage_certificate: ['family', 'identity', 'official'],
              employment_contract: ['work', 'contract'],
              rental_contract: ['housing', 'contract'],
              vaccination_record: ['health'],
              residence_permit: ['legal', 'residence', 'official'],
              bank_documents: ['financial', 'bank'],
              insurance_documents: ['health', 'insurance', 'financial'],
              school_documents: ['education', 'school'],
              other: ['other'],
            }
            finalTags = defaultTags[validType] || ['other']
          }

          return {
            documentType: validType,
            confidence: Math.min(1.0, Math.max(0.0, classification.confidence || 0.5)),
            tags: finalTags,
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
   * Now analyzes filename + content together for better accuracy
   */
  private classifyWithKeywords(text: string): {
    documentType: string
    confidence: number
    tags: string[]
    extractedFields: Record<string, any>
    language: string
    requiresReview: boolean
  } {
    // Text already contains filename + content
    const lowerText = text.toLowerCase()
    
    // Extract filename if present (first line before newline)
    const lines = text.split('\n')
    const fileNamePart = lines[0]?.toLowerCase() || ''
    const contentPart = lines.slice(1).join('\n').toLowerCase()

    // Document type patterns (matching the specified document types)
    const patterns = {
      passport: {
        keywords: [
          'passport', 'reisepass', 'passeport', 'passaporto', 
          'passport number', 'passport no', 'passeport numéro', 'passport nummer',
          'id card', 'identity card', 'ausweis', 'identitätskarte',
          'nationality', 'nationalité', 'nationalität', 'nazionalità',
          'date of birth', 'geboren', 'born', 'naissance',
          'date of expiry', 'expiry date', 'expires', 'gültig bis',
          'mrz', 'machine readable zone', // MRZ is specific to passports
          'authority', 'ausstellungsbehörde',
          'place of birth', 'geburtsort', 'lieu de naissance',
          'passport holder', 'inhaber', 'titulaire',
        ],
        confidence: 0.85,
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
        keywords: [
          'school', 'schule', 'école', 'scuola', 'education', 'bildung', 
          'school enrollment', 'schulanmeldung', 'inscription scolaire', 
          'school registration', 'diploma', 'zeugnis', 'kindergarten', 'kita',
          'anmeldung', 'registration', 'schüler', 'student', 'noten',
          'report card', 'bulletin', 'matrikel', 'immatrikulation',
          'kindergarten anmeldung', 'iscrizione scolastica', 'anmeldung_kindergarten',
          'schule_neu', 'schulanmeldung', 'inscription'
        ],
        confidence: 0.9,
        tags: ['education', 'school'],
        // Filename keywords get higher priority
        filenameKeywords: ['anmeldung', 'kindergarten', 'schule', 'schulanmeldung', 'school', 'education', 'kita'],
      },
    }

    // Find best match - prioritize filename matches
    let bestMatch = { type: 'other', confidence: 0.3, tags: [] as string[] }
    
    for (const [type, pattern] of Object.entries(patterns)) {
      // Check filename first (higher priority)
      const filenameMatches = (pattern as any).filenameKeywords 
        ? (pattern as any).filenameKeywords.filter((keyword: string) => fileNamePart.includes(keyword)).length
        : 0
      
      // Check content
      const contentMatches = pattern.keywords.filter((keyword) => contentPart.includes(keyword)).length
      const totalMatches = filenameMatches + contentMatches
      
      if (totalMatches > 0 || filenameMatches > 0) {
        // Filename matches get a big boost
        const filenameBoost = filenameMatches > 0 ? 0.3 : 0
        const confidence = Math.min(0.95, pattern.confidence + filenameBoost + (totalMatches * 0.05))
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            type,
            confidence,
            tags: pattern.tags,
          }
        }
      }
    }
    
    // Special case: If filename contains clear indicators but wasn't matched
    // Check for common patterns in filename
    if (bestMatch.confidence < 0.7) {
      if (fileNamePart.includes('anmeldung') && (fileNamePart.includes('kindergarten') || fileNamePart.includes('schule') || fileNamePart.includes('school'))) {
        return {
          type: 'school_documents',
          confidence: 0.9,
          tags: ['education', 'school'],
          extractedFields: {},
          language: 'de',
          requiresReview: false,
        }
      }
      if (fileNamePart.includes('mietvertrag') || fileNamePart.includes('rental') || fileNamePart.includes('bail')) {
        return {
          type: 'rental_contract',
          confidence: 0.9,
          tags: ['housing', 'contract'],
          extractedFields: {},
          language: 'de',
          requiresReview: false,
        }
      }
      if (fileNamePart.includes('arbeitsvertrag') || fileNamePart.includes('employment') || fileNamePart.includes('contract') && fileNamePart.includes('work')) {
        return {
          type: 'employment_contract',
          confidence: 0.9,
          tags: ['work', 'contract'],
          extractedFields: {},
          language: 'de',
          requiresReview: false,
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

