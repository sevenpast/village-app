/**
 * Script to import municipality data from the PDF "Behördeninformationen für Expatriates.pdf"
 * Extracts structured data and updates the database
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface MunicipalityData {
  gemeinde_name: string
  kanton: string
  einwohnerdienste?: {
    telefon?: string
    email?: string
    adresse?: string
    url?: string
    oeffnungszeiten?: string
  }
  schulamt?: {
    telefon?: string
    email?: string
    adresse?: string
    url?: string
  }
  migrationsamt?: {
    telefon?: string
    email?: string
    adresse?: string
    url?: string
    oeffnungszeiten?: string
  }
  steueramt?: {
    telefon?: string
    email?: string
    adresse?: string
    url?: string
  }
}

async function extractMunicipalityDataFromPDF(pdfPath: string) {
  try {
    const pdfBuffer = readFileSync(pdfPath)
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: pdfBuffer })
    const pdfData = await parser.getText()
    
    console.log('📄 PDF extracted successfully')
    console.log(`   Text length: ${pdfData.text.length} chars`)
    
    // Parse the structured data from PDF
    const municipalities: MunicipalityData[] = []
    
    // Extract data using regex patterns
    const text = pdfData.text
    
    // Pattern to find municipality sections
    // Look for patterns like "1.2. Stadt Zürich (Gemeinde)" or "2.2. Ville de Genève (Gemeinde)"
    const gemeindePattern = /(\d+\.\d+\.)\s+([^\n]+?)\s+\(Gemeinde\)/g
    const kantonPattern = /Region\s+([^\n]+?)\s+\(Kanton\s+([^\)]+)\)/g
    
    let currentKanton = ''
    let currentGemeinde = ''
    
    // Extract kantonal data first
    const kantonData: Record<string, any> = {}
    
    // Extract municipality data
    const lines = text.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Detect Kanton
      const kantonMatch = line.match(/Region\s+([^\n]+?)\s+\(Kanton\s+([^\)]+)\)/)
      if (kantonMatch) {
        currentKanton = kantonMatch[2].trim()
        console.log(`\n📍 Found Kanton: ${currentKanton}`)
      }
      
      // Detect Gemeinde
      const gemeindeMatch = line.match(/(\d+\.\d+\.)\s+([^\n]+?)\s+\(Gemeinde\)/)
      if (gemeindeMatch) {
        currentGemeinde = gemeindeMatch[2].trim()
        console.log(`\n  🏘️  Found Gemeinde: ${currentGemeinde}`)
        
        const muniData: MunicipalityData = {
          gemeinde_name: currentGemeinde,
          kanton: currentKanton,
        }
        
        // Look ahead for contact information
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          const nextLine = lines[j]
          
          // Einwohnerdienste
          if (nextLine.includes('Einwohnerdienste') || nextLine.includes('Einwohneramt') || 
              nextLine.includes('Einwohnerkontrolle') || nextLine.includes('Contrôle des habitants') ||
              nextLine.includes('Controllo abitanti')) {
            // Look for phone, email, URL in following lines
            for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
              const dataLine = lines[k]
              if (dataLine.match(/\+41\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/) || dataLine.match(/0\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/)) {
                muniData.einwohnerdienste = muniData.einwohnerdienste || {}
                muniData.einwohnerdienste.telefon = dataLine.trim()
              }
              if (dataLine.includes('@') && dataLine.includes('.')) {
                muniData.einwohnerdienste = muniData.einwohnerdienste || {}
                muniData.einwohnerdienste.email = dataLine.trim()
              }
              if (dataLine.includes('http')) {
                muniData.einwohnerdienste = muniData.einwohnerdienste || {}
                muniData.einwohnerdienste.url = dataLine.trim()
              }
            }
          }
          
          // Schulamt
          if (nextLine.includes('Schulamt') || nextLine.includes('Schulverwaltung') || 
              nextLine.includes('Service des écoles') || nextLine.includes('Istituto scolastico')) {
            for (let k = j + 1; k < Math.min(j + 10, lines.length); k++) {
              const dataLine = lines[k]
              if (dataLine.match(/\+41\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/) || dataLine.match(/0\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/)) {
                muniData.schulamt = muniData.schulamt || {}
                muniData.schulamt.telefon = dataLine.trim()
              }
              if (dataLine.includes('@') && dataLine.includes('.')) {
                muniData.schulamt = muniData.schulamt || {}
                muniData.schulamt.email = dataLine.trim()
              }
              if (dataLine.includes('http')) {
                muniData.schulamt = muniData.schulamt || {}
                muniData.schulamt.url = dataLine.trim()
              }
            }
          }
        }
        
        if (muniData.einwohnerdienste || muniData.schulamt) {
          municipalities.push(muniData)
          console.log(`     ✓ Extracted data for ${currentGemeinde}`)
        }
      }
    }
    
    console.log(`\n📊 Extracted ${municipalities.length} municipalities`)
    
    // Now update the database
    console.log('\n💾 Updating database...')
    
    for (const muni of municipalities) {
      // Find BFS number
      const { data: existing } = await supabase
        .from('municipality_master_data')
        .select('bfs_nummer, gemeinde_name')
        .ilike('gemeinde_name', `%${muni.gemeinde_name}%`)
        .eq('kanton', muni.kanton)
        .maybeSingle()
      
      if (existing) {
        console.log(`  ✓ Found ${muni.gemeinde_name} (BFS: ${existing.bfs_nummer})`)
        
        // Update registration pages if URL found
        if (muni.einwohnerdienste?.url) {
          const { data: current } = await supabase
            .from('municipality_master_data')
            .select('registration_pages')
            .eq('bfs_nummer', existing.bfs_nummer)
            .single()
          
          const currentPages = current?.registration_pages || []
          const newUrl = muni.einwohnerdienste.url
          
          if (!currentPages.includes(newUrl)) {
            await supabase
              .from('municipality_master_data')
              .update({
                registration_pages: [...currentPages, newUrl],
                updated_at: new Date().toISOString(),
              })
              .eq('bfs_nummer', existing.bfs_nummer)
            
            console.log(`    ✓ Added URL: ${newUrl}`)
          }
        }
      } else {
        console.log(`  ⚠ ${muni.gemeinde_name} not found in database`)
      }
    }
    
    console.log('\n✅ Import complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

const pdfPath = process.argv[2] || join(process.cwd(), 'Behördeninformationen für Expatriates.pdf')
extractMunicipalityDataFromPDF(pdfPath)



















