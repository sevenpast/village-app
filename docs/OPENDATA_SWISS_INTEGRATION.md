# OpenData.swiss Integration

Dieses Dokument beschreibt, wie opendata.swiss in unser System integriert ist und wie es verwendet wird.

## Übersicht

opendata.swiss ist die zentrale Plattform für offene Behördendaten in der Schweiz. Unser System nutzt die CKAN-API von opendata.swiss, um:

1. **Basis-Gemeindedaten** (BFS-Nummer, PLZ, Kanton) zu synchronisieren
2. **Zusätzliche Datensätze** zu finden, die Kontaktinformationen oder Öffnungszeiten enthalten könnten
3. **Als Fallback-Quelle** zu dienen, wenn Web-Scraping keine Daten liefert

## Architektur

### Datenquellen-Priorität

1. **Supabase Database** (municipality_master_data) - Primäre Quelle für Basis-Daten
2. **opendata.swiss CKAN API** - Suche nach zusätzlichen Datensätzen
3. **Web-Scraping** - Dynamisches Extrahieren von Gemeinde-Websites
4. **Gemini AI** - Intelligente Datenextraktion aus HTML-Inhalten

### Integration in den Scraping-Prozess

Der Scraping-Prozess (`lib/municipality-scraper.ts`) nutzt opendata.swiss als zusätzliche Datenquelle:

```typescript
// 1. Versuche opendata.swiss zuerst
const opendataData = await findMunicipalityContactFromOpendata(gemeinde)

// 2. Scrape Gemeinde-Website
const scrapedData = await scrapeMunicipalityLive(...)

// 3. Merge: opendata.swiss Daten haben Priorität
const mergedData = {
  ...scrapedData,
  opening_hours: opendataData.opening_hours || scrapedData.opening_hours,
  phone: opendataData.phone || scrapedData.phone,
  // ...
}
```

## Verfügbare Funktionen

### 1. `searchOpendataSwissDatasets(query, municipalityName?)`

Sucht nach Datensätzen auf opendata.swiss, die relevant für eine Gemeinde sein könnten.

**Beispiel:**
```typescript
const datasets = await searchOpendataSwissDatasets('kontakt', 'Münchenstein')
// Gibt Array von OpendataSwissDataset zurück
```

### 2. `getOpendataSwissDataset(datasetId)`

Holt detaillierte Informationen zu einem spezifischen Datensatz.

**Beispiel:**
```typescript
const dataset = await getOpendataSwissDataset('some-dataset-id')
```

### 3. `findMunicipalityContactFromOpendata(municipalityName, bfsNummer?)`

Vollständige Funktion, die:
- Nach relevanten Datensätzen sucht
- Diese herunterlädt und parst
- Kontaktinformationen extrahiert

**Beispiel:**
```typescript
const contactData = await findMunicipalityContactFromOpendata('Münchenstein', 2762)
// Gibt MunicipalityContactData zurück mit phone, email, address, opening_hours
```

## Unterstützte Datenformate

Das System kann automatisch folgende Formate parsen:

- **CSV** (mit Semikolon oder Komma als Delimiter)
- **JSON** (verschiedene Strukturen: Array, Object, nested)

### Automatische Feld-Erkennung

Das System erkennt automatisch Felder mit folgenden Namen:

- **Telefon**: `phone`, `telefon`, `tel`
- **Email**: `email`, `e_mail`, `mail`
- **Adresse**: `address`, `adresse`, `strasse`
- **Öffnungszeiten**: `opening_hours`, `oeffnungszeiten`, `hours`

## Verwendung

### In der API-Route

Die Integration läuft automatisch im Scraping-Prozess. Keine zusätzliche Konfiguration nötig.

### Manuelle Suche

Falls du manuell nach Datensätzen suchen möchtest:

```typescript
import { searchOpendataSwissDatasets } from '@/lib/opendata-swiss'

const datasets = await searchOpendataSwissDatasets('gemeinde verwaltung')
console.log(`Found ${datasets.length} datasets`)
```

## API-Endpunkte

opendata.swiss nutzt die CKAN-API:

- **Basis-URL**: `https://opendata.swiss/api/3/action/`
- **Suche**: `package_search?q={query}&rows=20`
- **Details**: `package_show?id={datasetId}`

## Fehlerbehandlung

- Wenn opendata.swiss keine Daten findet → Fallback zu Web-Scraping
- Wenn Download fehlschlägt → Weiter mit nächstem Datensatz
- Wenn Parsing fehlschlägt → Logging und Weiter mit Scraping

## Performance

- **Timeout**: 15 Sekunden pro Resource-Download
- **Max Datensätze**: 3 relevante Datensätze werden versucht
- **Caching**: Ergebnisse werden in Supabase gecacht (4h TTL)

## Zukünftige Erweiterungen

1. **Erweiterte Parsing-Logik**: Bessere Erkennung von Öffnungszeiten-Formaten
2. **Batch-Processing**: Mehrere Gemeinden gleichzeitig abfragen
3. **Inkrementelle Updates**: Nur neue/geänderte Datensätze verarbeiten
4. **Webhook-Integration**: Automatische Updates bei neuen Datensätzen

## Debugging

Aktiviere Logging, um den Prozess zu verfolgen:

```typescript
// In lib/opendata-swiss.ts werden bereits Console-Logs ausgegeben:
console.log(`🔍 Searching opendata.swiss for: "${searchTerms}"`)
console.log(`✅ Found ${datasets.length} datasets`)
console.log(`📥 Attempting to download resource...`)
```

## Weitere Informationen

- [opendata.swiss Handbuch](https://handbook.opendata.swiss)
- [CKAN API Dokumentation](https://docs.ckan.org/en/2.9/api/)
- [BFS Gemeinde-Verzeichnis](https://www.bfs.admin.ch/bfs/de/home/statistiken/kataloge-datenbanken/daten.assetdetail.32036842.html)



















