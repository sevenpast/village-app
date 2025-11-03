# Fix Email Verification Redirect URL

## Problem
Email-Verifizierungs-Links zeigen auf `localhost:3000` statt auf die Vercel-Produktions-URL.

## Lösung

### 1. Code-Änderungen (✅ Bereits erledigt)
- Neue Helper-Funktion `getBaseUrl()` erstellt
- Alle API-Routes verwenden jetzt die richtige URL basierend auf Environment
- `redirectTo` zeigt jetzt auf `/login` statt `/auth/callback`

### 2. Environment Variable in Vercel setzen
Gehe zu **Vercel Dashboard** → **village-app** → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_APP_URL=https://village-app-phi.vercel.app
```

**Wichtig**: Nach dem Setzen eine neue Deployment starten.

### 3. Supabase Auth Site URL aktualisieren
Gehe zu **Supabase Dashboard** → **Authentication** → **URL Configuration**:

1. **Site URL**: `https://village-app-phi.vercel.app`
2. **Redirect URLs**: Füge hinzu:
   - `https://village-app-phi.vercel.app/login`
   - `https://village-app-phi.vercel.app/auth/callback`
   - `https://village-app-phi.vercel.app/reset-password`

### 4. Supabase Custom SMTP Redirect URL prüfen
Gehe zu **Supabase Dashboard** → **Authentication** → **Email Templates**:

Die Email-Templates verwenden die **Site URL** aus der Auth-Konfiguration. Stelle sicher, dass:
- Site URL = `https://village-app-phi.vercel.app`
- Die Custom SMTP-Konfiguration aktiv ist

### 5. Testen
Nach allen Änderungen:
1. Neue Deployment auf Vercel starten
2. Neuen Account registrieren
3. Email-Verifizierungslink sollte auf `https://village-app-phi.vercel.app/login` führen

## Notizen
- Die `getBaseUrl()` Funktion priorisiert:
  1. `NEXT_PUBLIC_APP_URL` (manuell gesetzt)
  2. `VERCEL_URL` (automatisch von Vercel)
  3. `APP_BASE_URL` (legacy)
  4. `http://localhost:3000` (Fallback für Entwicklung)

