import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugVersions() {
  console.log('🔍 Fetching documents with versions...\n')
  
  // Get all documents
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, file_name, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (docsError) {
    console.error('❌ Error fetching documents:', docsError)
    return
  }
  
  console.log(`📄 Found ${documents?.length || 0} documents\n`)
  
  for (const doc of documents || []) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📄 Document: ${doc.file_name}`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   Created: ${doc.created_at}`)
    
    // Get all version records for this document
    const { data: versions, error: versionsError } = await supabase
      .from('document_versions')
      .select('*')
      .or(`document_id.eq.${doc.id},metadata->>new_document_id.eq.${doc.id},metadata->>parent_document_id.eq.${doc.id}`)
      .order('version_number', { ascending: true })
    
    if (versionsError) {
      console.error('   ❌ Error fetching versions:', versionsError)
      continue
    }
    
    if (!versions || versions.length === 0) {
      console.log('   ℹ️  No versions found')
      continue
    }
    
    console.log(`\n   📊 Found ${versions.length} version record(s):\n`)
    
    for (const version of versions) {
      console.log(`   Version ${version.version_number}:`)
      console.log(`     - ID: ${version.id}`)
      console.log(`     - document_id: ${version.document_id}`)
      console.log(`     - is_current: ${version.is_current}`)
      console.log(`     - parent_version_id: ${version.parent_version_id || 'null'}`)
      console.log(`     - metadata.new_document_id: ${version.metadata?.new_document_id || 'null'}`)
      console.log(`     - metadata.parent_document_id: ${version.metadata?.parent_document_id || 'null'}`)
      console.log(`     - change_summary: ${version.change_summary || 'null'}`)
      console.log('')
    }
  }
  
  console.log(`\n${'='.repeat(80)}\n`)
}

debugVersions()
  .then(() => {
    console.log('✅ Debug complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

