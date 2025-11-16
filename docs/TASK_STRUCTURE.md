# 📋 Task-Struktur Erklärung

## Übersicht

Das System verwendet eine **hybride Architektur** für Tasks:
- **Task-Liste**: Hardcoded im Frontend
- **Task-Inhalte**: Dynamisch generiert in der API basierend auf User-Daten
- **Task-Status**: Wird lokal (localStorage) und in der Datenbank gespeichert

---

## 🏗️ Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend: essentials-client.tsx                           │
│  - Definiert Task-Liste (hardcoded)                        │
│  - Lädt Task-Daten von API                                  │
│  - Zeigt UI für Tasks                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP GET /api/tasks/[taskId]
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  API: app/api/tasks/[taskId]/route.ts                       │
│  - Switch-Case für jeden Task (1-5)                         │
│  - Generiert goal, infobox, resources                       │
│  - Basierend auf User-Daten (country, visa_status, etc.)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Query
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Datenbank: Supabase                                         │
│  - profiles (User-Daten)                                    │
│  - countries (Visa-Status)                                  │
│  - user_tasks (Task-Status)                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Datei-Struktur

### 1. **Frontend - Task-Liste Definition**

**Datei:** `village-app/app/essentials/essentials-client.tsx`

**Zeile 93-99:** Task-Liste wird hardcoded definiert:

```typescript
const tasks: Task[] = [
  { id: 1, title: 'Secure residence permit / visa', number: 1 },
  { id: 2, title: 'Register at the Gemeinde (municipality)', number: 2 },
  { id: 3, title: 'Find a place that fits your needs', number: 3 },
  { id: 4, title: 'Register your kids at school / kindergarten', number: 4 },
  { id: 5, title: 'Receive residence permit card', number: 5 },
]
```

**Zeile 226-291:** `loadTaskData()` Funktion lädt Task-Daten von der API:

```typescript
const loadTaskData = async (taskId: number) => {
  const response = await fetch(`/api/tasks/${taskId}`)
  const data: TaskData = await response.json()
  setTaskData(data)
  // ...
}
```

---

### 2. **API - Task-Inhalte Definition**

**Datei:** `village-app/app/api/tasks/[taskId]/route.ts`

**Zeile 155-470:** Großer `switch-case` Block definiert die Inhalte für jeden Task:

```typescript
switch (taskId) {
  case 1: {
    // Task 1: Secure residence permit / visa
    goal = 'Make sure your legal right to stay in Switzerland is secured.'
    
    // Basierend auf visa_status werden verschiedene Infoboxen generiert
    if (visaStatus === 'exempt') {
      infobox = { type: 'visa_exempt', faqs: [...] }
    } else if (visaStatus === 'required') {
      infobox = { type: 'visa_required', faqs: [...] }
    }
    
    resources = [
      { type: 'faq', title: 'FAQs / Good to Know', expanded: false }
    ]
    break
  }
  
  case 2: {
    // Task 2: Register at Gemeinde
    goal = 'Make your residence official within 14 days of arrival'
    infobox = { type: 'gemeinde_registration', faqs: [...] }
    resources = [
      { type: 'faq', title: 'FAQs / Good to Know', expanded: false },
      { type: 'documents', title: 'Documents you need', expanded: false },
      { type: 'pdf', title: 'Translate & Pre-fill a PDF', expanded: false }
    ]
    break
  }
  
  case 3: {
    // Task 3: Find housing
    goal = 'The first step to building a home is finding a place that fits your needs.'
    infobox = { type: 'housing', faqs: [...] }
    resources = [...]
    break
  }
  
  case 4: {
    // Task 4: School registration
    goal = 'Register your children for school or kindergarten'
    // ...
    break
  }
  
  case 5: {
    // Task 5: Receive residence permit card
    goal = 'Collect your physical residence permit card'
    // ...
    break
  }
}
```

---

### 3. **Datenbank-Struktur**

**Tabellen:**

#### `profiles`
- Speichert User-Daten: `country_of_origin_id`, `municipality_name`, `children_ages`, etc.
- Wird von der API gelesen, um Task-Inhalte zu personalisieren

