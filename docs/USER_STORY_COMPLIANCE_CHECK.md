# 📋 User Story Compliance Check - Tasks 1-5

**Datum:** 02.11.2025  
**Status:** Vergleich zwischen User Stories und aktueller Implementierung

---

## 🔍 METHODIK

Vergleich der User Stories (Task 1-5) mit der tatsächlichen Code-Implementierung:
- ✅ **Implementiert** - Feature existiert und funktioniert
- ⚠️ **Teilweise** - Feature existiert, aber mit Abweichungen
- ❌ **Fehlt** - Feature nicht implementiert
- 🔄 **Anders** - Feature anders umgesetzt als in User Story

---

## 📊 TASK 1: Secure residence permit / visa

### ✅ **Implementiert:**

| User Story Anforderung | Status | Implementierung |
|------------------------|--------|-----------------|
| **Goal Message** | ✅ | `goal = 'Make sure your legal right to stay in Switzerland is secured.'` (route.ts:158) |
| **Audience Filtering** | ✅ | `visaStatus === 'exempt'`, `visaStatus === 'required'`, `eu_efta` (route.ts:167-220) |
| **Infobox für visa-exempt** | ✅ | FAQ mit 3 Fragen (route.ts:172-188) |
| **Infobox für visa-required** | ✅ | FAQ mit 3 Fragen (route.ts:191-211) |
| **Infobox für kein Land** | ✅ | `type: 'no_country'` mit "Complete Profile" Hinweis (route.ts:162-166) |
| **Infobox für EU/EFTA** | ✅ | `type: 'eu_efta'` mit generischer Nachricht (route.ts:214-220) |
| **Dynamischer Ländername** | ✅ | `country_name: countryName` wird aus DB geladen (route.ts:111) |
| **Task Completion** | ✅ | "I have done this" Checkbox (essentials-client.tsx:2563-2599) |
| **Reminder System** | ✅ | Reminder-Input mit Tagen (essentials-client.tsx:2600+) |
| **Reminder Cancellation bei Completion** | ✅ | Automatisch bei Task-Completion (essentials-client.tsx:415-416) |

### ⚠️ **Teilweise / Abweichungen:**

| User Story Anforderung | Status | Abweichung |
|------------------------|--------|------------|
| **Breadcrumb zu Task 2** | ⚠️ | Breadcrumb existiert in FAQ-Text (`→ Next Step: Task 2`), aber **nicht als klickbarer Link** in allen Fällen. Code zeigt: `handleNextStep` Option existiert (essentials-client.tsx:1802), aber wird nicht immer verwendet. |
| **"Complete Profile" Button** | ⚠️ | Hinweis existiert, aber **Button fehlt** - nur Text (route.ts:165) |
| **Realtime-Update bei Profil-Änderung** | ❌ | **NICHT implementiert** - User muss Seite neu laden |
| **Completed Badge mit Timestamp** | ⚠️ | Completion wird gespeichert, aber **Badge mit Datum wird nicht angezeigt** (nur Checkbox) |
| **Automatischer 3-Tage-Reminder** | ❌ | **NICHT automatisch** - User muss manuell setzen |

### ❌ **Fehlt komplett:**

1. **EU/EFTA-Bürger Handling** - User Story fragt: "Wird Task 1 für EU/EFTA komplett ausgeblendet?" → Aktuell wird angezeigt mit `eu_efta` Infobox
2. **Task Re-Opening** - "Mark as Incomplete" Button fehlt
3. **Breadcrumb-Navigation** - Klickbarer Link zu Task 2 fehlt in den meisten Fällen

---

## 📊 TASK 2: Register at the Gemeinde (municipality)

### ✅ **Implementiert:**

