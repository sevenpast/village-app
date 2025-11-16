# Document Version Control - Benutzeranleitung

## Übersicht

Das Document Version Control System ermöglicht es, mehrere Versionen desselben Dokuments zu verwalten, Änderungen zu verfolgen und bei Bedarf zu früheren Versionen zurückzukehren.

## Wie funktioniert es?

### 1. Automatische Versionserstellung

**Aktuell:** Beim Upload eines neuen Dokuments wird automatisch eine Version erstellt, wenn:
- Ein ähnliches Dokument bereits existiert (Duplikat-Erkennung)
- Das Dokument als neue Version eines bestehenden Dokuments hochgeladen wird

**Geplant:** In Zukunft können Sie beim Upload explizit angeben, dass es sich um eine neue Version handelt.

### 2. Manuelle Versionserstellung

Um eine neue Version eines bestehenden Dokuments zu erstellen:

1. **Dokument hochladen** (normaler Upload-Prozess)
2. **Duplikat-Erkennung:** Das System erkennt automatisch ähnliche Dokumente
3. **Als Version verknüpfen:** Wenn ein ähnliches Dokument gefunden wird, können Sie es als neue Version verknüpfen

**API-Endpoint für manuelle Versionserstellung:**
```
POST /api/vault/documents/[documentId]/versions
Body: {
  parent_version_id?: string,  // Optional: ID der vorherigen Version
  change_summary?: string      // Optional: Beschreibung der Änderungen
}
```

### 3. Versionen anzeigen

1. Öffnen Sie die **Document Vault**
2. Klicken Sie auf den **"Versions"** Button bei einem Dokument
3. Sie sehen eine Liste aller Versionen mit:
   - Versionsnummer (1, 2, 3, ...)
   - Upload-Datum
   - Änderungsbeschreibung (falls vorhanden)
   - Aktuelle Version (markiert als "Current")

### 4. Versionen vergleichen

1. Öffnen Sie die Versionsliste eines Dokuments
2. Klicken Sie auf **"Compare"** bei einer älteren Version
3. Sie sehen einen Side-by-Side Vergleich:
   - Geänderte Felder werden hervorgehoben
   - Alte vs. neue Werte werden angezeigt
   - Nur `extracted_fields` werden verglichen (z.B. expiry_date, cancellation_deadline)

### 5. Version wiederherstellen

1. Öffnen Sie die Versionsliste
2. Klicken Sie auf **"Restore"** bei der gewünschten Version
3. Bestätigen Sie die Wiederherstellung
4. Die ausgewählte Version wird zur aktuellen Version

**Wichtig:** Beim Wiederherstellen wird nur die Versionsmarkierung geändert. Das tatsächliche Dokument in Supabase Storage bleibt unverändert.

## Datenbankstruktur

### Tabelle: `document_versions`

- `id`: UUID der Version
- `document_id`: Referenz zum Dokument
- `version_number`: Sequenzielle Nummer (1, 2, 3, ...)
- `parent_version_id`: Referenz zur vorherigen Version (für Versionsbaum)
- `is_current`: Boolean - ob dies die aktuelle Version ist
- `uploaded_by`: User ID
- `uploaded_at`: Zeitstempel
- `change_summary`: Benutzerbeschreibung der Änderungen
- `metadata`: JSON mit Metadaten (file_name, mime_type, file_size, extracted_fields)

### Automatische Features

- **Versionsnummern:** Werden automatisch vergeben (1, 2, 3, ...)
- **Current Version:** Nur eine Version kann gleichzeitig "current" sein (Trigger)
- **Cascade Delete:** Wenn ein Dokument gelöscht wird, werden alle Versionen gelöscht

## Duplikat-Erkennung

Das System erkennt automatisch ähnliche Dokumente basierend auf:

1. **Dateinamen-Ähnlichkeit** (Levenshtein-Distanz)
2. **Text-Ähnlichkeit** (Jaccard-Ähnlichkeit der extrahierten Texte)
3. **Dokumenttyp** (gleicher document_type)

**Schwellenwert:** 75% Ähnlichkeit (konfigurierbar)

Wenn ähnliche Dokumente gefunden werden:
- Die Informationen werden in `documents.metadata.similar_documents` gespeichert
- Sie können diese Dokumente manuell als Versionen verknüpfen

## API Endpoints

### Versionen auflisten
```
GET /api/vault/documents/[id]/versions
```

### Spezifische Version abrufen
```
GET /api/vault/documents/[id]/versions/[versionId]
```

### Neue Version erstellen
```
POST /api/vault/documents/[id]/versions
Body: {
  parent_version_id?: string,
  change_summary?: string
}
```

### Version wiederherstellen
```
POST /api/vault/documents/[id]/versions/[versionId]/restore
```

### Ähnliche Dokumente finden
```
GET /api/vault/documents/[id]/duplicates?threshold=0.75
```

## Migration

Um das Feature zu aktivieren, führen Sie die Migration aus:

```sql
-- Migration: 049_create_document_versions.sql
```

Die Migration erstellt:
- `document_versions` Tabelle
- Trigger für automatische Versionsnummern
- Trigger für Single-Current-Version
- RLS Policies für Sicherheit

## Zukünftige Verbesserungen

- [ ] UI für explizite Versionserstellung beim Upload
- [ ] Automatische Versionserstellung bei Duplikat-Erkennung
- [ ] Versionsvergleich mit visueller Diff-Ansicht
- [ ] Versionshistorie-Graph (Visualisierung)
- [ ] Bulk-Version-Management


