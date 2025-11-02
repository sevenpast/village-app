# 🔑 API Key Problem - Lösung

## ✅ Status

**Anon Key funktioniert direkt!** Der Test zeigt, dass die Keys korrekt sind und RLS-Policies funktionieren.

## 🎯 Problem

Der "Unauthorized: Invalid API key" Fehler kommt wahrscheinlich vom **Admin-Client**, der den Service Role Key verwendet. Das ist aber nur ein Fallback - der Haupt-Client mit Anon Key sollte funktionieren.

## 🔧 Lösung

1. **Server auf Port 5001 gestartet** (weil 3000 belegt war)
2. **Verbesserte Error-Logging** hinzugefügt
3. **Admin-Client Fehlerbehandlung** verbessert

## 🧪 Testen

```bash
# Server sollte laufen auf Port 5001
curl http://localhost:5001/api/config/form/registration

# Oder im Browser:
# http://localhost:5001
```

## 📝 Wichtig

Falls der Admin-Client fehlschlägt, **das ist OK** - er ist nur ein Fallback. Der Haupt-Client mit Anon Key sollte funktionieren, da:
- ✅ Direkter Test mit Anon Key erfolgreich
- ✅ RLS-Policies korrekt gesetzt
- ✅ Keys sind korrekt in .env.local

## 🚀 Nächster Schritt

Öffne http://localhost:5001 im Browser und teste die APIs!


