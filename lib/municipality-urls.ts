/**
 * Mapping table for special municipality URLs
 * Large cities often have different URL patterns than www.[name].ch
 * 
 * This mapping is used across the app to generate correct municipality website URLs.
 */

export const MUNICIPALITY_URL_MAP: Record<string, { base: string; registration?: string }> = {
  // Largest cities with special URLs
  // Format: { base: 'main website', registration: 'direct link to registration page' }
  'zürich': {
    base: 'https://www.stadt-zuerich.ch',
    registration: 'https://www.stadt-zuerich.ch/portal/de/index/politik_u_recht/einwohnerdienste/einreise_aufenthalt/wohnsitzanmeldung.html'
  },
  'zuerich': {
    base: 'https://www.stadt-zuerich.ch',
    registration: 'https://www.stadt-zuerich.ch/portal/de/index/politik_u_recht/einwohnerdienste/einreise_aufenthalt/wohnsitzanmeldung.html'
  },
  'genève': {
    base: 'https://www.ville-geneve.ch',
    registration: 'https://www.ville-geneve.ch/themes/etat-civil-population/etrangers/inscription-arrivee/'
  },
  'geneve': {
    base: 'https://www.ville-geneve.ch',
    registration: 'https://www.ville-geneve.ch/themes/etat-civil-population/etrangers/inscription-arrivee/'
  },
  'genf': {
    base: 'https://www.ville-geneve.ch',
    registration: 'https://www.ville-geneve.ch/themes/etat-civil-population/etrangers/inscription-arrivee/'
  },
  'basel': {
    base: 'https://www.bs.ch',
    registration: 'https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz/wohnsitz-an-und-abmeldung.html'
  },
  'bern': {
    base: 'https://www.bern.ch',
    registration: 'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/anmeldung'
  },
  'lausanne': {
    base: 'https://www.lausanne.ch',
    registration: 'https://www.lausanne.ch/vie-pratique/population/declaration-de-residence.html'
  },
  'winterthur': {
    base: 'https://stadt.winterthur.ch',
    registration: 'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'luzern': {
    base: 'https://www.stadtluzern.ch',
    registration: 'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'lucerne': {
    base: 'https://www.stadtluzern.ch',
    registration: 'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'st. gallen': {
    base: 'https://www.stadt.sg.ch',
    registration: 'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'st gallen': {
    base: 'https://www.stadt.sg.ch',
    registration: 'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'sankt gallen': {
    base: 'https://www.stadt.sg.ch',
    registration: 'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'lugano': {
    base: 'https://www.lugano.ch',
    registration: 'https://www.lugano.ch/temi/popolazione/anagrafe/iscrizione-anagrafica'
  },
  'biel': {
    base: 'https://www.biel-bienne.ch',
    registration: 'https://www.biel-bienne.ch/fr/administration/population/anmelden-wohnsitz.html'
  },
  'bienne': {
    base: 'https://www.biel-bienne.ch',
    registration: 'https://www.biel-bienne.ch/fr/administration/population/anmelden-wohnsitz.html'
  },
  'thun': {
    base: 'https://www.thun.ch',
    registration: 'https://www.thun.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'köniz': {
    base: 'https://www.koeniz.ch',
    registration: 'https://www.koeniz.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'koeniz': {
    base: 'https://www.koeniz.ch',
    registration: 'https://www.koeniz.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'schaffhausen': {
    base: 'https://www.schaffhausen.ch',
    registration: 'https://www.schaffhausen.ch/de/verwaltung/einwohnerdienste/wohnsitzanmeldung'
  },
  'fribourg': {
    base: 'https://www.fr.ch',
    registration: 'https://www.fr.ch/de/themen/population/buergeramt/anmeldung-umzug'
  },
  'freiburg': {
    base: 'https://www.fr.ch',
    registration: 'https://www.fr.ch/de/themen/population/buergeramt/anmeldung-umzug'
  },
  'chur': {
    base: 'https://www.chur.ch',
    registration: 'https://www.chur.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'neuenburg': {
    base: 'https://www.ne.ch',
    registration: 'https://www.ne.ch/fr/themes/etat-civil-population/residence/declaration-residence'
  },
  'neuchâtel': {
    base: 'https://www.ne.ch',
    registration: 'https://www.ne.ch/fr/themes/etat-civil-population/residence/declaration-residence'
  },
  'zug': {
    base: 'https://www.stadtzug.ch',
    registration: 'https://www.stadtzug.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'schwyz': {
    base: 'https://www.schwyz.ch',
    registration: 'https://www.schwyz.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'uster': {
    base: 'https://www.uster.ch',
    registration: 'https://www.uster.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'sion': {
    base: 'https://www.sion.ch',
    registration: 'https://www.sion.ch/themes/population/etat-civil/inscription-de-residence'
  },
  'frauenfeld': {
    base: 'https://www.frauenfeld.ch',
    registration: 'https://www.frauenfeld.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'aarau': {
    base: 'https://www.aarau.ch',
    registration: 'https://www.aarau.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'rapperswil-jona': {
    base: 'https://www.rapperswil-jona.ch',
    registration: 'https://www.rapperswil-jona.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'rapperswil jona': {
    base: 'https://www.rapperswil-jona.ch',
    registration: 'https://www.rapperswil-jona.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'schaan': {
    base: 'https://www.schaan.li',
    registration: 'https://www.schaan.li/verwaltung/einwohnerdienste/anmeldung'
  },
  'vaduz': {
    base: 'https://www.vaduz.li',
    registration: 'https://www.vaduz.li/verwaltung/einwohnerdienste/anmeldung'
  },
  // Additional municipalities (Top 50)
  'dübendorf': {
    base: 'https://www.duebendorf.ch',
    registration: 'https://www.duebendorf.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'kreuzlingen': {
    base: 'https://www.kreuzlingen.ch',
    registration: 'https://www.kreuzlingen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'baden': {
    base: 'https://www.baden.ch',
    registration: 'https://www.baden.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'wädenswil': {
    base: 'https://www.waedenswil.ch',
    registration: 'https://www.waedenswil.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'waedenswil': {
    base: 'https://www.waedenswil.ch',
    registration: 'https://www.waedenswil.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'wettingen': {
    base: 'https://www.wettingen.ch',
    registration: 'https://www.wettingen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'wil': {
    base: 'https://www.stadtwil.ch',
    registration: 'https://www.stadtwil.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'rheinfelden': {
    base: 'https://www.rheinfelden.ch',
    registration: 'https://www.rheinfelden.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'meyrin': {
    base: 'https://www.meyrin.ch',
    registration: 'https://www.meyrin.ch/themes/population/inscription-residence'
  },
  'montreux': {
    base: 'https://www.montreux.ch',
    registration: 'https://www.montreux.ch/services/etat-civil/declaration-de-residence'
  },
  'emmen': {
    base: 'https://www.emmen.ch',
    registration: 'https://www.emmen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'adliswil': {
    base: 'https://www.adliswil.ch',
    registration: 'https://www.adliswil.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'prilly': {
    base: 'https://www.prilly.ch',
    registration: 'https://www.prilly.ch/services/etat-civil/declaration-de-residence'
  },
  'schwerzenbach': {
    base: 'https://www.schwerzenbach.ch',
    registration: 'https://www.schwerzenbach.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'renens': {
    base: 'https://www.renens.ch',
    registration: 'https://www.renens.ch/services/etat-civil/declaration-de-residence'
  },
  'langenthal': {
    base: 'https://www.langenthal.ch',
    registration: 'https://www.langenthal.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'reinach': {
    base: 'https://www.reinach.ch',
    registration: 'https://www.reinach.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'brig-glis': {
    base: 'https://www.brig-glis.ch',
    registration: 'https://www.brig-glis.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'brig glis': {
    base: 'https://www.brig-glis.ch',
    registration: 'https://www.brig-glis.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'richterswil': {
    base: 'https://www.richterswil.ch',
    registration: 'https://www.richterswil.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'vevey': {
    base: 'https://www.vevey.ch',
    registration: 'https://www.vevey.ch/services/etat-civil/declaration-de-residence'
  },
  'hinterkappelen': {
    base: 'https://www.hinterkappelen.ch',
    registration: 'https://www.hinterkappelen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'horgen': {
    base: 'https://www.horgen.ch',
    registration: 'https://www.horgen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'onex': {
    base: 'https://www.onex.ch',
    registration: 'https://www.onex.ch/themes/population/inscription-residence'
  },
  'plan-les-ouates': {
    base: 'https://www.plan-les-ouates.ch',
    registration: 'https://www.plan-les-ouates.ch/themes/population/inscription-residence'
  },
  'plan les ouates': {
    base: 'https://www.plan-les-ouates.ch',
    registration: 'https://www.plan-les-ouates.ch/themes/population/inscription-residence'
  },
  'schlieren': {
    base: 'https://www.schlieren.ch',
    registration: 'https://www.schlieren.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'volketswil': {
    base: 'https://www.volketswil.ch',
    registration: 'https://www.volketswil.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'bülach': {
    base: 'https://www.buelach.ch',
    registration: 'https://www.buelach.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'buelach': {
    base: 'https://www.buelach.ch',
    registration: 'https://www.buelach.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'glarus nord': {
    base: 'https://www.glarus-nord.ch',
    registration: 'https://www.glarus-nord.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'morges': {
    base: 'https://www.morges.ch',
    registration: 'https://www.morges.ch/services/etat-civil/declaration-de-residence'
  },
  'bassersdorf': {
    base: 'https://www.bassersdorf.ch',
    registration: 'https://www.bassersdorf.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'locarno': {
    base: 'https://www.locarno.ch',
    registration: 'https://www.locarno.ch/temi/popolazione/anagrafe/iscrizione-anagrafica'
  },
  'steffisburg': {
    base: 'https://www.steffisburg.ch',
    registration: 'https://www.steffisburg.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'bellinzona': {
    base: 'https://www.bellinzona.ch',
    registration: 'https://www.bellinzona.ch/temi/popolazione/anagrafe/iscrizione-anagrafica'
  },
  'dietikon': {
    base: 'https://www.dietikon.ch',
    registration: 'https://www.dietikon.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'pfäffikon': {
    base: 'https://www.pfaeffikon.ch',
    registration: 'https://www.pfaeffikon.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'pfaeffikon': {
    base: 'https://www.pfaeffikon.ch',
    registration: 'https://www.pfaeffikon.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'lachen': {
    base: 'https://www.lachen.ch',
    registration: 'https://www.lachen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'yverdon-les-bains': {
    base: 'https://www.yverdon-les-bains.ch',
    registration: 'https://www.yverdon-les-bains.ch/services/etat-civil/declaration-de-residence'
  },
  'yverdon les bains': {
    base: 'https://www.yverdon-les-bains.ch',
    registration: 'https://www.yverdon-les-bains.ch/services/etat-civil/declaration-de-residence'
  },
  'carouge': {
    base: 'https://www.carouge.ch',
    registration: 'https://www.carouge.ch/themes/population/inscription-residence'
  },
  'thörishaus': {
    base: 'https://www.thoerishaus.ch',
    registration: 'https://www.thoerishaus.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'thoerishaus': {
    base: 'https://www.thoerishaus.ch',
    registration: 'https://www.thoerishaus.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'wetzikon': {
    base: 'https://www.wetzikon.ch',
    registration: 'https://www.wetzikon.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'mellingen': {
    base: 'https://www.mellingen.ch',
    registration: 'https://www.mellingen.ch/verwaltung/einwohnerdienste/anmeldung'
  },
  'allschwil': {
    base: 'https://www.allschwil.ch',
    registration: 'https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/'
  },
}

