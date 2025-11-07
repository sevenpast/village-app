# URL Check Report - Municipality Links

**Datum:** 2025-11-06
**Status:** ⚠️ KRITISCH - 32 von 34 URLs sind defekt

## Zusammenfassung

- ✅ **Working:** 2 URLs
- ❌ **Broken:** 32 URLs (404, 403, Timeout)
- ⚠️ **Redirected:** 0 URLs

## Defekte URLs nach Gemeinde

### Allschwil
- ✅ `https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/` - OK
- ❌ `https://www.allschwil.ch/de/verwaltung/kontakt/` - 404
- ✅ `https://www.allschwil.ch/de/verwaltung/` - OK

### Basel
- ❌ `https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz/wohnsitz-an-und-abmeldung` - 404
- ❌ `https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz` - 404
- ❌ `https://www.bs.ch/de/buerger/dienstleistungen` - 404

**Hinweis:** Basel verwendet `bs.ch`, nicht `basel.ch`. Die URLs müssen korrigiert werden.

### Bern
- ❌ Alle URLs - 403 (Bot-Blocker?)
- `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten`
- `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt`
- `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste`

### Genf
- ❌ Alle URLs - 404
- `https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires`
- `https://www.geneve.ch/fr/themes/administration/etat-civil`

### Lausanne
- ❌ Alle URLs - 404
- `https://www.lausanne.ch/officiel/administration/etat-civil/contact-et-horaires`
- `https://www.lausanne.ch/officiel/administration/etat-civil`

### Lugano
- ❌ Alle URLs - 404
- `https://www.lugano.ch/temi/popolazione/anagrafe/orari`
- `https://www.lugano.ch/temi/popolazione/anagrafe/contatti`
- `https://www.lugano.ch/temi/popolazione/anagrafe`

### Luzern
- ❌ Alle URLs - 404
- `https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten`
- `https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt`
- `https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste`

### Neuenburg
- ❌ Alle URLs - 404
- `https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires`
- `https://www.neuchatelville.ch/fr/administration/etat-civil`

### St. Gallen
- ❌ Alle URLs - 404
- `https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten`
- `https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt`
- `https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste`

### Winterthur
- ❌ Alle URLs - 404
- `https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten`
- `https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt`
- `https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste`

### Zug
- ❌ Alle URLs - 404
- `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten`
- `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt`
- `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste`

### Zürich
- ❌ Alle URLs - 404
- `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten`
- `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt`
- `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste`
- `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten.html`

## Mögliche Ursachen

1. **Bot-Blocker:** Einige Websites (z.B. Bern) blockieren möglicherweise Bots mit 403
2. **URL-Struktur geändert:** Viele Websites haben ihre URL-Struktur geändert
3. **JavaScript-Rendering:** Viele Websites sind JavaScript-rendered (Nuxt.js, React), sodass curl die Seiten nicht richtig laden kann
4. **Falsche URLs:** Die URLs wurden möglicherweise nie korrekt validiert

## Empfohlene Maßnahmen

1. **Manuelle Überprüfung:** Jede URL sollte manuell im Browser getestet werden
2. **Dynamisches Scraping:** Statt hardcodierter URLs sollte das System die URLs dynamisch finden
3. **User-Agent:** Bessere User-Agent-Strings verwenden, um Bot-Blocker zu umgehen
4. **Fallback-Mechanismus:** Wenn URLs nicht funktionieren, sollte das System automatisch nach alternativen URLs suchen

## Nächste Schritte

1. ✅ URL-Check-Script erstellt (`scripts/check-urls-simple.sh`)
2. ⏳ Korrekte URLs für jede Gemeinde finden
3. ⏳ Migration erstellen, um alle URLs zu aktualisieren
4. ⏳ Code aktualisieren (`municipality-scraper.ts`)

