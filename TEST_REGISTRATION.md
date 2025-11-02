# 🧪 Test: Registrierung & Datenbank-Speicherung

## ✅ Was wurde implementiert:

### 1. **API Route: `/api/auth/register`**
- ✅ Empfängt Form-Daten
- ✅ Validiert mit Zod
- ✅ Erstellt User in Supabase Auth
- ✅ Speichert Profil in `profiles`
- ✅ Speichert Interests in `user_interests`
- ✅ Loggt Event

### 2. **Datenbank-Speicherung:**

#### **auth.users**
- `id`, `email`, `encrypted_password`
- `email_confirmed_at` (null bis Email bestätigt)
- `user_metadata` (first_name, last_name)

#### **profiles**
- `user_id`, `living_situation`, `current_situation`
- `address_*`, `plz`, `city`, `avatar_url`

#### **user_interests**
- `user_id`, `interest_key`

### 3. **Email-Verifikation:**
- ✅ Wird **automatisch** von Supabase gesendet
- ✅ Trigger: `email_confirm: false` beim User-Creation
- ✅ Email enthält Bestätigungs-Link
- ✅ Link ist zeitlich begrenzt (24h Standard)

## 🧪 So testest du es:

### Schritt 1: Registrierung durchführen
1. Öffne: http://localhost:3000/register
2. Fülle alle Steps aus
3. Klicke "Complete!"

### Schritt 2: Datenbank prüfen

**In Supabase Dashboard:**

1. **Authentication > Users:**
   ```sql
   SELECT id, email, email_confirmed_at, created_at 
   FROM auth.users 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   ✅ Sollte deinen neuen User zeigen

2. **Table Editor > profiles:**
   ```sql
   SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
   ```
   ✅ Sollte dein Profil zeigen

3. **Table Editor > user_interests:**
   ```sql
   SELECT * FROM user_interests WHERE user_id = '<deine-user-id>';
   ```
   ✅ Sollte deine Interests zeigen

### Schritt 3: Email prüfen

**Option A: Supabase Dashboard**
1. Gehe zu: Authentication > Users
2. Klicke auf deinen User
3. Check "Email Logs" → Sollte versendete Email zeigen

**Option B: Inbox prüfen**
1. Check deine Email-Inbox
2. Suche nach Email von Supabase
3. Subject: "Confirm your signup"
4. Link: Bestätigungs-Link zum Klicken

**Option C: Console Logs**
```bash
# Check Server-Logs (wo npm run dev läuft)
# Sollte zeigen: "User created successfully. Email verification should be sent to: <email>"
```

## ⚠️ Wichtig - Email funktioniert nur wenn:

1. **Supabase Email aktiviert:**
   - Dashboard > Authentication > Settings
   - "Enable Email Confirmations" = ✅ ON

2. **SMTP konfiguriert** (für Production):
   - Dashboard > Settings > Auth > SMTP Settings
   - Oder nutze Supabase Default (limitiert)

3. **Development:**
   - Emails können in Development deaktiviert sein
   - Check Supabase Dashboard für Email-Logs

## 🔍 Debug falls nicht funktioniert:

### Problem: "User already exists"
- ✅ Lösung: Andere Email verwenden

### Problem: "Profile creation failed"
- ✅ Check RLS Policies auf `profiles` Tabelle
- ✅ Check ob `user_id` korrekt ist

### Problem: Email wird nicht gesendet
- ✅ Check Supabase Dashboard > Authentication > Settings
- ✅ Check Email Logs im User-Detail
- ✅ Check Spam-Ordner

### Problem: Daten fehlen in DB
- ✅ Check Server-Logs für Fehler
- ✅ Prüfe API Response im Network Tab

---

**Status:** ✅ Vollständig implementiert! Bereit zum Testen!