| User Story Anforderung | Status | Implementierung |
|------------------------|--------|-----------------|
| **Goal Message** | ✅ | `goal = 'Make your residence official within 14 days of arrival'` (route.ts:230) |
| **Infobox mit FAQs** | ✅ | 3 FAQs (Why, Where, What type of permit) (route.ts:236-253) |
| **Öffnungszeiten-Anzeige** | ✅ | `show_opening_hours: true` Flag (route.ts:246) + Municipality Info wird geladen |
| **Dokumente-Checkliste** | ✅ | Resources mit `type: 'documents'` (route.ts:258) |
| **Document Vault Upload** | ✅ | Vault-System existiert (`/api/vault/upload`) |
| **PDF Tool** | ✅ | Resource `type: 'pdf'` (route.ts:259) |
| **Task Completion** | ✅ | "I have done this" Checkbox |
| **Reminder System** | ✅ | Reminder-Input |

### ⚠️ **Teilweise / Abweichungen:**

| User Story Anforderung | Status | Abweichung |
|------------------------|--------|------------|
| **URGENT-Label** | ❌ | **FEHLT** - User Story verlangt "⚠️ URGENT - 14-day deadline" |
| **14-Tage-Countdown** | ❌ | **FEHLT** - "11 days left" wird nicht angezeigt |
| **PDF Fill Tool** | ⚠️ | Resource existiert, aber **Tool nicht implementiert** (nur Platzhalter) |
| **Email Generator** | ⚠️ | Resource existiert, aber **Generator nicht implementiert** |
| **Document Vault - AI Auto-Tagging** | ⚠️ | **Teilweise** - OCR/Classification existiert (`/api/vault/upload`), aber nicht vollständig |
| **Hyperlocal Lookup** | ⚠️ | **Teilweise** - Municipality-Scraper existiert, aber nicht für alle Gemeinden |
| **Source Timestamping** | ❌ | "Last checked: [TIMESTAMP]" wird nicht angezeigt |
| **Eskalierende Reminder** | ❌ | **FEHLT** - User Story verlangt gestaffelte Reminders (Tag 3, 7, 12, 14) |

### ❌ **Fehlt komplett:**

1. **PDF Overlay & Fill** - Englisches Overlay + Auto-Fill aus Profil
2. **Email Generator** - Lokalisierte E-Mail mit English Copy
3. **Bundle Creation** - ZIP mit Dokumenten
4. **Task Dependency** - Task 5 wird nicht automatisch freigeschaltet nach Task 2

---

## 📊 TASK 3: Find a place that fits your needs

### ✅ **Implementiert:**

| User Story Anforderung | Status | Implementierung |
|------------------------|--------|-----------------|
| **Goal Message** | ✅ | `goal = 'The first step to building a home is finding a place that fits your needs.'` (route.ts:266) |
| **FAQ-Sektion** | ✅ | 7 FAQs (route.ts:270-311) |
| **Housing Vault** | ✅ | `HousingVault` Component integriert (essentials-client.tsx:2526) |
| **Maps Component** | ✅ | `DistanceMap` Component integriert (essentials-client.tsx:2533) |
| **3-Spalten-Layout** | ✅ | Goal, Housing, Maps nebeneinander (essentials-client.tsx:2462-2502) |
| **Collapsible Sections** | ✅ | Housing und Maps sind togglebar (essentials-client.tsx:2474-2495) |
| **Full-width Content** | ✅ | Wenn expanded, nimmt volle Breite ein (essentials-client.tsx:2524-2535) |

### ⚠️ **Teilweise / Abweichungen:**

| User Story Anforderung | Status | Abweichung |
|------------------------|--------|------------|
| **DistanceMap Route Display** | ✅ | Leaflet mit OSRM zeigt Route als Polyline |
| **HousingVault Features** | ⚠️ | Component existiert, aber **nicht alle Features** aus User Story (Viewing Tracker, Contract Review) |

### ❌ **Fehlt komplett:**

