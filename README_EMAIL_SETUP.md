# 📧 Email Setup Guide

## Entwicklung (localhost)

### Option 1: Console Logging (Standard)
Emails werden im Terminal geloggt, keine echten Mails verschickt.

**Keine zusätzliche Konfiguration nötig!** ✅

Beim Start siehst du:
```
📧 [DEV] EMAIL VERIFICATION (NOT SENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: user@example.com
Subject: Confirm your Village account
Confirmation URL: http://localhost:3000/auth/confirm?token=...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Option 2: MailDev (Optional - für besseres Testing)
MailDev simuliert einen Email-Server und zeigt alle Emails in einer Web-UI an.

**Installation:**
```bash
npm install -g maildev
```

**Starten:**
```bash
maildev
```

**In `.env.local` aktivieren:**
```bash
MAILDEV_ENABLED=true
```

**Dann:**
- MailDev läuft auf `localhost:1025` (SMTP)
- Web-UI: http://localhost:1080
- Alle Emails werden dort angezeigt (HTML, Links klickbar!)

**Vorteile:**
- ✅ Emails sehen aus wie echte Emails
- ✅ Links sind klickbar
- ✅ HTML-Rendering wird getestet
- ✅ Mehrere Emails können gleichzeitig angezeigt werden

---

## Production (Vercel)

### Resend Setup

1. **API Key erstellen:**
   - Gehe zu https://resend.com/api-keys
   - Erstelle einen neuen API Key
   - Kopiere den Key (beginnt mit `re_...`)

2. **In Vercel hinterlegen:**
   - Gehe zu deinem Vercel Project → Settings → Environment Variables
   - Füge hinzu:
     ```
     RESEND_API_KEY=re_dein_api_key_hier
     ```
   - Stelle sicher, dass es für **Production**, **Preview** und **Development** gesetzt ist

3. **Domain verifizieren (optional, aber empfohlen):**
   - In Resend Dashboard → Domains
   - Füge `expatvillage.ch` hinzu
   - Folge den DNS-Anweisungen
   - Nach Verifizierung: Kein "via resend.com" Branding mehr! ✅

---

## Wie es funktioniert

Die Email-Logik ist in `/lib/email/index.ts`:

```typescript
// Automatische Umgebungs-Erkennung:
if (NODE_ENV === 'development') {
  // → Console Logging oder MailDev
} else {
  // → Resend (Production)
}
```

**Du musst nichts ändern!** Die App erkennt automatisch:
- ✅ `localhost` → Development Mode (Logging)
- ✅ `vercel.app` → Production Mode (Resend)

---

## Testing

### Lokal testen (Development):
```bash
npm run dev
# Registriere dich → Email wird geloggt (nicht wirklich gesendet)
```

### Mit MailDev:
```bash
# Terminal 1
maildev

# Terminal 2
MAILDEV_ENABLED=true npm run dev
# Registriere dich → Email erscheint in MailDev UI
```

### Production testen (Vercel Preview):
1. Push zu GitHub
2. Vercel erstellt Preview Deployment
3. Teste dort → Email wird **wirklich** via Resend gesendet

---

## Troubleshooting

**"RESEND_API_KEY not configured"**
→ In Production (Vercel) muss der Key gesetzt sein!

**MailDev funktioniert nicht:**
→ Prüfe ob `maildev` läuft: `lsof -i :1025`
→ Prüfe `.env.local`: `MAILDEV_ENABLED=true`

**Email wird nicht angezeigt in MailDev:**
→ Starte `maildev` neu
→ Prüfe Terminal für Fehler

---

## Kosten

**Development (localhost):**
- ✅ **Kostenlos** (Logging oder MailDev)

**Production (Vercel + Resend):**
- ✅ **100 Emails/Tag kostenlos** (3.000/Monat)
- ✅ Ab 3.001: $20/Monat für 50.000 Emails
- ✅ Für MVP: **Komplett kostenlos!** 🎉


