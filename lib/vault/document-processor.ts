/**
 * Document Processor
 * Handles PDF parsing, OCR, and AI classification for uploaded documents
 */

// Dynamic imports for server-side only (these packages don't work in client-side)
// pdf-parse doesn't have a default export in ESM
import type { PDFInfo } from 'pdf-parse'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

// Google Generative AI (Gemini) - dynamic import to avoid client-side bundling
let GoogleGenerativeAI: any = null

// APDF.io Service for reliable PDF text extraction
import { ApdfService } from '@/lib/services/apdf-service'

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
    // Don't initialize Gemini in constructor - it's async
    // Will be initialized lazily when needed
  }

  private async initGemini() {
    try {
      if (!GoogleGenerativeAI) {
        console.log('📦 Loading @google/generative-ai module...')
        const module = await import('@google/generative-ai')
        GoogleGenerativeAI = module.GoogleGenerativeAI
        console.log('✅ GoogleGenerativeAI module loaded')
      }
      
      if (process.env.GEMINI_API_KEY) {
        const keyLength = process.env.GEMINI_API_KEY.length
        console.log(`🔑 Initializing Gemini AI with API key (length: ${keyLength})...`)
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        console.log('✅ Gemini AI initialized successfully')
      } else {
        console.warn('⚠️ GEMINI_API_KEY not found in environment variables')
      }
    } catch (error) {
      console.error('❌ Error initializing Gemini AI:', error)
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
    }
  }

  /**
   * Convert PDF to image using ImageMagick directly (replaces pdf2pic)
   * @param pdfBuffer PDF file buffer
   * @param pageNumber Page number to convert (default: 1)
   * @param options Conversion options (density, format, width, height)
   * @returns Image buffer
   */
  private async convertPdfToImage(
    pdfBuffer: Buffer,
    pageNumber: number = 1,
    options: {
      density?: number
      format?: 'png' | 'jpg'
      width?: number
      height?: number
    } = {}
  ): Promise<Buffer> {
    const {
      density = 300,
      format = 'png',
      width,
      height,
    } = options

    const tempPdfPath = join(tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`)
    const tempImagePath = join(tmpdir(), `img-${Date.now()}-${Math.random().toString(36).substring(7)}.${format}`)

    try {
      // Write PDF to temp file
      writeFileSync(tempPdfPath, pdfBuffer)

      // Build ImageMagick command
      // Use 'magick' command (ImageMagick 7) or fallback to 'convert' (ImageMagick 6)
      let magickCmd = 'magick'
      try {
        await execAsync('which magick')
      } catch {
        // Fallback to 'convert' if 'magick' not found
        magickCmd = 'convert'
      }

      // Build command arguments (escape paths properly)
      const pdfInput = `${tempPdfPath}[${pageNumber - 1}]` // ImageMagick uses 0-based page indexing
      const args: string[] = [
        '-density', density.toString(),
        pdfInput,
      ]

      // Add resize if specified
      if (width || height) {
        const resize = width && height ? `${width}x${height}` : width ? `${width}x` : `x${height}`
        args.push('-resize', resize)
      }

      // Output format and path
      args.push(tempImagePath)

      // Build command with proper escaping for paths with spaces
      const command = `${magickCmd} ${args.map(arg => {
        // Escape spaces and special characters in paths
        if (arg.includes(' ') || arg.includes('(') || arg.includes(')')) {
          return `"${arg.replace(/"/g, '\\"')}"`
        }
        return arg
      }).join(' ')}`

      console.log(`🔄 Converting PDF page ${pageNumber} to ${format.toUpperCase()} using ImageMagick...`)
      await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 30000, // 30 second timeout for conversion
      })

      // Read converted image
      const imageBuffer = readFileSync(tempImagePath)
      console.log(`✅ PDF converted to image: ${imageBuffer.length} bytes`)

      // Cleanup temp files
      try {
        unlinkSync(tempPdfPath)
        unlinkSync(tempImagePath)
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp files:', cleanupError)
      }

      return imageBuffer
    } catch (error) {
      // Cleanup temp files on error
      try {
        if (existsSync(tempPdfPath)) unlinkSync(tempPdfPath)
        if (existsSync(tempImagePath)) unlinkSync(tempImagePath)
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      console.error('❌ ImageMagick PDF conversion error:', error)
      throw error
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
      // Try pdftotext first (most reliable, uses system tool)
      try {
        console.log('📄 Attempting PDF text extraction with pdftotext...')
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        const { writeFileSync, unlinkSync } = await import('fs')
        const { tmpdir } = await import('os')
        const { join } = await import('path')
        
        // Write buffer to temp file
        const tempPdfPath = join(tmpdir(), `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`)
        writeFileSync(tempPdfPath, fileBuffer)
        
        try {
          // Use pdftotext to extract text
          const { stdout, stderr } = await execAsync(`pdftotext "${tempPdfPath}" -`, {
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            encoding: 'utf8'
          })
          
          if (stderr && !stderr.includes('Error')) {
            console.warn('⚠️ pdftotext warnings:', stderr)
          }
          
          if (stdout && stdout.trim().length > 0) {
            extractedText = stdout.trim()
            metadata = {
              pages: 0, // pdftotext doesn't provide page count easily
              hasText: extractedText.length > 50,
              source: 'pdftotext'
            }
            console.log(`✅ pdftotext extracted ${extractedText.length} characters`)
            // Clean up temp file
            try {
              unlinkSync(tempPdfPath)
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
            
            // Skip pdf-parse if pdftotext succeeded
            if (extractedText.length >= 50) {
              // Continue to OCR step if needed
            } else {
              // Text is too short, will try OCR
            }
          } else {
            throw new Error('pdftotext returned no text')
          }
        } catch (pdftotextError) {
          console.warn('⚠️ pdftotext failed, trying pdf-parse:', pdftotextError instanceof Error ? pdftotextError.message : String(pdftotextError))
          // Clean up temp file
          try {
            unlinkSync(tempPdfPath)
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          // Fall through to pdf-parse
        }
      } catch (pdftotextImportError) {
        console.warn('⚠️ Could not use pdftotext, trying pdf-parse:', pdftotextImportError instanceof Error ? pdftotextImportError.message : String(pdftotextImportError))
      }
      
      // Fallback to pdf-parse if pdftotext didn't work or returned minimal text
      if (!extractedText || extractedText.length < 50) {
        try {
          console.log('📄 Attempting PDF text extraction with pdf-parse...')
          // Dynamic import for pdf-parse (server-side only)
          const pdfParseModule = await import('pdf-parse')
          console.log('📦 PDF-parse module imported:', Object.keys(pdfParseModule))

          // Better handling for dynamic imports
          // pdf-parse is a CommonJS module, use createRequire for ESM compatibility
          let parseFunction
          
          try {
            // Try using createRequire for CommonJS compatibility in ESM
            const { createRequire } = await import('module')
            const require = createRequire(import.meta.url)
            const pdfParseRequire = require('pdf-parse')
            
            if (typeof pdfParseRequire === 'function') {
              parseFunction = pdfParseRequire
              console.log('✅ Using require("pdf-parse") via createRequire')
            } else {
              throw new Error('pdf-parse is not a function')
            }
          } catch (requireError) {
            // Fallback: try direct import
            if (typeof pdfParseModule === 'function') {
              parseFunction = pdfParseModule
              console.log('✅ Using pdfParseModule directly')
            } else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
              parseFunction = pdfParseModule.default
              console.log('✅ Using pdfParseModule.default')
            } else {
              throw new Error(`Could not find parse function in pdf-parse module: ${requireError instanceof Error ? requireError.message : String(requireError)}`)
            }
          }

          const pdfData = await parseFunction(fileBuffer)
          const pdfParseText = pdfData.text
          
          // Use pdf-parse result if it's better than pdftotext (or if pdftotext failed)
          if (!extractedText || pdfParseText.length > extractedText.length) {
            extractedText = pdfParseText
            metadata = {
              pages: pdfData.numpages,
              hasText: extractedText.length > 50,
              source: 'pdf-parse'
            }
            console.log(`✅ PDF-parse extracted ${extractedText.length} chars from PDF (${pdfData.numpages} pages)`)
          } else {
            console.log(`✅ Using pdftotext result (${extractedText.length} chars) - pdf-parse returned ${pdfParseText.length} chars`)
          }
        } catch (error) {
          console.warn('⚠️ PDF parsing failed, will try OCR:', error)
          console.error('📋 PDF parsing error details:', error)
        }
      }
    }

    // Step 2: If PDF has no text or is an image, try OCR
    // Lower threshold: if less than 50 chars, it's likely a scanned image
    if (!extractedText || extractedText.length < 50 || mimeType.startsWith('image/')) {
      console.log(`🔍 PDF has little/no text (${extractedText?.length || 0} chars) or is image - performing OCR...`)
      
      // Try Tesseract OCR first (free, local)
      let ocrText = ''
      try {
        ocrText = await this.performOCR(fileBuffer, mimeType)
        console.log(`📊 Tesseract OCR result: ${ocrText?.length || 0} characters`)
        if (ocrText && ocrText.length > 0) {
          console.log(`📝 Tesseract preview: ${ocrText.substring(0, 100)}...`)
        }
      } catch (tesseractError) {
        console.error('❌ Tesseract OCR error:', tesseractError)
        ocrText = ''
      }
      
      metadata.isImage = mimeType.startsWith('image/')
      
      // Try Gemini Vision API as fallback if Tesseract failed or returned minimal text
      // Only if GEMINI_API_KEY is configured
      const hasGeminiKey = !!process.env.GEMINI_API_KEY
      
      // Check if Tesseract result is meaningful (not just whitespace or very short)
      const tesseractTextLength = ocrText?.trim().length || 0
      const tesseractIsMeaningful = tesseractTextLength >= 50
      
      const shouldTryGemini = hasGeminiKey && !tesseractIsMeaningful
      
      console.log(`📊 OCR Status: Tesseract=${ocrText?.length || 0} chars (meaningful=${tesseractIsMeaningful}), hasGeminiKey=${hasGeminiKey}, shouldTryGemini=${shouldTryGemini}`)
      
      if (shouldTryGemini) {
        console.log(`⚠️ Tesseract OCR returned minimal/no meaningful text (${ocrText?.length || 0} chars, ${tesseractTextLength} non-whitespace), trying Gemini Vision API as fallback...`)
        try {
          const geminiOcrText = await this.performGeminiVisionOCR(fileBuffer, mimeType)
          const geminiTextLength = geminiOcrText?.trim().length || 0
          console.log(`📊 Gemini Vision OCR result: ${geminiOcrText?.length || 0} characters (${geminiTextLength} non-whitespace)`)
          
          if (geminiOcrText && geminiOcrText.length > 0) {
            console.log(`📝 Gemini preview: ${geminiOcrText.substring(0, 100)}...`)
          }
          
          // Use Gemini result if it's better than Tesseract (more text or more meaningful)
          if (geminiTextLength > tesseractTextLength) {
            console.log(`✅ Gemini Vision OCR extracted ${geminiOcrText.length} characters (${geminiTextLength} meaningful) - better than Tesseract's ${ocrText?.length || 0} chars (${tesseractTextLength} meaningful)`)
            ocrText = geminiOcrText
          } else if (ocrText && tesseractTextLength > 0) {
            console.log(`✅ Using Tesseract OCR result (${ocrText.length} chars, ${tesseractTextLength} meaningful) - Gemini returned ${geminiOcrText?.length || 0} chars (${geminiTextLength} meaningful)`)
          } else if (geminiOcrText && geminiTextLength > 0) {
            console.log(`✅ Using Gemini Vision OCR result (${geminiOcrText.length} chars, ${geminiTextLength} meaningful) - Tesseract returned ${ocrText?.length || 0} chars (${tesseractTextLength} meaningful)`)
            ocrText = geminiOcrText
          } else {
            console.warn(`⚠️ Both OCR methods failed - Tesseract: ${ocrText?.length || 0} chars (${tesseractTextLength} meaningful), Gemini: ${geminiOcrText?.length || 0} chars (${geminiTextLength} meaningful)`)
          }
        } catch (geminiError) {
          console.error('❌ Gemini Vision OCR error:', geminiError)
          console.error('❌ Gemini error details:', geminiError instanceof Error ? geminiError.message : String(geminiError))
          if (geminiError instanceof Error && geminiError.stack) {
            console.error('❌ Gemini error stack:', geminiError.stack)
          }
          // Continue with Tesseract result if available
          if (ocrText && tesseractTextLength > 0) {
            console.log(`✅ Using Tesseract OCR result despite Gemini error (${ocrText.length} chars, ${tesseractTextLength} meaningful)`)
          }
        }
      } else if (!hasGeminiKey && !tesseractIsMeaningful) {
        console.warn('⚠️ Tesseract OCR returned minimal/no meaningful text, but GEMINI_API_KEY is not configured')
        console.warn('💡 Tip: To improve OCR results, add GEMINI_API_KEY to your .env.local file')
        console.warn('💡 Get a free key at: https://aistudio.google.com/app/apikey')
      } else if (tesseractIsMeaningful) {
        console.log(`✅ Tesseract OCR returned sufficient meaningful text (${ocrText.length} chars, ${tesseractTextLength} non-whitespace), skipping Gemini Vision`)
      }
      
      if (ocrText && ocrText.length > 0) {
        // Use OCR text if it's longer than extracted text, or if no text was extracted
        if (ocrText.length > (extractedText?.length || 0) || !extractedText || extractedText.length === 0) {
          extractedText = ocrText
          console.log(`✅ OCR extracted ${ocrText.length} characters (better than PDF text extraction)`)
        } else {
          // Combine both if we have some from both sources
          extractedText = `${extractedText}\n\n${ocrText}`
          console.log(`✅ OCR added ${ocrText.length} characters to existing ${extractedText.length - ocrText.length} chars`)
        }
      } else {
        console.warn('⚠️ All OCR methods failed - document may be too blurry, unreadable, or require manual review')
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
        // Convert PDF pages to image for OCR using ImageMagick
        try {
          console.log('📄 Converting PDF to image for OCR (density: 300 DPI)...')
          
          // Convert first page (most important for identification documents)
          // Use lower density and smaller size for faster processing
          imageBuffer = await this.convertPdfToImage(buffer, 1, {
            density: 200, // Reduced from 300 for faster processing
            format: 'png',
            width: 1500, // Reduced from 2000 for faster processing
            height: 1500,
          })

          // Simple validation that image buffer is valid
          try {
            const sharp = await import('sharp')
            // Test if buffer is a valid image
            const metadata = await sharp.default(imageBuffer).metadata()
            console.log(`📊 Image metadata: ${metadata.width}x${metadata.height}, format: ${metadata.format}`)

            // Enhance image quality for better OCR
            const enhancedBuffer = await sharp.default(imageBuffer)
              .sharpen()
              .normalize()
              .greyscale()
              .png()
              .toBuffer()
            imageBuffer = enhancedBuffer
            console.log(`✅ Image preprocessed for OCR (${enhancedBuffer.length} bytes)`)
          } catch (sharpError) {
            console.warn('⚠️ Image enhancement failed, using original buffer:', sharpError)
            // Continue with original buffer
          }
        } catch (error) {
          console.error('❌ PDF to image conversion error:', error)
          console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
          return ''
        }
      }

      // Ensure image is in supported format (JPEG/PNG) - only for non-PDF files
      if (mimeType !== 'application/pdf' && mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
        try {
          imageBuffer = await sharpModule.default(buffer)
            .jpeg({ quality: 90 })
            .toBuffer()
        } catch (formatError) {
          console.warn('⚠️ Image format conversion failed:', formatError)
          throw new Error('Unsupported image format')
        }
      }

      // Validate image buffer before OCR
      if (!imageBuffer || imageBuffer.length === 0) {
        console.warn('⚠️ Empty image buffer for OCR')
        return ''
      }

      console.log(`🔍 Starting OCR on ${imageBuffer.length} bytes image...`)

      // Run Tesseract OCR with optimized settings for German documents
      // Use deu+fra+ita+eng for Swiss multi-language support
      console.log('🔍 Starting Tesseract OCR with multilingual support (deu+fra+ita+eng)...')

      // Try multiple page segmentation modes for better results
      // Start with fastest mode (3=auto), only try others if result is poor
      const psmModes = [3, 6] // Reduced from [3, 6, 11] for faster processing - 3=auto, 6=uniform block
      let bestResult = { text: '', confidence: 0 }
      
      for (const psm of psmModes) {
        try {
          console.log(`🔍 Trying Tesseract with PSM mode ${psm}...`)
          
          // Add timeout wrapper for OCR (max 20 seconds per mode)
          const ocrPromise = Tesseract.default.recognize(imageBuffer, 'deu+fra+ita+eng', {
            logger: (m) => {
              if (m.status === 'recognizing text' && m.progress % 0.25 < 0.01) {
                console.log(`🔍 OCR Progress (PSM ${psm}): ${Math.round(m.progress * 100)}%`)
              }
            },
            // OCR Engine Mode 1 = LSTM (best for modern documents)
            oem: 1,
            // Page Segmentation Mode
            psm: psm,
            // Additional options for better text recognition
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüßéèàùâêîôûüäöüß0123456789.,;:!?()-"\'/ \n\t€$%',
            preserve_interword_spaces: '1',
          })
          
          // Add timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OCR timeout after 20 seconds')), 20000)
          })
          
          const { data } = await Promise.race([ocrPromise, timeoutPromise]) as any
          
          const text = data.text || ''
          const confidence = data.confidence || 0
          
          console.log(`📊 PSM ${psm} result: ${text.length} chars, confidence: ${confidence.toFixed(1)}%`)
          
          // Use result with most text or highest confidence
          if (text.length > bestResult.text.length || (text.length > 0 && confidence > bestResult.confidence)) {
            bestResult = { text, confidence }
            console.log(`✅ PSM ${psm} is better (${text.length} chars, ${confidence.toFixed(1)}% confidence)`)
          }
          
          // Early exit: If we got a good result from PSM 3, skip other modes for speed
          if (psm === 3 && text.length > 100 && confidence > 50) {
            console.log(`✅ Good result from PSM 3 (${text.length} chars, ${confidence.toFixed(1)}% confidence), skipping other modes for speed`)
            break
          }
        } catch (psmError) {
          console.warn(`⚠️ PSM ${psm} failed:`, psmError instanceof Error ? psmError.message : String(psmError))
          // Continue with next PSM mode
        }
      }
      
      const ocrText = bestResult.text
      console.log(`✅ OCR completed: ${ocrText.length} characters extracted (best from ${psmModes.length} PSM modes)`)
      
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
   * Perform OCR using Gemini Vision API (fallback when Tesseract fails)
   * Uses Gemini's vision capabilities to extract text from images/PDFs
   */
  private async performGeminiVisionOCR(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      // Initialize Gemini if not already done
      if (!this.genAI) {
        await this.initGemini()
      }

      if (!this.genAI || !process.env.GEMINI_API_KEY) {
        console.warn('⚠️ Gemini API key not configured, skipping Gemini Vision OCR')
        return ''
      }

      console.log('🔍 Starting Gemini Vision OCR...')

      // Convert PDF to image if needed
      let imageBuffer = buffer
      let imageMimeType = mimeType

      if (mimeType === 'application/pdf') {
        try {
          console.log('📄 Converting PDF to image for Gemini Vision OCR...')
          
          imageBuffer = await this.convertPdfToImage(buffer, 1, {
            density: 200, // Reduced from 300 for faster processing
            format: 'png',
            width: 1500, // Reduced from 2000 for faster processing
            height: 1500,
          })
          
          imageMimeType = 'image/png'
          console.log('✅ PDF converted to image for Gemini Vision OCR')
        } catch (error) {
          console.error('❌ PDF to image conversion error for Gemini Vision:', error)
          console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
          return ''
        }
      }

      // Convert buffer to base64 for Gemini Vision API
      const base64Image = imageBuffer.toString('base64')

      // Use Gemini Vision model with fallback options
      const modelOptions = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro']
      let ocrText = ''
      let lastError: Error | null = null
      
      for (const modelName of modelOptions) {
        try {
          console.log(`🔍 Trying Gemini model: ${modelName}...`)
          const model = this.genAI.getGenerativeModel({ model: modelName })
          
          const prompt = `Extract all text from this document image. Include all visible text, numbers, dates, and information. Preserve the structure and formatting as much as possible. If this is a passport, ID card, contract, or official document, extract all relevant details including dates, names, numbers, and any other important information. Return only the extracted text, no explanations.`

          const result = await model.generateContent([
            {
              inlineData: {
                data: base64Image,
                mimeType: imageMimeType,
              },
            },
            prompt,
          ])

          const response = await result.response
          ocrText = response.text() || ''

          if (ocrText.length > 0) {
            console.log(`✅ Gemini Vision OCR (${modelName}) extracted ${ocrText.length} characters`)
            console.log(`📝 Gemini OCR text preview: ${ocrText.substring(0, 200)}...`)
            return ocrText
          } else {
            console.warn(`⚠️ Gemini model ${modelName} returned no text, trying next model...`)
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          console.warn(`⚠️ Gemini model ${modelName} failed:`, lastError.message)
          // Continue to next model
          continue
        }
      }
      
      // If all models failed
      if (ocrText.length === 0) {
        console.error('❌ All Gemini Vision models failed')
        if (lastError) {
          console.error('❌ Last error:', lastError.message)
        }
        return ''
      }
      
      return ocrText
    } catch (error) {
      console.error('❌ Gemini Vision OCR error:', error)
      // Don't throw - return empty string so Tesseract result can still be used
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

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

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
        // Convert first page of PDF to thumbnail image using ImageMagick
        try {
          const pdfImageBuffer = await this.convertPdfToImage(fileBuffer, 1, {
            density: 200,           // Lower density for thumbnails (faster)
            format: 'jpg',
            width: 300,
            height: 300,
          })
          
          if (pdfImageBuffer && pdfImageBuffer.length > 0) {
            // Resize to thumbnail
            return await sharpModule.default(pdfImageBuffer)
              .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer()
          }
        } catch (error) {
          console.error('❌ PDF thumbnail generation error:', error)
          console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
        }
        return Buffer.from('')
      }
    } catch (error) {
      console.error('❌ Thumbnail generation error:', error)
    }

    return Buffer.from('')
  }
}

