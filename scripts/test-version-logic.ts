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

async function testVersionLogic() {
  console.log('🔍 Testing Version Logic\n')
  
  // Get documents with versions
  const { data: documents } = await supabase
    .from('documents')
    .select('id, file_name')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (!documents || documents.length === 0) {
    console.log('No documents found')
    return
  }
  
  for (const doc of documents) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`📄 Document: ${doc.file_name}`)
    console.log(`   ID: ${doc.id}`)
    
    // Test the logic from GET /versions
    console.log(`\n🔍 Testing GET /versions logic:`)
    
    // Step 1: Check if this document is a child
    const { data: childVersion } = await supabase
      .from('document_versions')
      .select('metadata')
      .eq('document_id', doc.id)
      .not('metadata->>parent_document_id', 'is', null)
      .limit(1)
      .single()
    
    let parentDocumentId = doc.id
    if (childVersion?.metadata?.parent_document_id) {
      parentDocumentId = childVersion.metadata.parent_document_id
      console.log(`   ✅ Found parent: ${parentDocumentId}`)
    } else {
      console.log(`   ℹ️  This is the parent document`)
    }
    
    // Step 2: Get all versions for parent
    const { data: versions } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', parentDocumentId)
      .order('version_number', { ascending: true })
    
    if (!versions || versions.length === 0) {
      console.log(`   ℹ️  No versions found`)
      continue
    }
    
    console.log(`\n   📊 Found ${versions.length} version entries:`)
    versions.forEach((v: any) => {
      console.log(`      Version ${v.version_number}:`)
      console.log(`        - id: ${v.id}`)
      console.log(`        - document_id: ${v.document_id}`)
      console.log(`        - new_document_id: ${v.metadata?.new_document_id || 'null'}`)
      console.log(`        - parent_document_id: ${v.metadata?.parent_document_id || 'null'}`)
    })
    
    // Step 3: Deduplicate
    console.log(`\n   🔄 Deduplication:`)
    const versionMap = new Map<number, any>()
    
    for (const version of versions) {
      const versionNum = version.version_number
      const hasNewDocId = !!version.metadata?.new_document_id
      
      if (!versionMap.has(versionNum)) {
        versionMap.set(versionNum, version)
        console.log(`      Version ${versionNum}: Added (first entry)`)
      } else {
        const existing = versionMap.get(versionNum)
        const existingHasNewDocId = !!existing.metadata?.new_document_id
        
        if (versionNum === 1) {
          if (!hasNewDocId && existingHasNewDocId) {
            versionMap.set(versionNum, version)
            console.log(`      Version ${versionNum}: Replaced (prefer without new_document_id)`)
          } else {
            console.log(`      Version ${versionNum}: Kept existing`)
          }
        } else {
          if (hasNewDocId && !existingHasNewDocId) {
            versionMap.set(versionNum, version)
            console.log(`      Version ${versionNum}: Replaced (prefer with new_document_id)`)
          } else {
            console.log(`      Version ${versionNum}: Kept existing`)
          }
        }
      }
    }
    
    // Step 4: Mark viewing version
    console.log(`\n   ✅ Final versions with is_viewing:`)
    const finalVersions = Array.from(versionMap.values())
    finalVersions.forEach((version: any) => {
      let isViewing = false
      
      if (doc.id === parentDocumentId) {
        isViewing = version.version_number === 1
      } else {
        isViewing = version.metadata?.new_document_id === doc.id
      }
      
      console.log(`      Version ${version.version_number}: is_viewing=${isViewing} (documentId=${doc.id}, parentDocumentId=${parentDocumentId})`)
    })
    
    // Test the logic from GET /list (NEW LOGIC)
    console.log(`\n🔍 Testing GET /list logic (NEW):`)
    
    // Step 1: Check if child first
    const { data: childVersionEntry } = await supabase
      .from('document_versions')
      .select('version_number, document_id')
      .eq('metadata->>new_document_id', doc.id)
      .limit(1)
      .single()
    
    if (childVersionEntry) {
      const { count } = await supabase
        .from('document_versions')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', childVersionEntry.document_id)
      
      console.log(`   ✅ This is child: version_number=${childVersionEntry.version_number}, version_count=${count || 0}`)
    } else {
      // Step 2: Check if parent (exclude child entries)
      const { data: parentVersions } = await supabase
        .from('document_versions')
        .select('version_number')
        .eq('document_id', doc.id)
        .is('metadata->>parent_document_id', null)
      
      if (parentVersions && parentVersions.length > 0) {
        console.log(`   ✅ This is parent: version_number=1, version_count=${parentVersions.length}`)
      } else {
        console.log(`   ℹ️  No version info found`)
      }
    }
  }
  
  console.log(`\n${'='.repeat(80)}\n`)
}

testVersionLogic()
  .then(() => {
    console.log('✅ Test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

