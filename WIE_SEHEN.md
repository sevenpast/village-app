# 👀 Wo sehe ich den Registration Wizard?

## 🌐 Im Browser öffnen

### Option 1: Direkt zur Registration-Seite
**URL:** http://localhost:3000/register

### Option 2: Über die Homepage
1. Öffne: **http://localhost:3000**
2. Klicke auf den Link: **"🚀 Registration Wizard"**

## 🖥️ Was du sehen solltest

### Registration Wizard Seite:
- **Progress Bar** oben (zeigt 0-100%)
- **7 Step Indicators** mit Nummern und Titeln:
  1. Country & Language
  2. Living Situation
  3. Current Situation
  4. Address
  5. Interests
  6. Profile Picture
  7. Account Credentials
- **Aktueller Step** mit Formularfeldern
- **Navigation Buttons** (Previous/Next)

## ⚠️ Falls nichts angezeigt wird

### 1. Prüfe ob Server läuft:
```bash
cd /Users/andy/Documents/_02NewVillage/village-app
npm run dev
```

### 2. Prüfe die Console (F12):
- Öffne Browser Developer Tools
- Prüfe Console für Fehler
- Prüfe Network Tab für API-Calls

### 3. Teste die APIs direkt:
- http://localhost:3000/api/config/form/registration
- Sollte JSON mit Form Schema zurückgeben

## 📸 Screenshots (was du sehen solltest)

### Homepage (http://localhost:3000):
- Link "🚀 Registration Wizard" in der Liste

### Registration Page (http://localhost:3000/register):
- Große Überschrift "Registration"
- Progress Bar (blau, zeigt Fortschritt)
- Step Indicators oben
- Formularfelder für Step 1
- Buttons "Previous" (disabled) und "Next"

---

**Öffne einfach:** http://localhost:3000/register 🚀


