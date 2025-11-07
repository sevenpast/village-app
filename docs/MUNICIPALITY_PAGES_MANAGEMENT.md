# Municipality Pages Management

## Übersicht

Das System verwendet eine **hybride Strategie** für das Scraping von Gemeinde-Informationen:

1. **Gespeicherte Seiten** (für Top-Gemeinden mit 90% der Expats)
   - Seiten sind in der Datenbank gespeichert (`municipality_master_data.registration_pages`)
   - Werden direkt verwendet, keine dynamische Suche nötig
   - Schneller und zuverlässiger

2. **Dynamische Suche** (für alle anderen Gemeinden)
   - System sucht automatisch nach relevanten Seiten
   - Gefundene Seiten werden in der DB gespeichert für zukünftige Verwendung
   - Funktioniert für alle Gemeinden der Schweiz

## Top-Gemeinden verwalten

### Welche Gemeinden sollten gespeicherte Seiten haben?

Gemeinden mit hohem Expat-Aufkommen, z.B.:
- Zürich, Genf, Basel, Bern, Lausanne
- Winterthur, Luzern, St. Gallen
- Andere größere Städte mit vielen Expats

### Seiten in der Datenbank speichern

```sql
-- Beispiel: Zürich
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadt-zuerich.ch',
    'https://www.stadt-zuerich.ch/portal/de/index/politik_u_recht/einwohnerdienste/einreise_aufenthalt/wohnsitzanmeldung.html',
    'https://www.stadt-zuerich.ch/portal/de/index/politik_u_recht/einwohnerdienste/oeffnungszeiten.html',
    'https://www.stadt-zuerich.ch/portal/de/index/politik_u_recht/einwohnerdienste/kontakt.html'
  ],
  updated_at = NOW()
WHERE gemeinde_name ILIKE 'zürich' OR gemeinde_name ILIKE 'zuerich';
```

### Welche Seiten sollten gespeichert werden?

1. **Hauptseite** - `https://www.gemeinde.ch`
2. **Öffnungszeiten** - `/verwaltung/oeffnungszeiten` oder ähnlich
3. **Kontakt** - `/kontakt` oder `/verwaltung/kontakt`
4. **Anmeldung** - `/verwaltung/einwohnerdienste/anmeldung` oder ähnlich
5. **Einwohnerdienste** - `/einwohnerdienste` (falls vorhanden)

**Tipp**: Die Seiten sollten in dieser Reihenfolge sein, da sie nach Priorität sortiert werden.

## Automatisches Lernen

Für Gemeinden **ohne** gespeicherte Seiten:

1. System führt dynamische Suche durch
2. Findet relevante Seiten automatisch
3. **Speichert gefundene Seiten automatisch in der DB**
4. Nächste Anfrage verwendet dann die gespeicherten Seiten

Das bedeutet: Das System lernt automatisch und wird mit der Zeit besser!

## API-Verhalten

### Mit gespeicherten Seiten:
```
📚 Using 4 stored pages for Zürich
✓ Fetched https://www.stadt-zuerich.ch (15234 chars)
✓ Fetched https://www.stadt-zuerich.ch/.../oeffnungszeiten.html (8234 chars)
...
```

### Ohne gespeicherte Seiten (dynamisch):
```
🔍 Dynamically discovering pages for Münchenstein from https://www.muenchenstein.ch
Found 5 relevant pages for scraping (3 high priority, 2 medium priority)
✓ Fetched https://www.muenchenstein.ch (12345 chars)
...
💾 Saving 5 discovered pages for Münchenstein
```

## Best Practices

1. **Top-Gemeinden manuell pflegen**: Für die 20-30 Gemeinden mit den meisten Expats sollten die Seiten manuell in der DB gespeichert werden
2. **Qualität über Quantität**: Lieber 3-5 hochwertige Seiten als 10 schlechte
3. **Regelmäßig aktualisieren**: Wenn sich die Website-Struktur ändert, Seiten aktualisieren
4. **Automatisches Lernen nutzen**: Für kleinere Gemeinden das System automatisch lernen lassen

## Migration bestehender Daten

Wenn du bereits Seiten für Gemeinden hast, kannst du sie so migrieren:

```sql
-- Batch-Update für mehrere Gemeinden
UPDATE municipality_master_data
SET 
  registration_pages = CASE gemeinde_name
    WHEN 'Zürich' THEN ARRAY['https://www.stadt-zuerich.ch', '...']
    WHEN 'Genf' THEN ARRAY['https://www.ville-geneve.ch', '...']
    -- ... weitere Gemeinden
  END,
  updated_at = NOW()
WHERE gemeinde_name IN ('Zürich', 'Genf', ...);
```

