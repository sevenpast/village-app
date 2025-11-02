# 🚀 Vercel Deployment Checkliste

## ✅ Bereits vorbereitet

- ✅ Next.js 16.0.1 mit App Router
- ✅ TypeScript konfiguriert
- ✅ `package.json` mit Build-Script (`npm run build`)
- ✅ `.gitignore` schließt `.env*.local` aus
- ✅ Next.js konfiguriert (`next.config.ts`)
- ✅ Resend Email-Setup für Production
- ✅ Supabase Integration
- ✅ Environment-Variable-Logik (dev vs. prod)

---

## ⚙️ Vor dem ersten Deployment

### 1. Environment Variables in Vercel konfigurieren

Gehe zu **Vercel Dashboard → Project Settings → Environment Variables** und füge hinzu:

#### Supabase (Pflicht)
```
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key
SUPABASE_SERVICE_ROLE_KEY=dein-service-role-key
```

#### Email (Resend) - Pflicht
```
RESEND_API_KEY=re_dein_api_key_hier
```

#### Gemini AI (Optional, falls verwendet)
```
GEMINI_API_KEY=dein-gemini-key
```

#### App URL (Production)
```
APP_BASE_URL=https://deine-app.vercel.app
```
**Hinweis:** Nach dem ersten Deployment automatisch verfügbar als `VERCEL_URL`

#### Optional (falls MailDev lokal verwendet)
```
MAILDEV_ENABLED=false
```

---

### 2. Build-Konfiguration prüfen

**Node.js Version:** Stelle sicher, dass Vercel Node.js 20+ verwendet.

In Vercel Dashboard → Settings → General:
- **Node.js Version:** `20.x` oder höher

**Build Command:** Sollte automatisch erkannt werden als:
```bash
npm run build
```

**Output Directory:** 
```
.next
```

---

### 3. Supabase Konfiguration

#### RLS (Row Level Security) prüfen
- Stelle sicher, dass alle RLS-Policies korrekt gesetzt sind
- `SUPABASE_SERVICE_ROLE_KEY` wird nur server-side verwendet (niemals client-side!)

#### CORS für Vercel-Domain
- In Supabase Dashboard → Settings → API
- Füge deine Vercel-Domain zur erlaubten Liste hinzu (automatisch wenn `NEXT_PUBLIC_SUPABASE_URL` gesetzt ist)

---

### 4. GitHub Integration (Optional, aber empfohlen)

1. **In Vercel:**
   - Settings → Git → Connect GitHub Repository
   - Wähle `sevenpast/village-app`
   - Automatische Deployments für jeden Push!

2. **Branch Protection:**
   - `main`/`master` → Production
   - Feature Branches → Preview Deployments

---

## 🚀 Deployment-Schritte

### Option 1: GitHub Integration (Empfohlen)

1. **Repository bereits verbunden?** ✅ (siehe oben)
2. **Push zu GitHub:**
   ```bash
   git add .
   git commit -m "Ready for Vercel deployment"
   git push origin master
   ```
3. **Vercel erstellt automatisch:**
   - Preview Deployment für jeden Push
   - Production Deployment bei Merge zu `master`

### Option 2: Manuelles Deployment

1. **Vercel CLI installieren:**
   ```bash
   npm i -g vercel
   ```

2. **Deployment:**
   ```bash
   cd /Users/andy/Documents/_02NewVillage/village-app
   vercel
   ```

3. **Folge den Anweisungen:**
   - Link zu GitHub-Repository
   - Environment Variables setzen
   - Deploy!

---

## ✅ Nach dem Deployment prüfen

### 1. Health Check
- Öffne `https://deine-app.vercel.app`
- Prüfe ob die App lädt

### 2. API Routes testen
- `/api/auth/register` sollte funktionieren
- Supabase-Verbindung prüfen

### 3. Email-Funktionalität
- Registriere einen Test-Account
- Prüfe ob Email via Resend gesendet wird

### 4. Environment Variables
- Prüfe in Vercel Dashboard → Settings → Environment Variables
- Stelle sicher, dass alle für **Production** gesetzt sind

---

## 🔧 Häufige Probleme

### Build Error: "Module not found"
- Prüfe ob alle Dependencies in `package.json` sind
- Führe lokal `npm run build` aus um Fehler zu finden

### Environment Variables nicht verfügbar
- Prüfe ob Variablen für **Production** (nicht nur Preview) gesetzt sind
- Redeploy nach dem Hinzufügen von ENV-Variablen

### Supabase Connection Error
- Prüfe `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Prüfe RLS-Policies (Service Role Key sollte für Server-Routes funktionieren)

### Email wird nicht gesendet
- Prüfe `RESEND_API_KEY` in Vercel
- Prüfe Resend Dashboard für Fehler
- In Production sollte `NODE_ENV=production` sein

---

## 📚 Ressourcen

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Vercel Integration](https://supabase.com/docs/guides/getting-started/nextjs)

---

## 🎯 Next Steps nach erfolgreichem Deployment

1. ✅ Custom Domain konfigurieren (z.B. `expatvillage.ch`)
2. ✅ DNS-Einstellungen für Email-Domain (Resend)
3. ✅ Monitoring einrichten (Vercel Analytics)
4. ✅ Error Tracking (Sentry, etc.)
5. ✅ Performance Monitoring

---

**Status:** ✅ Bereit für Vercel Deployment!

**Was noch fehlt:** Nur Environment Variables in Vercel Dashboard konfigurieren!

