# Document Version Control - Aktueller Status

## ✅ Implementiert

### 1. Datenbank-Schema
- ✅ Migration `049_create_document_versions.sql` erstellt
- ✅ Tabelle `document_versions` mit allen notwendigen Feldern
- ✅ Trigger für automatische Versionsnummern
- ✅ Constraint: Nur eine "current" Version pro Dokument
- ✅ RLS Policies für Sicherheit

### 2. Duplikat-Erkennung
- ✅ `duplicate-detector.ts` implementiert
- ✅ Levenshtein-Distanz für Dateinamen-Ähnlichkeit
- ✅ Jaccard-Ähnlichkeit für Text-Ähnlichkeit
- ✅ Automatische Erkennung beim Upload
- ✅ Speicherung in `documents.metadata.similar_documents`

### 3. API Endpoints
- ✅ `GET /api/vault/documents/[id]/versions` - Liste aller Versionen
- ✅ `GET /api/vault/documents/[id]/versions/[versionId]` - Spezifische Version
- ✅ `POST /api/vault/documents/[id]/versions` - Neue Version erstellen
- ✅ `POST /api/vault/documents/[id]/versions/[versionId]/restore` - Version wiederherstellen
- ✅ `GET /api/vault/documents/[id]/duplicates` - Ähnliche Dokumente finden

### 4. UI Components
- ✅ `DocumentVersions.tsx` - Versionsliste anzeigen
- ✅ "Versions" Button in `DocumentVault.tsx`
- ✅ Versionsvergleich (Side-by-Side)
- ✅ Version wiederherstellen

## ⚠️ Teilweise implementiert / Verbesserungsbedarf

### 1. Automatische Versionserstellung beim Upload
**Status:** ❌ Nicht automatisch - nur manuell über API

**Aktuell:**
- Duplikat-Erkennung findet ähnliche Dokumente
- Ähnliche Dokumente werden in `metadata.similar_documents` gespeichert
- **ABER:** Keine automatische Verknüpfung als Version

**Benötigt:**
- UI-Dialog beim Upload: "Ähnliches Dokument gefunden - als neue Version verknüpfen?"
- Automatische Versionserstellung, wenn Benutzer zustimmt

### 2. Versionsvergleich
**Status:** ✅ Implementiert, aber nur für `extracted_fields`

**Aktuell:**
- Vergleich von `extracted_fields` (z.B. expiry_date, cancellation_deadline)
- Side-by-Side Ansicht

**Könnte erweitert werden:**
- Vergleich des vollständigen extrahierten Textes
- Visuelle Diff-Ansicht
- Highlighting von Änderungen

### 3. Versionshistorie-Visualisierung
**Status:** ❌ Nicht implementiert

**Fehlt:**
- Graph/Visualisierung der Versionshistorie
- Zeigt Versionsbaum (parent_version_id)
- Zeigt, welche Version von welcher abgeleitet wurde

## ❌ Noch nicht implementiert

### 1. UI für explizite Versionserstellung beim Upload
- Dialog: "Als neue Version von [Dokument] hochladen?"
- Dropdown zur Auswahl des Basis-Dokuments
- Eingabefeld für Änderungsbeschreibung

### 2. Bulk-Version-Management
- Mehrere Versionen gleichzeitig verwalten
- Versionen löschen (nicht nur wiederherstellen)
- Versionen exportieren

### 3. Versions-Metadaten erweitern
- Wer hat die Version hochgeladen? (bereits vorhanden: `uploaded_by`)
- Warum wurde die Version erstellt? (bereits vorhanden: `change_summary`)
- Automatische Änderungsbeschreibung basierend auf Diff

## 🔄 Workflow für Version Control

### Aktueller Workflow (Manuell):
1. Dokument hochladen
2. System erkennt ähnliche Dokumente (Duplikat-Erkennung)
3. Benutzer muss manuell API aufrufen: `POST /api/vault/documents/[id]/versions`
4. Version wird erstellt

### Gewünschter Workflow (Automatisch):
1. Dokument hochladen
2. System erkennt ähnliche Dokumente
3. **UI-Dialog:** "Ähnliches Dokument gefunden: [Dokument-Name]. Als neue Version verknüpfen?"
4. Benutzer wählt: "Ja" oder "Nein"
5. Wenn "Ja": Automatische Versionserstellung mit Link zum ähnlichen Dokument
6. Optional: Änderungsbeschreibung eingeben

## 📝 Nächste Schritte

1. **UI-Dialog für automatische Versionserstellung** (Höchste Priorität)
   - Beim Upload: Wenn ähnliche Dokumente gefunden werden, Dialog anzeigen
   - Benutzer kann auswählen, ob als Version verknüpft werden soll
   - Automatische API-Aufruf zur Versionserstellung

2. **Versionshistorie-Graph** (Mittlere Priorität)
   - Visualisierung der Versionsbeziehungen
   - Zeigt Versionsbaum basierend auf `parent_version_id`

3. **Erweiterte Versionsvergleiche** (Niedrige Priorität)
   - Volltext-Vergleich
   - Visuelle Diff-Ansicht
   - Highlighting von Änderungen