#### `countries`
- Speichert Länder-Informationen: `name_en`, `visa_status` (exempt/required)
- Wird verwendet, um Task 1 zu personalisieren

#### `user_tasks` (optional, aktuell nicht aktiv genutzt)
- Könnte Task-Status speichern
- Aktuell wird Status in localStorage gespeichert

---

## 🔄 Datenfluss

### Beispiel: Task 1 wird geladen

1. **User klickt auf Task 1** in `essentials-client.tsx`
   ```typescript
   handleTaskClick(1) → setSelectedTask(1)
   ```

2. **useEffect triggert** `loadTaskData(1)`
   ```typescript
   fetch('/api/tasks/1')
   ```

3. **API Route** `/api/tasks/[taskId]/route.ts` wird aufgerufen
   - Liest User-Profile aus Datenbank
   - Liest Country-Informationen
   - Switch-Case für Task 1:
     - Generiert `goal`
     - Generiert `infobox` basierend auf `visa_status`
     - Generiert `resources` Array
   - Gibt `TaskData` zurück

4. **Frontend erhält Daten** und zeigt sie an
   ```typescript
   setTaskData(data)
   // UI rendert: goal, infobox, resources
   ```

---

## 🎯 Wo wird was definiert?

| Element | Wo definiert | Datei |
|---------|-------------|-------|
| **Task-Titel** | Frontend (hardcoded) | `essentials-client.tsx:93-99` |
| **Task-Goal** | API (switch-case) | `app/api/tasks/[taskId]/route.ts:155+` |
| **Task-Infobox** | API (switch-case) | `app/api/tasks/[taskId]/route.ts:155+` |
| **Task-Resources** | API (switch-case) | `app/api/tasks/[taskId]/route.ts:155+` |
| **Task-Status** | Frontend (localStorage) | `essentials-client.tsx:266+` |
| **User-Daten** | Datenbank | `profiles`, `countries` Tabellen |

---

## 🔧 Task hinzufügen/ändern

### Neuen Task hinzufügen:

1. **Frontend:** Task zur Liste hinzufügen
   ```typescript
   // essentials-client.tsx:93-99
   { id: 6, title: 'New Task', number: 6 }
   ```

2. **API:** Neuen Case im switch hinzufügen
   ```typescript
   // app/api/tasks/[taskId]/route.ts
   case 6: {
     goal = 'Your goal text'
     infobox = { type: 'custom', ... }
     resources = [...]
     break
   }
   ```

### Task-Inhalt ändern:

**Nur API-Datei ändern:**
```typescript
// app/api/tasks/[taskId]/route.ts
case 3: {
  goal = 'New goal text'  // ← Hier ändern
  // ...
}
```

---

## 📊 Task-spezifische Features

### Task 3 (Housing) - Spezial-Layout
- **Datei:** `essentials-client.tsx:2457+`
- **Besonderheit:** Drei Spalten (Goal, Housing, Maps)
- **Komponenten:** `HousingVault`, `DistanceMap`

### Task 4 (School) - Dynamische Daten
- **Datei:** `app/api/tasks/[taskId]/route.ts:400+`
- **Besonderheit:** Lädt Schul-Informationen basierend auf Gemeinde
- **API:** `/api/school/info`

---

## 💡 Wichtige Erkenntnisse

1. **Task-Liste ist statisch** - wird im Frontend hardcoded definiert
2. **Task-Inhalte sind dynamisch** - werden in der API basierend auf User-Daten generiert
3. **Keine Datenbank für Task-Definitionen** - alles im Code (switch-case)
4. **User-spezifische Anpassung** - API passt Inhalte basierend auf `country`, `visa_status`, `municipality_name` an

---

## 🚀 Verbesserungsvorschläge

Für eine flexiblere Architektur könnte man:

1. **Task-Definitionen in Datenbank** verschieben (`tasks` Tabelle)
2. **Config-Dateien** für Task-Inhalte verwenden (ähnlich wie `form_schemas`)
3. **CMS-Integration** für einfache Bearbeitung ohne Code-Änderungen

Aktuell ist die Struktur aber **einfach und wartbar** für 5 feste Tasks.




















