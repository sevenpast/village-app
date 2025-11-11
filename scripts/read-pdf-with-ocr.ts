/**
 * Script to read PDF with OCR fallback
 */
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

async function readPDFWithOCR(filePath: string) {
  try {
    console.log(`📄 Reading PDF: ${filePath}`)
    
    // Try pdftotext first
    try {
      console.log('🔍 Trying pdftotext...')
      const { stdout, stderr } = await execAsync(`pdftotext "${filePath}" -`, {
        maxBuffer: 10 * 1024 * 1024,
        encoding: 'utf8'
      })
      
      const text = stdout.trim()
      if (text && text.length > 50) {
        console.log(`✅ pdftotext extracted ${text.length} characters`)
        console.log('\n📝 Extracted Text:')
        console.log('='.repeat(80))
        console.log(text)
        console.log('='.repeat(80))
        return text
      } else {
        console.log(`⚠️ pdftotext returned only ${text.length} characters, trying OCR...`)
      }
    } catch (pdftotextError) {
      console.log('⚠️ pdftotext failed, trying OCR...')
    }
    
    // If pdftotext failed, use DocumentProcessor with OCR
    console.log('🔍 Using DocumentProcessor with OCR...')
    const { DocumentProcessor } = await import('../lib/vault/document-processor')
    const buffer = readFileSync(filePath)
    const processor = new DocumentProcessor()
    
    const result = await processor.processDocument(
      buffer,
      filePath.split('/').pop() || 'document.pdf',
      'application/pdf'
    )
    
    console.log(`\n📊 Processing Results:`)
    console.log(`- Extracted text length: ${result.extractedText.length} characters`)
    console.log(`- Document type: ${result.documentType}`)
    console.log(`- Language: ${result.language}`)
    
    console.log(`\n📝 Extracted Text:`)
    console.log('='.repeat(80))
    console.log(result.extractedText)
    console.log('='.repeat(80))
    
    return result.extractedText
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run if called directly
const filePath = process.argv[2]
if (filePath) {
  readPDFWithOCR(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed:', error)
      process.exit(1)
    })
} else {
  console.error('Usage: tsx scripts/read-pdf-with-ocr.ts <path-to-pdf>')
  process.exit(1)
}

