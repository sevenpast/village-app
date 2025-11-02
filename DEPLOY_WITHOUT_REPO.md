# 🚀 Deployment ohne GitHub Repository Access

Falls Vercel keinen Zugriff auf das GitHub-Repository hat, kannst du das Projekt trotzdem deployen!

---

## Option 1: Repository in Vercel verbinden (Empfohlen)

### Schritt 1: Repository-Zugriff prüfen

1. Gehe zu **Vercel Dashboard** → **Settings** → **Git**
2. Prüfe ob `sevenpast/village-app` verbunden ist

### Schritt 2: Repository neu verbinden

1. Klicke auf **"Connect Git Repository"** oder **"Change Repository"**
2. Wähle **GitHub** als Provider
3. Authentifiziere dich mit GitHub (falls nötig)
4. Wähle das Repository: `sevenpast/village-app`
5. Klicke **Import**

### Schritt 3: Berechtigungen prüfen

Falls "No Repository Access":
- Stelle sicher, dass du bei GitHub mit dem Account `sevenpast` angemeldet bist
- Prüfe ob das Repository unter `sevenpast/village-app` existiert
- Prüfe ob du Owner/Collaborator des Repositories bist

---

## Option 2: Vercel CLI Deployment (Schnell)

Falls du das Repository nicht verbinden kannst, deploye manuell mit der CLI:

### 1. Vercel CLI installieren

```bash
npm install -g vercel
```

### 2. In Vercel anmelden

```bash
cd /Users/andy/Documents/_02NewVillage/village-app
vercel login
```

### 3. Projekt deployen

```bash
vercel
```

Folge den Anweisungen:
- **Set up and deploy?** → `Y`
- **Which scope?** → Wähle deinen Account
- **Link to existing project?** → `N` (für erstes Deployment)
- **Project name?** → `village-app` (oder anders)
- **Directory?** → `.` (aktuelles Verzeichnis)

### 4. Environment Variables setzen

Nach dem ersten Deployment, setze Environment Variables:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Füge den Wert ein: https://jfldmfpbewiuahdhvjvc.supabase.co
# Wähle alle Environments: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Füge den Wert ein: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Füge den Wert ein: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

vercel env add RESEND_API_KEY
# Füge den Wert ein: re_AmbcFF3f_2hTXrCZwFNwfcERZyjGGCfKu

vercel env add GEMINI_API_KEY
# Füge den Wert ein: AIzaSyC8CHSLaNtftBtpLqk2HDuFX5Jiq98Pifo
```

**Oder im Dashboard:**
1. Gehe zu Vercel Dashboard → Dein Projekt → Settings → Environment Variables
2. Füge alle Variablen hinzu (siehe `VERCEL_ENV_VARIABLES.md`)

### 5. Production Deployment

```bash
vercel --prod
```

---

## Option 3: Repository-Zugriff in Vercel prüfen

### GitHub OAuth erneuern

1. Gehe zu **Vercel Dashboard** → **Settings** → **Git**
2. Klicke auf **"Revoke"** bei GitHub (falls vorhanden)
3. Klicke auf **"Connect Git Provider"** → **GitHub**
4. Autorisiere Vercel für:
   - ✅ Repository Access (read/write)
   - ✅ Deine Repositories

### Repository-Berechtigungen prüfen

1. Gehe zu GitHub: https://github.com/settings/installations
2. Prüfe ob Vercel installiert ist
3. Klicke auf Vercel → **Configure**
4. Stelle sicher, dass `sevenpast/village-app` ausgewählt ist

---

## ✅ Nach erfolgreicher Verbindung

Sobald das Repository verbunden ist:

1. **Automatische Deployments:** Jeder Push zu GitHub löst ein Deployment aus
2. **Preview Deployments:** Für jeden Pull Request
3. **Production Deployments:** Für Push zu `main`/`master`

---

## 🆘 Troubleshooting

### "No Repository Access" Fehler

**Ursachen:**
- GitHub OAuth Token abgelaufen
- Repository nicht in Vercel-Berechtigungen
- Falscher GitHub Account verbunden

**Lösung:**
1. GitHub OAuth erneuern (siehe oben)
2. Prüfe ob `sevenpast/village-app` existiert
3. Prüfe ob du Owner des Repositories bist

### Vercel CLI Fehler

**"Not authenticated":**
```bash
vercel login
```

**"Project not found":**
```bash
vercel link
# Wähle bestehendes Projekt oder erstelle neues
```

---

## 📚 Nächste Schritte

Nach erfolgreichem Deployment:

1. ✅ Environment Variables prüfen
2. ✅ Teste die App auf `https://your-app.vercel.app`
3. ✅ Prüfe Logs für Fehler
4. ✅ Teste Registration/Login Flow

---

**Tipp:** Option 2 (Vercel CLI) ist am schnellsten, wenn Repository-Zugriff Probleme macht!