1. **Motivation Letter Generator** - AI-generiertes Motivationsschreiben
2. **Bundle Creation** - ZIP mit Brief + Docs
3. **Email Integration** - mailto-Link mit vorausgefüllter Email
4. **Budget Analysis** - Markt-Fit Analyse (Good/Tight)
5. **Commute Visualization** - Google Maps mit Pendeldistanz
6. **Municipality Insights** - Average Rent, Tax, Public Transport
7. **Viewing Tracker** - Fotos, Rating, Notizen
8. **Compare Viewings** - Side-by-Side Vergleich, Top 3 Highlighting
9. **Contract AI Review** - 🟢🟡🔴 Rating mit Findings

---

## 📊 TASK 4: Register your kids at school / kindergarten

### ✅ **Implementiert:**

| User Story Anforderung | Status | Implementierung |
|------------------------|--------|-----------------|
| **Goal Message** | ✅ | `goal = 'Register for school/kindergarten'` (route.ts:324) |
| **Audience Filtering (Kinder)** | ✅ | `hasChildren`, `hasSchoolAgeChildren` (route.ts:326-328) |
| **Infobox für keine Kinder** | ✅ | `type: 'no_children'` (route.ts:330-334) |
| **Infobox für keine Schulkinder** | ✅ | `type: 'no_school_age'` (route.ts:336-340) |
| **Infobox für Schulkinder** | ✅ | `type: 'school_registration'` mit FAQs (route.ts:342-377) |
| **Dokumente-Checkliste** | ✅ | Resources mit `type: 'documents'` (route.ts:382) |
| **PDF Tool Resource** | ✅ | Resource `type: 'pdf'` (route.ts:383) |

### ⚠️ **Teilweise / Abweichungen:**

| User Story Anforderung | Status | Abweichung |
|------------------------|--------|------------|
| **URGENT-Label** | ❌ | **FEHLT** - User Story verlangt "⚠️ URGENT" für Kinder 4-15 |
| **"Complete Profile" Button** | ⚠️ | Hinweis existiert, aber **Button fehlt** |
| **Multi-Child Support** | ❌ | **NICHT implementiert** - Keine Dropdown "Select child" |
| **Document Vault (Child-specific)** | ❌ | **NICHT implementiert** - Keine `child_id` in documents-Tabelle |
| **PDF Fill Tool** | ❌ | **NICHT implementiert** |
| **Email Generator** | ❌ | **NICHT implementiert** |
| **Zürich Special Case** | ❌ | **NICHT implementiert** - "Meine Kinder" Portal-Hinweis fehlt |
| **Hyperlocal Lookup (Schools)** | ❌ | **NICHT implementiert** - Keine School-Database |

### ❌ **Fehlt komplett:**

1. **PDF Overlay & Fill** - Englisches Overlay für Schulformulare
2. **Email Generator** - Lokalisierte E-Mail an Schulverwaltung
3. **Zürich "Meine Kinder" Portal** - Spezial-Hinweis für Zürich
4. **Child-specific Document Storage** - Dokumente pro Kind
5. **Realtime-Update** - Bei Profil-Änderung (Kinder hinzufügen)

---

## 📊 TASK 5: Receive residence permit card

### ✅ **Implementiert:**

| User Story Anforderung | Status | Implementierung |
|------------------------|--------|-----------------|
| **Goal Message** | ✅ | `goal = 'Complete the last step to your Swiss residence permit.'` (route.ts:390) |
| **Infobox mit FAQs** | ✅ | 6 FAQs (route.ts:394-425) |
| **Task Completion** | ✅ | "I have done this" Checkbox |
| **Reminder System** | ✅ | Reminder-Input |

### ⚠️ **Teilweise / Abweichungen:**

