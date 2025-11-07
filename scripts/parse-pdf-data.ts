/**
 * Script to parse and extract structured data from "Behördeninformationen für Expatriates.pdf"
 * This script extracts URLs, phone numbers, emails, and opening hours from the PDF
 */

import { readFileSync } from 'fs'
import { join } from 'path'

async function parsePDFData(pdfPath: string) {
  try {
    const pdfBuffer = readFileSync(pdfPath)
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: pdfBuffer })
    const pdfData = await parser.getText()
    
    console.log('📄 PDF extracted successfully')
    console.log(`   Text length: ${pdfData.text.length} chars\n`)
    
    const text = pdfData.text
    
    // Extract all URLs
    const urlPattern = /https?:\/\/[^\s\)]+/g
    const urls = [...new Set(text.match(urlPattern) || [])]
    console.log(`🔗 Found ${urls.length} unique URLs`)
    
    // Extract all phone numbers
    const phonePattern = /(\+41\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/g
    const phones = [...new Set(text.match(phonePattern) || [])]
    console.log(`📞 Found ${phones.length} unique phone numbers`)
    
    // Extract all emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const emails = [...new Set(text.match(emailPattern) || [])]
    console.log(`📧 Found ${emails.length} unique emails`)
    
    // Extract municipality sections with their data
    const municipalities: Array<{
      name: string
      kanton: string
      einwohnerdienste?: { telefon?: string; email?: string; url?: string }
      schulamt?: { telefon?: string; email?: string; url?: string }
      migrationsamt?: { telefon?: string; email?: string; url?: string }
    }> = []
    
    // Split by major sections (Kantone)
    const sections = text.split(/Region\s+[^\n]+\(Kanton\s+[^\)]+\)/)
    
    for (const section of sections.slice(1)) { // Skip first empty section
      // Find Kanton name
      const kantonMatch = text.substring(text.indexOf(section) - 100, text.indexOf(section)).match(/Kanton\s+([^\)]+)/)
      const kanton = kantonMatch ? kantonMatch[1].trim() : ''
      
      // Find Gemeinden in this section
      const gemeindeMatches = section.matchAll(/(\d+\.\d+\.)\s+([^\n]+?)\s+\(Gemeinde\)/g)
      
      for (const match of gemeindeMatches) {
        const gemeindeName = match[2].trim()
        const gemeindeSection = section.substring(section.indexOf(match[0]))
        
        const muni: any = {
          name: gemeindeName,
          kanton: kanton,
        }
        
        // Extract Einwohnerdienste data
        const einwohnerMatch = gemeindeSection.match(/Einwohnerdienste|Einwohneramt|Einwohnerkontrolle|Contrôle des habitants|Controllo abitanti/)
        if (einwohnerMatch) {
          const einwohnerSection = gemeindeSection.substring(gemeindeSection.indexOf(einwohnerMatch[0]), gemeindeSection.indexOf(einwohnerMatch[0]) + 2000)
          
          const telefon = einwohnerSection.match(/(\+41\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/)
          const email = einwohnerSection.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
          const url = einwohnerSection.match(/(https?:\/\/[^\s\)]+)/)
          
          if (telefon || email || url) {
            muni.einwohnerdienste = {}
            if (telefon) muni.einwohnerdienste.telefon = telefon[0]
            if (email) muni.einwohnerdienste.email = email[0]
            if (url) muni.einwohnerdienste.url = url[0]
          }
        }
        
        // Extract Schulamt data
        const schulMatch = gemeindeSection.match(/Schulamt|Schulverwaltung|Service des écoles|Istituto scolastico|Bureau des Ecoles|Secteur éducation/)
        if (schulMatch) {
          const schulSection = gemeindeSection.substring(gemeindeSection.indexOf(schulMatch[0]), gemeindeSection.indexOf(schulMatch[0]) + 2000)
          
          const telefon = schulSection.match(/(\+41\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}|0\d{2}\s*\d{3}\s*\d{2}\s*\d{2})/)
          const email = schulSection.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
          const url = schulSection.match(/(https?:\/\/[^\s\)]+)/)
          
          if (telefon || email || url) {
            muni.schulamt = {}
            if (telefon) muni.schulamt.telefon = telefon[0]
            if (email) muni.schulamt.email = email[0]
            if (url) muni.schulamt.url = url[0]
          }
        }
        
        if (muni.einwohnerdienste || muni.schulamt) {
          municipalities.push(muni)
        }
      }
    }
    
    console.log(`\n🏘️  Found ${municipalities.length} municipalities with data\n`)
    
    // Display summary
    console.log('📋 EXTRACTED MUNICIPALITY DATA:\n')
    console.log('='.repeat(80))
    
    for (const muni of municipalities) {
      console.log(`\n${muni.name} (${muni.kanton})`)
      if (muni.einwohnerdienste) {
        console.log('  Einwohnerdienste:')
        if (muni.einwohnerdienste.telefon) console.log(`    📞 ${muni.einwohnerdienste.telefon}`)
        if (muni.einwohnerdienste.email) console.log(`    📧 ${muni.einwohnerdienste.email}`)
        if (muni.einwohnerdienste.url) console.log(`    🔗 ${muni.einwohnerdienste.url}`)
      }
      if (muni.schulamt) {
        console.log('  Schulamt:')
        if (muni.schulamt.telefon) console.log(`    📞 ${muni.schulamt.telefon}`)
        if (muni.schulamt.email) console.log(`    📧 ${muni.schulamt.email}`)
        if (muni.schulamt.url) console.log(`    🔗 ${muni.schulamt.url}`)
      }
    }
    
    // Generate SQL update statements
    console.log('\n\n📝 SQL UPDATE STATEMENTS:\n')
    console.log('='.repeat(80))
    
    for (const muni of municipalities) {
      // Try to find BFS number (we'll need to match by name)
      if (muni.einwohnerdienste?.url) {
        console.log(`-- ${muni.name} (${muni.kanton})`)
        console.log(`-- URL: ${muni.einwohnerdienste.url}`)
        console.log(`-- UPDATE municipality_master_data SET registration_pages = array_append(registration_pages, '${muni.einwohnerdienste.url}') WHERE gemeinde_name ILIKE '%${muni.name}%' AND kanton = '${muni.kanton}';`)
        console.log('')
      }
    }
    
    // Save to JSON for further processing
    const fs = require('fs')
    fs.writeFileSync(
      join(process.cwd(), 'extracted-municipality-data.json'),
      JSON.stringify(municipalities, null, 2)
    )
    console.log('\n💾 Saved extracted data to: extracted-municipality-data.json')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

const pdfPath = process.argv[2] || join(process.cwd(), 'Behördeninformationen für Expatriates.pdf')
parsePDFData(pdfPath)

