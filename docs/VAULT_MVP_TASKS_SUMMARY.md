# 📋 Vault MVP Tasks - Zusammenfassung

**Erstellt:** 2025-01-10  
**Status:** 5 Tasks erstellt, bereit für Implementierung

---

## ✅ Tasks erstellt in Taskmaster

Die Tasks wurden in `.taskmaster/tasks/tasks.json` erstellt. Du kannst sie mit folgenden Befehlen anzeigen:

```bash
# Alle Tasks anzeigen
npx task-master-ai list

# Nächste Task anzeigen
npx task-master-ai next

# Spezifische Task anzeigen
npx task-master-ai show 1
```

---

## 📊 Task-Übersicht

### **Task 1: Persistent Document Bundling - Database Schema**
- **Status:** pending
- **Priority:** high
- **Dependencies:** keine
- **Zeitaufwand:** ~2h
- **Beschreibung:** Erstelle Supabase Migration für `document_bundles` und `bundle_documents` Tabellen mit RLS Policies

### **Task 2: Persistent Document Bundling - API Routes**
- **Status:** pending
- **Priority:** high
- **Dependencies:** Task 1
- **Zeitaufwand:** ~6h
- **Beschreibung:** Erstelle 7 API Routes für vollständiges Bundle-Management (CRUD + Document Management)

### **Task 3: Persistent Document Bundling - Frontend UI**
- **Status:** pending
- **Priority:** high
- **Dependencies:** Task 2
- **Zeitaufwand:** ~12h
- **Beschreibung:** Erweitere DocumentVault.tsx um Bundle-Management UI (Create, List, View, Edit, Delete, Download)

### **Task 4: Viewing Ratings ↔ Vault - Database Schema**
- **Status:** pending
- **Priority:** medium
- **Dependencies:** keine
- **Zeitaufwand:** ~1h
- **Beschreibung:** Erstelle Junction Table `viewing_documents` oder Array-Feld für Verbindung zwischen Viewings und Documents

### **Task 5: Viewing Ratings ↔ Vault - API & Frontend**
- **Status:** pending
- **Priority:** medium
- **Dependencies:** Task 4
- **Zeitaufwand:** ~8h
- **Beschreibung:** Erweitere Housing Viewings API und Frontend um Dokumenten-Verknüpfung

---

## 🎯 Implementierungs-Reihenfolge

### **Phase 1: Bundling (1,5 Wochen)**
1. ✅ Task 1: Database Schema (2h)
2. ✅ Task 2: API Routes (6h)
3. ✅ Task 3: Frontend UI (12h)

**Total:** ~20h = 2,5 Arbeitstage

### **Phase 2: Viewing Connection (1 Tag)**
4. ✅ Task 4: Database Schema (1h)
5. ✅ Task 5: API & Frontend (8h)

**Total:** ~9h = 1 Arbeitstag

---

## 📝 Nächste Schritte

1. **Starte mit Task 1:**
   ```bash
   npx task-master-ai show 1
   ```
   - Erstelle Migration: `village-app/supabase/migrations/042_create_document_bundles.sql`
   - Implementiere Tabellen, RLS Policies, Indexes

2. **Nach Task 1:**
   ```bash
   npx task-master-ai set-status --id=1 --status=done
   npx task-master-ai next
   ```
   - Starte Task 2 (API Routes)

3. **Während Implementierung:**
   - Nutze `npx task-master-ai update-subtask --id=X.Y --prompt="..."` um Fortschritt zu loggen
   - Nutze `npx task-master-ai expand --id=X` um Tasks in Subtasks zu zerlegen

---

## 🔍 Task-Details

Alle Details zu den Tasks findest du in:
- `.taskmaster/tasks/tasks.json` (vollständige Task-Definitionen)
- Oder mit: `npx task-master-ai show <id>`

---

## 💡 Tipps

- **Expand Tasks:** Wenn ein Task zu komplex ist, expandiere ihn:
  ```bash
  npx task-master-ai expand --id=3 --num=5
  ```

- **Update Progress:** Logge Fortschritt während der Implementierung:
  ```bash
  npx task-master-ai update-subtask --id=3.1 --prompt="Database Schema erstellt, RLS Policies implementiert"
  ```

- **Mark Complete:** Nach Abschluss:
  ```bash
  npx task-master-ai set-status --id=1 --status=done
  ```

---

**Viel Erfolg bei der Implementierung! 🚀**

