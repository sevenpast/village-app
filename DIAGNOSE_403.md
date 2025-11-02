# 🔍 Diagnose: HTTP 403 Fehler

## Problem
Beim Aufruf von API-Routen (z.B. `/api/config/form/registration`) erscheint:
```
Der Zugriff auf localhost wurde verweigert
Du bist nicht zum Aufrufen dieser Seite autorisiert.
HTTP ERROR 403
```

## Mögliche Ursachen

### 1. ✅ RLS Policies (wurde bereits gefixt)
- Migration `006_fix_rls_anon_role` wurde ausgeführt
- Policies sollten jetzt für `anon` role funktionieren

### 2. ⚠️ Environment Variables fehlen
Die `.env.local` Datei` muss existieren und folgende Variablen enthalten:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jfldmfpbewiuahdhvjvc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbGRtZnBiZXdpdWFoZGh2anZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTIwOTcsImV4cCI6MjA3NzU4ODA5N30._T0ATY7zgQXvmc2TQsYF_gU
```

### 3. 🔄 Server muss neu gestartet werden
Nach Änderungen an `.env.local` muss der Next.js Dev Server neu gestartet werden!

## Diagnose-Schritte

### Schritt 1: Test-Route aufrufen
```bash
# Server sollte laufen auf Port 5000
curl http://localhost:5000/api/test-supabase
```

Oder im Browser öffnen:
- http://localhost:5000/api/test-supabase

Diese Route zeigt:
- Ob ENV-Variablen gesetzt sind
- Ob die Supabase-Verbindung funktioniert
- Ob RLS-Policies blockieren
- Detaillierte Fehlermeldungen

### Schritt 2: .env.local prüfen
```bash
cd /Users/andy/Documents/_02NewVillage/village-app
cat .env.local
```

Falls die Datei fehlt, erstelle sie:
```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://jfldmfpbewiuahdhvjvc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbGRtZnBiZXdpdWFoZGh2anZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTIwOTcsImV4cCI6MjA3NzU4ODA5N30._T0ATY7zgQXvmc2TQsYF_gU
EOF
```

### Schritt 3: Server neu starten
```bash
# Stop Server (Ctrl+C)
# Dann neu starten:
npm run dev
```

### Schritt 4: Erneut testen
- http://localhost:5000/api/test-supabase
- http://localhost:5000/api/config/form/registration

## Weitere Debugging-Tipps

### Logs prüfen
Im Terminal, wo `npm run dev` läuft, sollten Fehlermeldungen erscheinen.

### Supabase Dashboard prüfen
1. Öffne: https://supabase.com/dashboard/project/jfldmfpbewiuahdhvjvc
2. Gehe zu: Authentication → Policies
3. Prüfe ob Policies für `form_schemas` aktiv sind

### Direkter SQL-Test
Im Supabase Dashboard SQL Editor:
```sql
-- Als anon user simulieren
SET ROLE anon;
SELECT * FROM form_schemas LIMIT 1;
RESET ROLE;
```

---

**Status:** Migration 006 ausgeführt, aber 403 bleibt → Wahrscheinlich ENV-Variablen fehlen oder Server muss neu gestartet werden!


