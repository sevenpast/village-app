# Top Municipalities (80%+ Expats) - Pre-configured Pages

## Übersicht

Gemeinden mit hohem Expat-Aufkommen (80%+ der Expats) haben **vorkonfigurierte Seiten** im System, um:
- Schnellere und zuverlässigere Datenabfrage
- Bessere Öffnungszeiten-Extraktion
- Konsistentere Ergebnisse

**Statistik:** Die Top 10 Städte beherbergen zusammen **84% der Expats** in der Schweiz.

## Aktuell vormarkierte Gemeinden (nach Expat-Anteil)

### Top 10 Städte (84% der Expats):

1. **Zürich** (19% der Expats) - `zürich`, `zuerich`
   - Öffnungszeiten: `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten`
   - Kontakt: `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt`
   - Einwohnerdienste: `https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste`

2. **Genf** (18% der Expats) - `genf`, `genève`, `geneve`
   - Kontakt & Öffnungszeiten: `https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires`
   - État Civil: `https://www.geneve.ch/fr/themes/administration/etat-civil`

3. **Basel** (12% der Expats) - `basel`
   - Öffnungszeiten: `https://www.basel.ch/verwaltung/einwohnerdienste/oeffnungszeiten`
   - Kontakt: `https://www.basel.ch/verwaltung/einwohnerdienste/kontakt`

4. **Lausanne** (9% der Expats) - `lausanne`
   - Kontakt & Öffnungszeiten: `https://www.lausanne.ch/officiel/administration/etat-civil/contact-et-horaires`
   - État Civil: `https://www.lausanne.ch/officiel/administration/etat-civil`

5. **Bern** (6% der Expats) - `bern`
   - Öffnungszeiten: `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten`
   - Kontakt: `https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt`

6. **Lugano** (6% der Expats) - `lugano`
   - Öffnungszeiten: `https://www.lugano.ch/temi/popolazione/anagrafe/orari`
   - Kontakt: `https://www.lugano.ch/temi/popolazione/anagrafe/contatti`

7. **Zug** (6% der Expats) - `zug`
   - Öffnungszeiten: `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten`
   - Kontakt: `https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt`

8. **Luzern** (3% der Expats) - `luzern`, `lucerne`
   - Öffnungszeiten: `https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten`
   - Kontakt: `https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt`

9. **Neuenburg** (3% der Expats) - `neuenburg`, `neuchâtel`
   - Kontakt & Öffnungszeiten: `https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires`
   - État Civil: `https://www.neuchatelville.ch/fr/administration/etat-civil`

10. **St. Gallen** (2% der Expats) - `st. gallen`, `st gallen`, `sankt gallen`
    - Öffnungszeiten: `https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten`
    - Kontakt: `https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt`

### Zusätzliche Gemeinden:

- **Allschwil** (Basel-Region, viele Expats)
- **Winterthur** (größere Stadt, viele Expats)

## Implementierung

Die vormarkierten Seiten werden in `lib/municipality-scraper.ts` in der Funktion `findRegistrationPages()` automatisch hinzugefügt, bevor die dynamische Suche startet.

## Weitere Gemeinden hinzufügen

Um weitere Gemeinden hinzuzufügen, bearbeite `lib/municipality-scraper.ts`:

```typescript
const topMunicipalities: Record<string, string[]> = {
  'neue-gemeinde': [
    'https://www.neue-gemeinde.ch/oeffnungszeiten',
    'https://www.neue-gemeinde.ch/kontakt',
  ],
}
```

## Datenbank-Integration

Idealerweise sollten diese Seiten auch in der Datenbank gespeichert werden (`municipality_master_data.registration_pages`), damit sie persistent sind und nicht bei jedem Scraping neu gesucht werden müssen.

Siehe auch: [MUNICIPALITY_PAGES_MANAGEMENT.md](./MUNICIPALITY_PAGES_MANAGEMENT.md)

