/**
 * Script to test processing the Impfdokumentation PDF directly
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

import { DocumentProcessor } from '../lib/vault/document-processor'

async function testImpfdokument() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get the document
    const documentId = 'a7bd2a39-e6b6-4ebc-b31b-3187aabbffc9'
    const userId = 'd69260cc-3434-4545-8eaa-8a5249cbf4ef'

    console.log(`📄 Loading document ${documentId}...`)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      console.error('❌ Document not found:', docError)
      return
    }

    console.log(`✅ Document found: ${document.file_name}`)
    console.log(`📊 Current status: ${document.processing_status}`)
    console.log(`📊 Current text length: ${document.extracted_text?.length || 0}`)

    // Download file
    console.log(`📥 Downloading file from storage: ${document.storage_path}`)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError || !fileData) {
      console.error('❌ Error downloading file:', downloadError)
      return
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`✅ File downloaded: ${buffer.length} bytes`)

    // Process document
    console.log(`\n🔄 Processing document with DocumentProcessor...`)
    const processor = new DocumentProcessor()
    const processed = await processor.processDocument(
      buffer,
      document.file_name,
      document.mime_type
    )

    console.log(`\n📊 Processing Results:`)
    console.log(`- Extracted text length: ${processed.extractedText.length} characters`)
    console.log(`- Document type: ${processed.documentType}`)
    console.log(`- Language: ${processed.language}`)
    console.log(`- Confidence: ${processed.confidence}`)

    if (processed.extractedText.length > 0) {
      console.log(`\n✅ SUCCESS! Text extracted successfully`)
      console.log(`\n📝 Extracted Text (first 500 chars):`)
      console.log('='.repeat(80))
      console.log(processed.extractedText.substring(0, 500))
      console.log('='.repeat(80))

      // Update document in database
      console.log(`\n💾 Saving to database...`)
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          extracted_text: processed.extractedText,
          processing_status: 'completed',
          processing_error: null,
        })
        .eq('id', documentId)

      if (updateError) {
        console.error('❌ Error updating document:', updateError)
      } else {
        console.log(`✅ Document updated successfully in database`)
      }
    } else {
      console.log(`\n❌ FAILED: No text extracted`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  }
}

testImpfdokument()
  .then(() => {
    console.log('\n✅ Test completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })


