# 🌍 Village – Config-Driven Next.js + Supabase App

**Village** ist eine modular aufgebaute Web-App, entwickelt mit **Next.js (TypeScript)** und **Supabase**.  
Sie nutzt eine **Configuration-Driven Architecture** mit **Data-Driven** und **Event-Driven** Erweiterungen, um neue Features per Konfiguration statt Code zu ermöglichen.

---

## 🚀 Überblick

- **Framework:** Next.js (TypeScript, App Router)
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL + pgvector)
- **Auth:** Supabase Auth (Email + Password)
- **Styling:** Tailwind CSS
- **AI:** Gemini (LLM) + Ollama (lokal für Taskmaster)
- **MCPs:** Taskmaster MCP + Supabase MCP
- **Hosting:** Vercel + Supabase
- **Port (lokal):** [http://localhost:5000](http://localhost:5000)

---

## 🧩 Architekturprinzipien

- **Configuration-Driven:** Formulare, Dropdowns, Validierungen, Events und E-Mails stammen aus JSON/YAML oder DB-Tabellen.  
- **Data-Driven:** Inhalte, Labels, Übersetzungen, Feature Flags aus Supabase.  
- **Event-Driven:** Domain Events (z. B. `user.registered`, `password.reset.requested`) triggern Handler über Supabase Functions oder Edge Functions.  
- **MCP-Integration:**  
  - 🧠 **Taskmaster MCP** – erzeugt & verwaltet Aufgabenplan (lokales Ollama-Backend).  
  - 🗄️ **Supabase MCP** – steuert Schema-Migrationen, Seeds, Policies, Events direkt aus Cursor.

---

## 🧰 Lokales Setup

### 1. Voraussetzungen
- Node.js ≥ 20  
- npm oder pnpm  
- Git  
- Supabase CLI  
- Vercel CLI  
- MCPs installiert: **Taskmaster MCP**, **Supabase MCP**

### 2. Repository klonen
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/village-app.git
cd village-app
```

### 3. Dependencies installieren
```bash
npm install
# oder
pnpm install
```

### 4. Environment Variables
```bash
cp .env.example .env.local
# Bearbeite .env.local mit deinen Supabase Keys und API Keys
```

### 5. Supabase Setup
```bash
# Via Supabase MCP in Cursor:
# - Erstelle Schema (siehe prd_village_v_1_registration_login_password_reset_config_driven.md)
# - Setze RLS Policies
# - Seed initiale Daten (Form-Schemas, Dictionaries, Email-Templates)
```

### 6. Development Server starten
```bash
npm run dev
# Server läuft auf http://localhost:5000
```

---

## 📁 Projektstruktur

```
village-app/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth Routes (login, register, etc.)
│   ├── api/                 # API Routes
│   └── page.tsx             # Homepage
├── components/              # React Components
│   ├── ui/                  # UI Components (Buttons, Inputs, etc.)
│   ├── forms/               # Form Components
│   └── auth/                # Auth Components
├── lib/                     # Utility Libraries
│   ├── supabase/            # Supabase Client & Helpers
│   ├── auth/                # Auth Utilities
│   ├── config/              # Configuration Readers
│   └── utils/               # General Utils
├── types/                   # TypeScript Types
├── hooks/                   # React Hooks
├── .env.local               # Environment Variables (nicht committen!)
└── .env.example             # Environment Template
```

---

## 🔧 Entwicklung

### Konfiguration-Driven Forms
Forms werden aus Supabase-Tabellen (`form_schemas`) gelesen:

```typescript
// Beispiel: Registration Form Schema aus DB
{
  "id": "registration",
  "steps": [
    {
      "id": "country_language",
      "fields": [
        { "name": "country", "type": "select", "required": true },
        { "name": "language", "type": "select", "required": true }
      ]
    }
  ]
}
```

### Database Schema
Siehe PRD für vollständiges Schema. Kern-Tabellen:
- `profiles` – User Profile Daten
- `password_resets` – Password Reset Tokens (hashed)
- `form_schemas` – Form Configuration (JSON)
- `dictionaries` – Lokalisierte Dropdown-Optionen
- `email_templates` – Email Templates (MJML/HTML)
- `feature_flags` – Feature Flags
- `events` – Domain Events (Event-Driven)
- `tasks` / `user_tasks` – Task Engine

---

## 🚢 Deployment

### GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<USERNAME>/village-app.git
git push -u origin main
```

### CI/CD (GitHub Actions)
Siehe `.github/workflows/deploy.yml` (wird erstellt)

### Vercel Deployment
1. Connect GitHub Repo zu Vercel
2. Environment Variables setzen (von Supabase Dashboard)
3. Deploy automatisch nach Push auf `main`

---

## 📚 Dokumentation

- **PRD:** `prd_village_v_1_registration_login_password_reset_config_driven.md`
- **User Stories:** `user_stories_registration_login_v_1.md`
- **Task Stories:** `Task1_*.md` bis `Task5_*.md`
- **Architecture:** (wird erstellt: `ARCHITECTURE.md`)
- **Deployment:** (wird erstellt: `DEPLOYMENT.md`)

---

## ✅ Definition of Done

- ✅ Vollständige Registrierung & Login-Flows
- ✅ Config-Driven Architektur
- ✅ Tests bestanden
- ✅ GitHub Repo aktiv
- ✅ CI/CD lauffähig
- ✅ App läuft auf Vercel
- ✅ Dokumentation vorhanden

---

**Status:** 🟡 In Entwicklung (Phase 1: Setup)

**Letzte Aktualisierung:** 02.11.2025
