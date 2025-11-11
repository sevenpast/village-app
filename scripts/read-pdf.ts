/**
 * Script to read and extract text from a local PDF file
 */
import { readFileSync } from 'fs'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

import { DocumentProcessor } from '../lib/vault/document-processor'

async function readPDF(filePath: string) {
  try {
    console.log(`📄 Reading PDF: ${filePath}`)
    
    // Read file
    const buffer = readFileSync(filePath)
    console.log(`✅ File read: ${buffer.length} bytes`)
    
    // Process with DocumentProcessor
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
    console.log(`- Confidence: ${result.confidence}`)
    
    console.log(`\n📝 Extracted Text (first 2000 chars):`)
    console.log('='.repeat(80))
    console.log(result.extractedText.substring(0, 2000))
    if (result.extractedText.length > 2000) {
      console.log(`\n... (${result.extractedText.length - 2000} more characters)`)
    }
    console.log('='.repeat(80))
    
    return result
  } catch (error) {
    console.error('❌ Error reading PDF:', error)
    throw error
  }
}

// Run if called directly
const filePath = process.argv[2]
if (filePath) {
  readPDF(filePath)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed:', error)
      process.exit(1)
    })
} else {
  console.error('Usage: tsx scripts/read-pdf.ts <path-to-pdf>')
  process.exit(1)
}

