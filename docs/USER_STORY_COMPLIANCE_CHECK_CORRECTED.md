# 📋 User Story Compliance Check - Tasks 1-5 (KORRIGIERT)

**Datum:** 02.11.2025  
**Status:** Vergleich zwischen User Stories und aktueller Implementierung

---

## ✅ KORREKTUREN basierend auf User-Feedback

### ❌ NICHT implementieren:
- **URGENT Labels** für Task 2 & 4 → User sagt NEIN
- **Task Dependency** (Task 5 nach Task 2) → User sagt NEIN
- **Countdown Timer** "11 days left" → User fragt "woher kommt die Information?" → **NICHT in User Story erwähnt, daher NICHT implementieren**

### ✅ Implementieren:
- **Breadcrumb Navigation** - Links zwischen Tasks klickbar machen
- **PDF Fill Tools** - Resources für PDF-Formulare
- **Email Generators** - Resources für Email-Vorlagen
- **Completed Badge** - Timestamp anzeigen
- **Realtime-Update** - Infobox updated sich bei Profil-Änderung

---

## 🔍 TASK 1: Secure residence permit / visa

### ✅ **Sichtbarkeit & Audience Filtering - IMPLEMENTIERT:**

| User-Segment | visa_status | API Response | Frontend Rendering | Status |
|--------------|-------------|--------------|-------------------|--------|
| **Non-EU/EFTA, visa-exempt** | `exempt` | ✅ `type: 'visa_exempt'` | ✅ Zeigt visa-exempt FAQs | ✅ **KORREKT** |
| **Non-EU/EFTA, visa-required** | `required` | ✅ `type: 'visa_required'` | ✅ Zeigt visa-required FAQs | ✅ **KORREKT** |
| **Kein Land angegeben** | `null` | ✅ `type: 'no_country'` | ✅ Zeigt "Complete Profile" Button | ✅ **KORREKT** |
| **EU/EFTA-Bürger** | `eu_efta` | ✅ `type: 'eu_efta'` | ✅ Zeigt EU/EFTA Info | ✅ **KORREKT** |

**✅ FAZIT:** Die Sichtbarkeit ist korrekt implementiert. Jedes User-Segment sieht unterschiedliche Inhalte basierend auf `visa_status`.

### ⚠️ **Fehlende Features:**

| Feature | User Story | Status | Priorität |
|---------|-----------|--------|-----------|
| **Breadcrumb Links** | "→ Next Step: Task 2" soll klickbar sein | ⚠️ Code existiert, aber nicht aktiviert | 🔴 **HOCH** |
| **Realtime-Update** | Nach Profil-Vervollständigung: Infobox updated ohne Reload | ❌ Fehlt | 🔴 **HOCH** |
| **Completed Badge** | "✓ Completed on [DD.MM.YYYY]" | ⚠️ Status wird gespeichert, aber Timestamp nicht angezeigt | 🟡 **MITTEL** |

---

## 📊 TASK 2: Register at the Gemeinde

### ✅ **Implementiert:**
- Goal Message: "Make your residence official within 14 days of arrival" ✅
- Infobox mit FAQs ✅
- Öffnungszeiten werden geladen ✅
- Document Vault Upload ✅
- "Download Documents" & "Create Email" Buttons ✅

### ⚠️ **Fehlende Features:**

| Feature | User Story | Status | Priorität |
|---------|-----------|--------|-----------|
| **Breadcrumb Links** | "(see task 2)" soll klickbar sein | ⚠️ Code existiert, aber nicht aktiviert | 🔴 **HOCH** |
| **PDF Fill Tools** | "Pre-Fill & Translate Gemeinde Form" Tool | ❌ Fehlt | 🟡 **MITTEL** |
| **Email Generators** | Email-Vorlage für Gemeinde-Anmeldung | ⚠️ "Create Email" existiert, aber keine Vorlage | 🟡 **MITTEL** |
| **Completed Badge** | Timestamp anzeigen | ⚠️ Status wird gespeichert, aber Timestamp nicht angezeigt | 🟡 **MITTEL** |

---

## 📊 TASK 4: Register your kids at school

### ✅ **Implementiert:**
- Goal Message ✅
- Infobox mit FAQs ✅
- School Authority Info wird geladen ✅
- Document Vault Upload ✅
- "Download Documents" & "Create Email" Buttons ✅

### ⚠️ **Fehlende Features:**

| Feature | User Story | Status | Priorität |
|---------|-----------|--------|-----------|
| **PDF Fill Tools** | "Pre-Fill & Translate School Form" Tool | ❌ TODO-Kommentar vorhanden (Zeile 2240) | 🟡 **MITTEL** |
| **Email Generators** | Email-Vorlage für Schul-Anmeldung | ⚠️ "Create Email" existiert, aber keine Vorlage | 🟡 **MITTEL** |
| **Completed Badge** | Timestamp anzeigen | ⚠️ Status wird gespeichert, aber Timestamp nicht angezeigt | 🟡 **MITTEL** |

---

## 🎯 IMPLEMENTIERUNGS-PLAN

### Phase 1: Breadcrumb Navigation (🔴 HOCH)
1. ✅ Code existiert bereits in `formatAnswerText` (Zeile 1802-1842)
2. ⚠️ Muss aktiviert werden für alle FAQ-Answers
3. ⚠️ `(see task X)` Links müssen dynamisch sein (nicht nur Task 2)

### Phase 2: Completed Badge (🟡 MITTEL)
1. ✅ Status wird in localStorage gespeichert (`task_${taskId}_completed_date`)
2. ❌ Timestamp wird nicht in UI angezeigt
3. ✅ Muss in Task-Card angezeigt werden

### Phase 3: Realtime-Update (🔴 HOCH)
1. ❌ Nach Profil-Speicherung: Infobox muss neu geladen werden
2. ❌ Ohne Page-Reload
3. ✅ Event-System implementieren

### Phase 4: PDF Fill Tools (🟡 MITTEL)
1. ❌ "Pre-Fill & Translate Gemeinde Form" für Task 2
2. ❌ "Pre-Fill & Translate School Form" für Task 4
3. ✅ Resources-Sektion erweitern

### Phase 5: Email Generators (🟡 MITTEL)
1. ⚠️ "Create Email" Button existiert bereits
2. ❌ Email-Vorlagen fehlen
3. ✅ Resources-Sektion erweitern

---

## 📝 NÄCHSTE SCHRITTE

1. **Breadcrumb Navigation aktivieren** - `handleNextStep` und `handleSeeTask` für alle FAQ-Answers
2. **Completed Badge mit Timestamp** - UI erweitern
3. **Realtime-Update** - Event-System für Profil-Änderungen
4. **PDF Fill Tools** - Resources hinzufügen
5. **Email Generators** - Email-Vorlagen implementieren




















