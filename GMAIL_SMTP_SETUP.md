# Gmail SMTP Setup für Email-Verifizierung

## Problem: Supabase Email blockiert
- "Email sending privileges at risk due to bounce backs"
- Supabase hat Email-Versand wegen hoher Bounce-Rate eingeschränkt

## Lösung: Gmail SMTP (Kostenlos & Unbegrenzt)

### ✅ Vorteile:
- **Kostenlos** - Kein Bezahl-Account nötig
- **Keine Domain-Beschränkungen** - Sendet an alle Email-Adressen
- **Zuverlässig** - Gmail's SMTP ist sehr stabil
- **Sofort einsatzbereit** - Keine Domain-Verifizierung nötig

---

## 1. Gmail App Password erstellen

### Schritt 1: Google Account vorbereiten
1. Gehe zu **[Google Account Settings](https://myaccount.google.com/)**
2. **Security** → **2-Step Verification** → **Aktivieren** (falls nicht aktiv)
3. **Security** → **App passwords**

### Schritt 2: App Password generieren
1. **Select app**: "Mail"
2. **Select device**: "Other (Custom name)" → "Village App"
3. **Klicke "Generate"**
4. **Kopiere das 16-stellige Password** (z.B. `abcd efgh ijkl mnop`)

---

## 2. Environment Variables konfigurieren

### Localhost (.env.local):
```bash
# Gmail SMTP Configuration
GMAIL_USER=deine-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# Andere bestehende Variables...
NEXT_PUBLIC_APP_URL=http://localhost:3000
FORCE_PRODUCTION_EMAILS=true
```

### Vercel (Dashboard → Settings → Environment Variables):
```bash
GMAIL_USER=deine-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
NEXT_PUBLIC_APP_URL=https://village-app-phi.vercel.app
FORCE_PRODUCTION_EMAILS=true
```

---

## 3. Testen

### Localhost Test:
```bash
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### Erwartetes Ergebnis:
```
✅ Email verification sent successfully to: test@example.com
```

---

## 4. Email-Flow

1. **Benutzer registriert sich** → Account wird erstellt
2. **Gmail SMTP sendet Email** → An beliebige Email-Adresse
3. **Email enthält Link** → `https://deine-app.vercel.app/auth/callback?token=...`
4. **Benutzer klickt Link** → Email wird verifiziert
5. **Automatische Weiterleitung** → Zu Login-Seite

---

## 5. System-Priorität

```javascript
// Das System versucht in dieser Reihenfolge:
1. Gmail SMTP (wenn GMAIL_USER + GMAIL_APP_PASSWORD gesetzt)
2. Resend (fallback, wenn Gmail nicht konfiguriert)
3. Development Console (nur in Development mode)
```

---

## ✅ Fertig!

Das Email-System funktioniert jetzt mit **allen Email-Adressen** ohne Domain-Beschränkungen!

### Wichtige Hinweise:
- **Gmail Limit**: 500 Emails/Tag (mehr als genug für Testing)
- **Sicherheit**: App Password ist sicherer als normales Password
- **Production Ready**: Gmail SMTP ist production-tauglich
- **Backup**: Resend funktioniert als Fallback

**Das ist die beste Lösung für Testing und kleine Production-Apps!** 🚀