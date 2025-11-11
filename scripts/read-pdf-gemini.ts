/**
 * Script to read PDF using Gemini Vision OCR directly
 */
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

async function readPDFWithGemini(filePath: string) {
  try {
    console.log(`📄 Reading PDF: ${filePath}`)
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables')
    }
    
    // Read file
    const buffer = readFileSync(filePath)
    console.log(`✅ File read: ${buffer.length} bytes`)
    
    // Try to send PDF directly to Gemini (if supported) or convert to image
    let base64Image: string
    let imageMimeType: string
    
    // Gemini 2.0 supports PDF directly, but let's try image first for better OCR
    try {
      console.log('📄 Converting PDF to image for Gemini Vision OCR...')
      const pdf2pic = await import('pdf2pic')
      const { fromBuffer } = pdf2pic.default || pdf2pic

      if (!fromBuffer) {
        throw new Error('pdf2pic.fromBuffer not available')
      }

      const convert = fromBuffer(buffer, {
        density: 300,
        saveFilename: 'temp',
        savePath: '/tmp',
        format: 'png',
        width: 2000,
        height: 2000,
        preserveAspectRatio: true,
      })

      const result = await convert(1, { responseType: 'buffer' })

      if (result && result.buffer && result.buffer.length > 0) {
        console.log(`✅ PDF converted to image: ${result.buffer.length} bytes`)
        base64Image = result.buffer.toString('base64')
        imageMimeType = 'image/png'
      } else {
        throw new Error('PDF conversion returned empty buffer')
      }
    } catch (conversionError) {
      console.warn('⚠️ PDF to image conversion failed, trying PDF directly:', conversionError instanceof Error ? conversionError.message : String(conversionError))
      // Fallback: try sending PDF directly (Gemini 2.0 might support it)
      base64Image = buffer.toString('base64')
      imageMimeType = 'application/pdf'
      console.log('📄 Using PDF directly (base64)')
    }
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
    
    const prompt = `Extract all text from this rental contract document. Include all visible text, numbers, dates, and information. Preserve the structure and formatting as much as possible. Focus on:
- Rental period (Mietzeit)
- Termination notice (Kündigung)
- Tenant name
- Property address
- Rental amount
- Any dates and deadlines
Return only the extracted text, no explanations.`

    console.log('🔍 Sending to Gemini Vision OCR...')
    const geminiResult = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: imageMimeType,
        },
      },
      prompt,
    ])

    const response = await geminiResult.response
    const extractedText = response.text()

    console.log(`\n✅ Text extracted: ${extractedText.length} characters`)
    console.log('\n📝 Extracted Text:')
    console.log('='.repeat(80))
    console.log(extractedText)
    console.log('='.repeat(80))
    
    return extractedText
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run if called directly
const filePath = process.argv[2]
if (filePath) {
  readPDFWithGemini(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed:', error)
      process.exit(1)
    })
} else {
  console.error('Usage: tsx scripts/read-pdf-gemini.ts <path-to-pdf>')
  process.exit(1)
}

