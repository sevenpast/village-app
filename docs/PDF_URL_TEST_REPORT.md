# PDF URL Test Report

**Datum:** 2025-11-06  
**Migration:** `041_update_municipality_pages_from_pdf.sql`  
**Status:** ⚠️ TEILWEISE FUNKTIONIEREND - 68% Erfolgsrate

## Zusammenfassung

- ✅ **Working:** 40 URLs (68%)
- ❌ **Broken:** 19 URLs (32%)
- ⚠️ **Redirected:** 0 URLs
- ⏱️ **Timeout/Error:** 0 URLs
- **Total:** 59 URLs

## Defekte URLs nach Gemeinde

### Winterthur (3 URLs defekt)
- ❌ `https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste` (HTTP 404)
- ❌ `https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt` (HTTP 404)
- ❌ `https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten` (HTTP 404)
- ✅ `https://stadt.winterthur.ch/themen/leben-in-winterthur/auslaenderinnen-und-auslaender/neu-in-winterthur` (OK)

**Empfehlung:** Die funktionierende URL behalten, die defekten entfernen oder korrigieren.

### Bern (2 URLs defekt)
- ❌ `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt` (HTTP 404)
- ❌ `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten` (HTTP 404)
- ✅ `https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/sue/polizeiinspektorat/einwohnerdienste-migration-und-fremdenpolizei-emf` (OK)
- ✅ `https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/bss/schulamt` (OK)

**Empfehlung:** Die funktionierenden URLs behalten, die defekten entfernen.

### Basel (3 URLs defekt)
- ❌ `https://www.bs.ch/de/buerger/dienstleistungen` (HTTP 404)
- ❌ `https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz` (HTTP 404)
- ❌ `https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz/wohnsitz-an-und-abmeldung` (HTTP 404)
- ✅ `https://www.bs.ch/jsd/bdm/bevoelkerungsamt/einwohneramt` (OK)
- ✅ `https://www.bs.ch/jsd/bdm/migrationsamt` (OK)

**Empfehlung:** Die funktionierenden URLs behalten, die defekten entfernen.

### Lugano (3 URLs defekt)
- ❌ `https://www.lugano.ch/temi/popolazione/anagrafe` (HTTP 404)
- ❌ `https://www.lugano.ch/temi/popolazione/anagrafe/contatti` (HTTP 404)
- ❌ `https://www.lugano.ch/temi/popolazione/anagrafe/orari` (HTTP 404)
- ✅ `https://www.lugano.ch/la-mia-citta/amministrazione/dicasteri-divisioni/dicastero-istituzioni/amministrazione-generale/controllo-abitanti/` (OK)
- ✅ `https://scuole.lugano.ch/Contatti/` (OK)

**Empfehlung:** Die funktionierenden URLs behalten, die defekten entfernen.

### Zürich (3 URLs defekt)
- ❌ `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste` (HTTP 404)
- ❌ `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt` (HTTP 404)
- ❌ `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten` (HTTP 404)
- ✅ `https://www.stadt-zuerich.ch/de/lebenslagen/einwohner-services/umziehen-melden/zuzug.html` (OK)

**Empfehlung:** Die funktionierende URL behalten, die defekten entfernen. Diese URLs sind bereits in `municipality-scraper.ts` als "top municipalities" definiert, aber scheinen veraltet zu sein.

### Zug (3 URLs defekt)
- ❌ `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste` (HTTP 404)
- ❌ `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt` (HTTP 404)
- ❌ `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten` (HTTP 404)
- ✅ `https://www.stadtschulenzug.ch/` (OK)

**Empfehlung:** Die funktionierende URL behalten, die defekten entfernen oder korrigieren.

### Nyon (1 URL defekt)
- ❌ `https://www.nyon.ch/administration/services-communaux/controle-des-habitants` (HTTP 404)

**Empfehlung:** URL korrigieren oder entfernen.

### Küsnacht (1 URL defekt)
- ❌ `https://www.kuesnacht.ch/gemeinde/verwaltung` (HTTP 404)
- ✅ `https://www.schule-kuesnacht.ch/service/an-abmeldung-schule/online-anmeldung-schule/p-377/` (OK)

**Empfehlung:** Die funktionierende URL behalten, die defekte entfernen.

## Empfohlene Maßnahmen

### Option 1: Migration mit funktionierenden URLs anwenden
- Entferne die 19 defekten URLs aus der Migration
- Wende die Migration nur mit den 40 funktionierenden URLs an
- **Vorteil:** Schnell, keine defekten URLs in der DB
- **Nachteil:** Weniger URLs pro Gemeinde

### Option 2: URLs manuell korrigieren
- Recherchiere die korrekten URLs für jede defekte URL
- Aktualisiere die Migration mit den korrigierten URLs
- **Vorteil:** Vollständige Abdeckung
- **Nachteil:** Zeitaufwändig

### Option 3: Hybrid-Ansatz
- Wende die Migration mit funktionierenden URLs an
- Korrigiere die defekten URLs später in einem separaten Update
- **Vorteil:** Balance zwischen Geschwindigkeit und Vollständigkeit

## Nächste Schritte

1. ✅ URL-Test durchgeführt
2. ⏳ Entscheidung: Welche Option bevorzugst du?
3. ⏳ Migration anpassen (falls nötig)
4. ⏳ Migration anwenden

## Funktionierende Gemeinden (100% Erfolgsrate)

- ✅ **Paradiso** (2/2 URLs)
- ✅ **Allschwil** (3/3 URLs)
- ✅ **Baar** (3/3 URLs)
- ✅ **Cham** (2/2 URLs)
- ✅ **Freienbach** (2/2 URLs)
- ✅ **Genf** (3/3 URLs)
- ✅ **Lausanne** (3/3 URLs)
- ✅ **Lugano** (2/5 URLs - aber 2 wichtige funktionieren)
- ✅ **Montreux** (3/3 URLs)
- ✅ **Reinach BL** (3/3 URLs)
- ✅ **Thalwil** (2/2 URLs)
- ✅ **Vevey** (2/2 URLs)
- ✅ **Wollerau** (2/2 URLs)

## Teilweise funktionierende Gemeinden

- ⚠️ **Winterthur** (1/4 URLs)
- ⚠️ **Bern** (2/4 URLs)
- ⚠️ **Basel** (2/5 URLs)
- ⚠️ **Lugano** (2/5 URLs)
- ⚠️ **Zürich** (1/4 URLs)
- ⚠️ **Zug** (1/4 URLs)
- ⚠️ **Nyon** (0/1 URLs)
- ⚠️ **Küsnacht** (1/2 URLs)