| User Story Anforderung | Status | Abweichung |
|------------------------|--------|------------|
| **Task Dependency (Task 2 → Task 5)** | ❌ | **NICHT implementiert** - Task 5 ist immer sichtbar |
| **Email Generator (2 Varianten)** | ❌ | **NICHT implementiert** - "Check Letter Status" und "Check Card Status" Buttons fehlen |
| **Canton Data** | ❌ | **NICHT implementiert** - Keine `cantonal_migration_offices` Tabelle |
| **Timeline Visualization** | ❌ | **NICHT implementiert** - Visueller Prozess fehlt |
| **Status-Tracking** | ❌ | **NICHT implementiert** - User kann nicht manuell Status updaten |

### ❌ **Fehlt komplett:**

1. **Task-Freischaltung** - Task 5 sollte erst nach Task 2 sichtbar werden
2. **Email-Generator Buttons** - "Generate Email to Check Letter Status" / "Generate Email to Check Card Status"
3. **Canton Migration Offices Database** - Email-Adressen aller kantonalen Migrationsämter
4. **Timeline Component** - Visueller Prozess (Task 2 → Letter → Appointment → Card)

---

## 🔄 CROSS-CUTTING FEATURES

### ✅ **Implementiert:**

| Feature | Status | Implementierung |
|---------|--------|-----------------|
| **Task Status Tracking** | ✅ | localStorage + Database (`user_tasks` Tabelle) |
| **Reminder System** | ✅ | `task_reminders` Tabelle + API (`/api/tasks/[taskId]/reminder`) |
| **Reminder Cancellation** | ✅ | Automatisch bei Task-Completion |
| **Document Vault** | ✅ | `/api/vault/*` Endpoints + `documents` Tabelle |
| **Municipality Info** | ✅ | `/api/municipality/info` mit Scraping |

### ❌ **Fehlt komplett:**

1. **Breadcrumb Navigation** - Klickbare Links zwischen Tasks
2. **Realtime-Update** - Automatische Infobox-Updates bei Profil-Änderung
3. **Task Dependencies** - Sequenzielle Freischaltung (Task 2 → Task 5)
4. **URGENT Labels** - Visuelle Hervorhebung für dringende Tasks
5. **Countdown Timers** - "X days left" für Tasks mit Deadlines
6. **Completed Badge mit Timestamp** - "✓ Completed on [DD.MM.YYYY]"
7. **Task Re-Opening** - "Mark as Incomplete" Button

---

## 📈 ZUSAMMENFASSUNG

### ✅ **Was funktioniert gut:**

1. **Grundlegende Task-Struktur** - Alle 5 Tasks sind definiert und anzeigbar
2. **Audience Filtering** - Task 1 & 4 filtern basierend auf User-Daten
3. **Infobox-System** - FAQs werden dynamisch generiert
4. **Task Completion** - Checkbox funktioniert
5. **Reminder System** - Basis-Implementierung vorhanden
6. **Document Vault** - Upload und Storage funktioniert
7. **Municipality Scraping** - Öffnungszeiten werden geladen

### ⚠️ **Was teilweise fehlt:**

1. **Breadcrumb Navigation** - Code existiert, aber nicht konsistent verwendet
2. **PDF Tools** - Resources existieren, aber Tools nicht implementiert
3. **Email Generators** - Resources existieren, aber Generatoren nicht implementiert
4. **Task 3 Features** - Housing Vault & Maps existieren, aber viele Features fehlen

### ❌ **Was komplett fehlt:**

1. **URGENT Labels & Countdowns** - Für Task 2 & 4
2. **Task Dependencies** - Task 5 sollte von Task 2 abhängen
3. **Realtime-Update** - Bei Profil-Änderung
4. **PDF Fill Tools** - Für Task 2 & 4
5. **Email Generators** - Für Task 2, 4 & 5
6. **Task 3 Advanced Features** - Motivation Letter, Budget Analysis, Viewing Tracker, Contract Review
7. **Zürich Special Case** - Für Task 4
8. **Canton Migration Offices** - Für Task 5
9. **Timeline Visualization** - Für Task 5
10. **Completed Badge mit Datum** - Visuelle Bestätigung

---

## 🎯 PRIORITÄTEN FÜR NÄCHSTE SCHRITTE

