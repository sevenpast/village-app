import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

// Map document requirement strings to vault document types
function mapRequirementToDocType(requirement: string): string[] {
  const lower = requirement.toLowerCase()
  
  // Priority-based matching (more specific first)
  if (lower.includes('passport/id') || lower.includes('passport or id') || lower.includes('passport/id')) {
    return ['passport']
  }
  if (lower.includes('passport') && (lower.includes('family') || lower.includes('child'))) {
    return ['passport']
  }
  if (lower.includes('passport')) {
    return ['passport']
  }
  if (lower.includes('child') && lower.includes('passport')) {
    return ['passport']
  }
  if (lower.includes('id') && !lower.includes('proof') && !lower.includes('insurance')) {
    return ['passport']
  }
  
  if (lower.includes('marriage certificate')) {
    return ['marriage_certificate']
  }
  if (lower.includes('birth certificate')) {
    return ['birth_certificate']
  }
  if (lower.includes('family book')) {
    // Family book is a Swiss document - could be marriage or birth certificates
    return ['marriage_certificate', 'birth_certificate']
  }
  if (lower.includes('divorce certificate')) {
    return ['marriage_certificate'] // Closest match
  }
  
  if (lower.includes('employment contract')) {
    return ['employment_contract']
  }
  if (lower.includes('rental contract') || lower.includes('landlord confirmation')) {
    return ['rental_contract']
  }
  if (lower.includes('proof of address')) {
    return ['rental_contract'] // Usually rental contract
  }
  
  if (lower.includes('vaccination record') || lower.includes('vaccination')) {
    return ['vaccination_record']
  }
  
  if (lower.includes('residence permit')) {
    return ['residence_permit']
  }
  
  if (lower.includes('bank document') || lower.includes('bank')) {
    return ['bank_documents']
  }
  if (lower.includes('insurance document') || lower.includes('insurance')) {
    return ['insurance_documents']
  }
  if (lower.includes('school document') || lower.includes('school')) {
    return ['school_documents']
  }
  
  return []
}

// Get document requirements for each task
function getDocumentRequirements(taskId: number): string[] {
  switch (taskId) {
    case 1:
      return [
        'Passport/ID for each family member',
        'Employment contract (with length and hours)',
        'Rental contract or landlord confirmation',
      ]
    case 2:
      return [
        'Passport/ID for each family member',
        'For families: family book, marriage certificate, birth certificates, divorce certificate',
        'Employment contract (with length and hours)',
        'Rental contract or landlord confirmation',
      ]
    case 4:
      return [
        "Child's passport or ID",
        'Birth certificate',
        'Residence permit (if available)',
        'Proof of address (rental contract or confirmation)',
        'Vaccination record',
      ]
    default:
      return []
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const params = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskId = parseInt(params.taskId)
    if (isNaN(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID' },
        { status: 400 }
      )
    }

    // Get document requirements for this task
    const requirements = getDocumentRequirements(taskId)
    if (requirements.length === 0) {
      return NextResponse.json(
        { error: 'No document requirements for this task' },
        { status: 400 }
      )
    }

    // Get all user's documents from vault
    const { data: vaultDocuments, error: documentsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching documents:', documentsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    if (!vaultDocuments || vaultDocuments.length === 0) {
      return NextResponse.json(
        { error: 'No documents found in vault' },
        { status: 404 }
      )
    }

    // Debug: Log what we have
    console.log(`📋 Task ${taskId} requirements:`, requirements)
    console.log(`📦 Total vault documents:`, vaultDocuments.length)
    console.log(`📦 Vault document types:`, vaultDocuments.map(d => ({ 
      id: d.id, 
      document_type: d.document_type || d.type, // Support both
      file_name: d.file_name 
    })))

    // Map requirements to document types and find matching documents
    const matchingDocuments: any[] = []
    const usedDocIds = new Set<string>()

    for (const requirement of requirements) {
      const docTypes = mapRequirementToDocType(requirement)
      console.log(`🔍 Requirement "${requirement}" → types:`, docTypes)
      
      if (docTypes.length === 0) {
        console.log(`⚠️ No mapping found for requirement: "${requirement}"`)
        continue // Skip if no mapping found
      }

      // Find documents matching these types
      for (const docType of docTypes) {
        const matching = vaultDocuments.find(doc => {
          // Check if document type matches and hasn't been used yet
          // Note: The database column is 'document_type', not 'type'
          const docTypeValue = doc.document_type || doc.type // Support both for compatibility
          const matches = docTypeValue === docType && !usedDocIds.has(doc.id)
          if (matches) {
            console.log(`✅ Found match: ${doc.file_name} (document_type: ${docTypeValue}) for requirement "${requirement}"`)
          }
          return matches
        })

        if (matching) {
          matchingDocuments.push(matching)
          usedDocIds.add(matching.id)
          break // Only use one document per requirement
        } else {
          const availableTypes = [...new Set(vaultDocuments.map(d => d.document_type || d.type))]
          console.log(`❌ No document found with type "${docType}" for requirement "${requirement}"`)
          console.log(`   Available types in vault:`, availableTypes)
        }
      }
    }

    console.log(`📥 Matching documents found: ${matchingDocuments.length}`)
    console.log(`📥 Matching documents:`, matchingDocuments.map(d => ({ 
      id: d.id, 
      document_type: d.document_type || d.type,
      file_name: d.file_name 
    })))

    if (matchingDocuments.length === 0) {
      return NextResponse.json(
        { 
          error: 'No matching documents found in vault',
          debug: {
            requirements,
            availableTypes: [...new Set(vaultDocuments.map(d => d.document_type || d.type))],
            totalDocuments: vaultDocuments.length,
            documentDetails: vaultDocuments.map(d => ({ 
              document_type: d.document_type || d.type,
              file_name: d.file_name 
            }))
          }
        },
        { status: 404 }
      )
    }

    // Create ZIP file using JSZip
    const zip = new JSZip()

    // Download each document from storage and add to ZIP
    for (const doc of matchingDocuments) {
      try {
        // Use storage_path from database (column name is storage_path, not file_path)
        const storagePath = doc.storage_path || doc.file_path
        if (!storagePath) {
          console.warn(`⚠️ Document ${doc.id} has no storage_path`)
          continue
        }
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(storagePath)

        if (downloadError || !fileData) {
          console.warn(`Failed to download document ${doc.id}:`, downloadError)
          continue
        }

        // Convert Blob to ArrayBuffer
        const arrayBuffer = await fileData.arrayBuffer()

        // Add to ZIP with a meaningful filename
        const safeFileName = doc.file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
        zip.file(safeFileName, arrayBuffer)
      } catch (error) {
        console.warn(`Error processing document ${doc.id}:`, error)
        continue
      }
    }

    // Generate ZIP file as buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }, // Maximum compression
    })

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="task-${taskId}-documents.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error creating ZIP:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