/**
 * Normalizes municipality name for lookup (lowercase, removes special chars)
 */
export function normalizeMunicipalityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m] || m))
}

/**
 * Gets municipality website URL from name
 * Uses mapping table for known municipalities, falls back to pattern for others
 * 
 * @param municipalityName - Name of the municipality
 * @param useRegistrationPage - If true, returns the specific registration page URL if available
 */
export function getMunicipalityUrl(
  municipalityName: string | null,
  useRegistrationPage: boolean = true
): string {
  if (!municipalityName) return '#'
  
  // Check mapping table first
  const normalized = normalizeMunicipalityName(municipalityName)
  const mapped = MUNICIPALITY_URL_MAP[normalized]
  
  if (mapped) {
    // If registration page is requested and available, use it
    if (useRegistrationPage && mapped.registration) {
      return mapped.registration
    }
    // Otherwise use base URL
    return mapped.base
  }
  
  // Fallback: pattern-based URL with common registration paths
  const cleanName = municipalityName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[äöü]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[m] || m))
    .replace(/[^a-z0-9-]/g, '')
  
  const baseUrl = `https://www.${cleanName}.ch`
  
  // For unknown municipalities: Try to find registration page
  if (useRegistrationPage) {
    // Strategy 1: Try common registration page paths
    // (These are the most common paths used by Swiss municipalities)
    const commonPaths = [
      '/anmeldung',
      '/einwohnerdienste/anmeldung',
      '/verwaltung/einwohnerdienste/anmeldung',
      '/wohnsitzanmeldung',
      '/anmelden',
      '/einwohnerdienste',
      '/services/etat-civil/declaration-de-residence', // French
      '/themes/population/inscription-residence', // French
      '/temi/popolazione/anagrafe/iscrizione-anagrafica', // Italian
    ]
    
    // For MVP: Return base URL with most common path
    // This will work for most smaller municipalities
    // Note: In production, we could enhance this with:
    // - Gemini AI to find the correct path dynamically
    // - Or check multiple paths and return the first that exists
    return `${baseUrl}${commonPaths[0]}`
  }
  
  return baseUrl
}

