# 🔐 Vercel Environment Variables Setup

## 📋 Environment Variables für Vercel

Kopiere diese Environment Variables in **Vercel Dashboard → Project Settings → Environment Variables**

### 1. Supabase Configuration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jfldmfpbewiuahdhvjvc.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbGRtZnBiZXdpdWFoZGh2anZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMTIwOTcsImV4cCI6MjA3NzU4ODA5N30._T0ATY7ulE40vy0o2jbzGwyicE7zgQXvmc2TQsYF_gU

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbGRtZnBiZXdpdWFoZGh2anZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjAxMjA5NywiZXhwIjoyMDc3NTg4MDk3fQ.hFOkgC4RzDcnALobXB9SJjCE4nRtMgKIYDo6kiQECLM
```

### 2. Resend Email API

```bash
RESEND_API_KEY=re_AmbcFF3f_2hTXrCZwFNwfcERZyjGGCfKu
```

### 3. Gemini AI API

```bash
GEMINI_API_KEY=AIzaSyC8CHSLaNtftBtpLqk2HDuFX5Jiq98Pifo
```

### 4. App Configuration (Optional - wird automatisch gesetzt)

```bash
APP_BASE_URL=https://your-app.vercel.app
```

**Hinweis:** `APP_BASE_URL` wird automatisch von Vercel gesetzt als `VERCEL_URL`. Du kannst es manuell überschreiben, wenn du eine Custom Domain verwendest.

---

## 📝 Schritt-für-Schritt Anleitung

### In Vercel Dashboard:

1. Gehe zu deinem Projekt: https://vercel.com/dashboard
2. Klicke auf dein Projekt (`village-app`)
3. Gehe zu **Settings** → **Environment Variables**
4. Füge jede Variable einzeln hinzu:

   **Für jede Variable:**
   - **Key:** z.B. `NEXT_PUBLIC_SUPABASE_URL`
   - **Value:** Der entsprechende Wert (siehe oben)
   - **Environment:** Wähle alle aus:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

5. Klicke **Save** nach jeder Variable

---

## ✅ Nach dem Setzen der Variables

### WICHTIG: Redeploy erforderlich!

Nach dem Hinzufügen/Ändern von Environment Variables:

1. Gehe zu **Deployments** Tab
2. Klicke auf das **...** Menü bei dem neuesten Deployment
3. Wähle **Redeploy**

ODER

1. Push einen neuen Commit zu GitHub (wenn GitHub Integration aktiviert ist)

---

## 🔒 Sicherheit

✅ **NICHT committed:**
- `.env.local` ist in `.gitignore`
- Diese Keys werden NIEMALS ins Git-Repository gepusht

✅ **Vercel:**
- Environment Variables sind verschlüsselt gespeichert
- Nur sichtbar für Projekt-Mitglieder mit entsprechenden Berechtigungen

✅ **Service Role Key:**
- Wird NUR server-side verwendet (niemals client-side!)
- Hat volle Datenbank-Berechtigung - sehr sensibel!

---

## 🧪 Testing

Nach dem Deployment, teste:

1. **Homepage lädt:** `https://your-app.vercel.app`
2. **Registration funktioniert:** `/register`
3. **Email wird gesendet:** Prüfe Resend Dashboard
4. **Supabase verbunden:** Prüfe Supabase Dashboard → Logs

---

## 📚 Weitere Infos

Siehe auch: `VERCEL_DEPLOYMENT.md` für vollständige Deployment-Anleitung.

