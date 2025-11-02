# 🔧 Quick Fix für HTTP 403 Fehler

## Problem
Der 403-Fehler kommt von **RLS (Row Level Security) Policies**, die zu restriktiv sind. Die Config-Tabellen müssen für anonyme Benutzer (anon role) lesbar sein.

## Lösung: SQL Migration ausführen

1. Öffne Supabase Dashboard: https://supabase.com/dashboard/project/jfldmfpbewiuahdhvjvc/sql/new
2. Öffne die Datei: `/Users/andy/Documents/_02NewVillage/village-app/supabase/migrations/005_fix_rls_final.sql`
3. Kopiere den gesamten SQL-Code
4. Füge ihn in den SQL Editor ein
5. Klicke **"Run"**

## Was macht die Migration?

- Setzt **öffentliche Lesepolicies** für alle Config-Tabellen:
  - `form_schemas`
  - `dictionaries`
  - `email_templates`
  - `feature_flags`
  - `municipalities`
- Erlaubt Zugriff für: `anon`, `authenticated`, `service_role`
- Testet am Ende, ob die Tabellen lesbar sind

## Nach der Migration testen

```bash
cd /Users/andy/Documents/_02NewVillage/village-app
npm run dev
```

Dann öffne:
- http://localhost:5000/api/test
- http://localhost:5000/api/config/form/registration

Sollten beide funktionieren! ✅





