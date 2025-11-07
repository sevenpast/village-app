/**
 * Script to extract opening hours from Basel PDF
 */

import { readFileSync } from 'fs'

async function extractOpeningHoursFromPDF(pdfPath: string) {
  try {
    const pdfBuffer = readFileSync(pdfPath)
    // Use require for CommonJS compatibility
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: pdfBuffer })
    const pdfData = await parser.getText()
    
    console.log('📄 PDF Info:')
    console.log(`   Pages: ${pdfData.numpages}`)
    console.log(`   Text length: ${pdfData.text.length} chars`)
    console.log('\n📝 Extracted Text:\n')
    console.log(pdfData.text)
    
    // Try to extract opening hours using regex
    const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
    const openingHours: Record<string, string> = {}
    
    for (const day of days) {
      // Look for patterns like "Montag: 08:00-11:00" or "Montag 8-11 Uhr"
      const regex = new RegExp(`${day}[:\\s]+([0-9]{1,2}[:.][0-9]{2}|[0-9]{1,2})[\\s-]+([0-9]{1,2}[:.][0-9]{2}|[0-9]{1,2})`, 'gi')
      const matches = pdfData.text.match(regex)
      if (matches) {
        console.log(`\n✓ Found ${day}: ${matches.join(', ')}`)
        openingHours[day] = matches[0].replace(`${day}`, '').trim()
      }
    }
    
    if (Object.keys(openingHours).length > 0) {
      console.log('\n✅ Extracted Opening Hours:')
      console.log(JSON.stringify(openingHours, null, 2))
    } else {
      console.log('\n⚠️ No opening hours found with regex, but text is available above')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

const pdfPath = process.argv[2] || '/tmp/basel_oeffnungszeiten.pdf'
extractOpeningHoursFromPDF(pdfPath)

