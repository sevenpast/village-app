# 🔄 Datenfluss: Registration Wizard → Supabase

## ✅ Ja, es funktioniert! Die Daten kommen aus der Datenbank.

## 📊 Datenfluss-Diagramm:

```
┌─────────────────┐
│  Supabase DB    │
│  form_schemas   │  ← Form-Schema wird hier gespeichert (JSONB)
└────────┬────────┘
         │
         │ SQL Query
         ▼
┌─────────────────────────┐
│  lib/config/form-reader  │  ← Liest aus DB via Supabase Client
│  getFormSchema()        │
└────────┬────────────────┘
         │
         │ Returns FormConfig
         ▼
┌─────────────────────────┐
│  app/api/config/form/    │  ← Next.js API Route
│  [id]/route.ts          │  ← GET /api/config/form/registration
└────────┬────────────────┘
         │
         │ JSON Response
         ▼
┌─────────────────────────┐
│  hooks/useFormSchema.ts │  ← React Hook (Client-side)
│  useFormSchema()        │  ← Fetch via fetch() + React Query
└────────┬────────────────┘
         │
         │ formConfig object
         ▼
┌─────────────────────────┐
│  RegistrationWizard.tsx │  ← React Component
│  Uses formConfig.steps   │  ← Rendert dynamisch die Steps
└─────────────────────────┘
```

## 🔍 Verifikation:

### 1. **Datenbank (Supabase)**
```sql
SELECT id, version, json->'steps' FROM form_schemas WHERE id = 'registration';
```
✅ **Ergebnis:** Das Schema ist in der DB gespeichert.

### 2. **API Route**
```bash
curl http://localhost:3000/api/config/form/registration
```
✅ **Ergebnis:** Gibt das Schema als JSON zurück.

### 3. **React Component**
```typescript
const { data: formConfig } = useFormSchema('registration')
// formConfig.steps → Array von Steps
// formConfig.steps[0].fields → Array von Feldern
```
✅ **Ergebnis:** Component lädt Daten dynamisch aus der DB.

## 📝 Was wird in der Datenbank gespeichert?

Die **Form-Schemas** werden in der Tabelle `form_schemas` gespeichert:

```sql
CREATE TABLE form_schemas (
  id TEXT PRIMARY KEY,        -- z.B. 'registration'
  version INT,                -- Versionsnummer
  json JSONB NOT NULL,        -- Das komplette Schema als JSON
  created_at TIMESTAMPTZ
);
```

**Beispiel Eintrag:**
```json
{
  "id": "registration",
  "version": 1,
  "json": {
    "steps": [
      {
        "id": "personal_info",
        "title": "Personal Information",
        "fields": [
          {
            "name": "first_name",
            "type": "text",
            "label": "First Name",
            "required": true
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

## 🎯 Vorteile dieser Architektur:

1. **Config-Driven** – Änderungen ohne Code-Deployment
2. **Dynamisch** – Forms werden zur Laufzeit generiert
3. **Versioniert** – Mehrere Versionen möglich
4. **I18n-ready** – Dictionaries für Lokalisierung

## 🔧 Schema aktualisieren:

### Option 1: Via Supabase Dashboard
1. Gehe zu Supabase Dashboard
2. SQL Editor
3. UPDATE `form_schemas` SET json = '...' WHERE id = 'registration'

### Option 2: Via Migration (Empfohlen)
```sql
-- supabase/migrations/009_update_registration.sql
UPDATE form_schemas 
SET json = jsonb_set(
  json,
  '{steps}',
  '[...neue Steps...]'::jsonb
)
WHERE id = 'registration';
```

### Option 3: Via Supabase MCP (In Cursor)
```typescript
mcp_supabase-official_execute_sql(
  project_id: "jfldmfpbewiuahdhvjvc",
  query: "UPDATE form_schemas SET ..."
)
```

## ✅ Testen:

1. **API testen:**
   ```bash
   curl http://localhost:3000/api/config/form/registration
   ```

2. **Im Browser:**
   - Öffne: http://localhost:3000/register
   - Öffne DevTools → Network Tab
   - Siehst du den Request zu `/api/config/form/registration`
   - Response zeigt das Schema aus der DB

3. **Datenbank direkt prüfen:**
   - Supabase Dashboard → Table Editor → `form_schemas`
   - Siehst du den Eintrag mit `id = 'registration'`

## 🎉 Fazit:

**JA, es funktioniert!** Die Daten kommen live aus Supabase. 

- ✅ Schema wird in der DB gespeichert
- ✅ Wird dynamisch geladen
- ✅ Keine hardcodierten Forms
- ✅ Änderungen in der DB = sofortige UI-Änderungen

---

**Status:** ✅ Vollständig funktional!