### **High Priority (Must-Have für MVP):**

1. ✅ **URGENT Labels** - Task 2 & 4
2. ✅ **14-Tage-Countdown** - Task 2
3. ✅ **Task Dependency** - Task 5 nur nach Task 2
4. ✅ **Breadcrumb Navigation** - Klickbare Links zwischen Tasks
5. ✅ **Completed Badge** - Mit Timestamp anzeigen

### **Medium Priority:**

6. ⚠️ **PDF Fill Tool** - Task 2 & 4
7. ⚠️ **Email Generator** - Task 2, 4 & 5
8. ⚠️ **Realtime-Update** - Bei Profil-Änderung
9. ⚠️ **Zürich Special Case** - Task 4

### **Low Priority (Post-MVP):**

10. ⏳ **Task 3 Advanced Features** - Motivation Letter, Budget Analysis, etc.
11. ⏳ **Timeline Visualization** - Task 5
12. ⏳ **Status-Tracking** - Task 5

---

## 📝 DETAILIERTE ABWEICHUNGEN

### **Task 1 - Breadcrumb:**

**User Story sagt:**
```
→ Next Step: Task 2 - Register at Gemeinde
```
**Aktuell:**
- Text existiert in FAQ (route.ts:185, 208, 218)
- Code für klickbaren Link existiert (essentials-client.tsx:1802-1823)
- **Problem:** `handleNextStep` Option wird nicht immer übergeben

**Fix nötig:**
```typescript
// In formatAnswerText() - handleNextStep: true hinzufügen
formatAnswerText(faq.answer, { handleNextStep: true })
```

---

### **Task 2 - URGENT Label:**

**User Story sagt:**
```
⚠️ URGENT - Deadline: in 11 days (15.11.2025)
```

**Aktuell:**
- ❌ **FEHLT komplett** - Kein URGENT-Label
- ❌ **FEHLT** - Kein Countdown

**Fix nötig:**
```typescript
// In route.ts case 2:
return NextResponse.json({
  task_id: taskId,
  goal,
  is_urgent: true,  // ← HINZUFÜGEN
  deadline_days: 14,  // ← HINZUFÜGEN
  days_remaining: calculateDaysRemaining(moveInDate),  // ← HINZUFÜGEN
  // ...
})
```

---

### **Task 4 - URGENT Label:**

**User Story sagt:**
```
⚠️ URGENT - School registration required
```

**Aktuell:**
- ❌ **FEHLT** - Kein URGENT-Label für Kinder 4-15

**Fix nötig:**
```typescript
// In route.ts case 4:
if (hasSchoolAgeChildren) {
  return NextResponse.json({
    task_id: taskId,
    is_urgent: true,  // ← HINZUFÜGEN
    // ...
  })
}
```

---

### **Task 5 - Dependency:**

**User Story sagt:**
```
Task 5 wird erst nach Task 2 freigeschaltet
```

**Aktuell:**
- ❌ **FEHLT** - Task 5 ist immer sichtbar

**Fix nötig:**
```typescript
// In route.ts case 5:
// Prüfe ob Task 2 completed
const { data: task2Status } = await supabase
  .from('user_tasks')
  .select('status')
  .eq('user_id', user.id)
  .eq('task_id', task2Uuid)
  .single()

if (task2Status?.status !== 'done') {
  return NextResponse.json({
    task_id: taskId,
    locked: true,  // ← HINZUFÜGEN
    message: 'Complete Task 2 first',
    // ...
  })
}
```

---

## 🔧 QUICK WINS (Schnell umsetzbar)

1. **URGENT Labels hinzufügen** - 30 Min
2. **Breadcrumb Links aktivieren** - 15 Min
3. **Completed Badge mit Datum** - 30 Min
4. **Task 5 Dependency Check** - 1 Stunde

---

**Gesamt-Compliance: ~60%**  
**Kritische Fehlende Features: ~40%**

