/**
 * EML File Generator
 * Creates .eml files with attachments that can be opened in native mail clients
 */

interface EmailAttachment {
  filename: string
  contentType: string
  data: string // base64 encoded
}

interface EmailOptions {
  to?: string
  subject?: string
  body?: string
  attachments?: EmailAttachment[]
}

/**
 * Converts a Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Downloads a file from a URL and returns it as a Blob
 * Uses API proxy endpoint to avoid CORS and authentication issues with Supabase Storage
 */
export async function downloadFileAsBlob(url: string): Promise<Blob> {
  try {
    // Check if this is a Supabase storage URL
    const isSupabaseStorage = url.includes('supabase.co/storage/v1/object/public')
    
    if (isSupabaseStorage) {
      // Use our API proxy endpoint to download the file
      const proxyUrl = `/api/vault/download?url=${encodeURIComponent(url)}`
      console.log('📥 Downloading via proxy:', proxyUrl)
      
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Failed to download file: ${errorData.error || response.statusText}`)
      }
      return await response.blob()
    } else {
      // For non-Supabase URLs, try direct fetch
      console.log('📥 Downloading directly:', url)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }
      return await response.blob()
    }
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}

/**
 * Generates an EML file content with attachments
 */
export function generateEMLContent(options: EmailOptions): string {
  const {
    to = '',
    subject = 'Document Attachment',
    body = 'Please find the attached document.',
    attachments = [],
  } = options

  // Generate a unique boundary
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`

  // Start building EML content
  let eml = `To: ${to}\r\n`
  eml += `Subject: ${subject}\r\n`
  eml += `MIME-Version: 1.0\r\n`
  eml += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`
  eml += `\r\n`

  // Add email body
  eml += `--${boundary}\r\n`
  eml += `Content-Type: text/plain; charset=utf-8\r\n`
  eml += `Content-Transfer-Encoding: 7bit\r\n`
  eml += `\r\n`
  eml += `${body}\r\n`
  eml += `\r\n`

  // Add attachments
  for (const attachment of attachments) {
    eml += `--${boundary}\r\n`
    eml += `Content-Type: ${attachment.contentType}; name="${attachment.filename}"\r\n`
    eml += `Content-Transfer-Encoding: base64\r\n`
    eml += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
    eml += `\r\n`
    // Base64 data should be split into lines of max 76 characters (RFC 2045)
    const base64Data = attachment.data.match(/.{1,76}/g) || []
    eml += base64Data.join('\r\n')
    eml += `\r\n`
    eml += `\r\n`
  }

  // Close boundary
  eml += `--${boundary}--\r\n`

  return eml
}

/**
 * Creates and downloads an EML file
 */
export function downloadEMLFile(emlContent: string, filename: string = 'email.eml'): void {
  // Create blob with proper MIME type
  const blob = new Blob([emlContent], { type: 'message/rfc822' })
  const url = URL.createObjectURL(blob)

  // Create download link
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Main function: Create EML file with document from URL
 */
export async function createEMLWithDocument(
  documentUrl: string,
  documentName: string,
  options: {
    to?: string
    subject?: string
    body?: string
  } = {}
): Promise<void> {
  try {
    console.log('📥 Downloading document from URL:', documentUrl)

    // Step 1: Download document as Blob
    const blob = await downloadFileAsBlob(documentUrl)

    // Step 2: Convert to base64
    const base64 = await blobToBase64(blob)
    console.log('✅ Document converted to base64, size:', base64.length, 'characters')

    // Step 3: Determine content type
    let contentType = 'application/octet-stream'
    if (documentName.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf'
    } else if (documentName.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
      contentType = `image/${documentName.split('.').pop()?.toLowerCase()}`
    }

    // Step 4: Generate EML content
    const emlContent = generateEMLContent({
      to: options.to || '',
      subject: options.subject || `Document: ${documentName}`,
      body: options.body || `Please find the attached document: ${documentName}`,
      attachments: [
        {
          filename: documentName,
          contentType,
          data: base64,
        },
      ],
    })

    // Step 5: Download EML file
    const emlFilename = `email_${documentName.replace(/\.[^.]+$/, '')}.eml`
    downloadEMLFile(emlContent, emlFilename)

    console.log('✅ EML file created and downloaded:', emlFilename)
  } catch (error) {
    console.error('❌ Error creating EML file:', error)
    throw error
  }
}

/**
 * Create EML with multiple documents
 */
export async function createEMLWithMultipleDocuments(
  documents: Array<{ url: string; name: string }>,
  options: {
    to?: string
    subject?: string
    body?: string
  } = {}
): Promise<void> {
  try {
    console.log('📥 Downloading', documents.length, 'document(s)')

    const attachments: EmailAttachment[] = []

    // Download all documents
    for (const doc of documents) {
      const blob = await downloadFileAsBlob(doc.url)
      const base64 = await blobToBase64(blob)

      let contentType = 'application/octet-stream'
      if (doc.name.toLowerCase().endsWith('.pdf')) {
        contentType = 'application/pdf'
      } else if (doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) {
        contentType = `image/${doc.name.split('.').pop()?.toLowerCase()}`
      }

      attachments.push({
        filename: doc.name,
        contentType,
        data: base64,
      })

      console.log('✅ Downloaded:', doc.name)
    }

    // Generate EML
    const emlContent = generateEMLContent({
      to: options.to || '',
      subject: options.subject || `Documents (${documents.length} files)`,
      body: options.body || `Please find the attached documents (${documents.length} files).`,
      attachments,
    })

    // Download EML file
    const emlFilename = `email_documents_${Date.now()}.eml`
    downloadEMLFile(emlContent, emlFilename)

    console.log('✅ EML file created with', attachments.length, 'attachment(s)')
  } catch (error) {
    console.error('❌ Error creating EML file:', error)
    throw error
  }
}

