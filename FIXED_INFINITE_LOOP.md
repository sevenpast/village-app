# ✅ Fix: Infinite Loop Error behoben

## Problem
"Maximum update depth exceeded" - Endlosschleife durch `useEffect` mit `watchedValues` als Dependency.

## Ursache
1. `watch()` gibt bei jedem Render ein neues Objekt zurück
2. `useEffect` triggert → `setFormData` → Re-render → `watch()` → neues Objekt → `useEffect` triggert wieder...

## Lösung

### 1. **watch() Subscription statt watch() direkt**
- Verwendet `watch((value) => {...})` mit Subscription
- Läuft nur einmal beim Mount

### 2. **Debouncing hinzugefügt**
- 500ms Delay vor localStorage-Save
- Verhindert zu häufige Updates

### 3. **Kein State-Update in Autosave**
- Nur localStorage wird aktualisiert
- `formData` State wird nicht mehr im Autosave-UseEffect aktualisiert

### 4. **useMemo für Zod Schema**
- Schema wird nur neu erstellt, wenn `formConfig` sich ändert

## Änderungen

```typescript
// VORHER (❌ Fehler):
useEffect(() => {
  setFormData((prev) => ({ ...prev, ...watchedValues }))
  localStorage.setItem('registration_draft', JSON.stringify({ ...formData, ...watchedValues }))
}, [watchedValues]) // ❌ Triggers infinite loop

// NACHHER (✅ Fix):
useEffect(() => {
  let timeoutId: NodeJS.Timeout | null = null
  const subscription = watch((value) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      localStorage.setItem('registration_draft', JSON.stringify(value))
    }, 500) // Debounce
  })
  return () => {
    subscription.unsubscribe()
    if (timeoutId) clearTimeout(timeoutId)
  }
}, []) // ✅ Only runs once
```

## Ergebnis
✅ Keine Endlosschleife mehr  
✅ Autosave funktioniert mit Debouncing  
✅ Performance verbessert  

---

**Status:** ✅ Fehler behoben!


