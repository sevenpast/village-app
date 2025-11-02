# ✅ Children Fields: Logik & Funktionalität

## 📋 Implementierung:

### **"How old are your children?" - Dynamic Fields**

**Standard-Verhalten:**
- ✅ **Immer 3 Felder angezeigt:** Child 1, Child 2, Child 3
- ✅ **Feld-Typ:** `number` (nur Zahlen)
- ✅ **Placeholder:** "Age"
- ✅ **Min/Max:** 0-99 Jahre
- ✅ **Nicht erforderlich** (User kann leer lassen)

### **Plus-Button (+):**
- ✅ Fügt weitere Felder hinzu (Child 4, Child 5, etc.)
- ✅ Max. 10 Felder möglich
- ✅ Text: "Add another child"

### **Remove-Button (X):**
- ✅ Wird nur angezeigt, wenn mehr als 3 Felder vorhanden sind
- ✅ Erste 3 Felder können NICHT entfernt werden (immer sichtbar)

### **Logik: Hat User Kinder?**

**WICHTIG für die Funktionalität:**

```typescript
// Prüfung ob User Kinder hat:
const hasChildren = (childrenAges: (number | string)[]): boolean => {
  // Wenn mindestens ein Feld ausgefüllt ist = User hat Kinder
  return childrenAges.some(age => age !== '' && age !== null && age !== undefined)
}

// Beispiel:
hasChildren(["8", "5", ""])  // → true (2 Felder ausgefüllt)
hasChildren(["", "", ""])     // → false (keine Felder ausgefüllt)
hasChildren(["10"])           // → true (1 Feld ausgefüllt)
hasChildren([])               // → false (leer)
```

**Regel:**
- **Felder ausgefüllt** → User hat Kinder
- **Alle Felder leer** → User hat keine Kinder

### **Progress-Berechnung:**

**WICHTIG:** Diese Felder werden NICHT in Progress gezählt!
- `children_ages` ist in `isDynamicField()` enthalten
- Grund: Nicht alle User haben Kinder
- Anzahl variiert
- Nicht obligatorisch

### **Datenbank-Speicherung:**

```json
{
  "children_ages": ["8", "5", ""]  // Array mit Alters-Werten
}
```

**Später in Profil:**
```sql
-- Wenn mindestens ein Wert vorhanden → User hat Kinder
SELECT 
  CASE 
    WHEN array_length(children_ages, 1) > 0 
         AND children_ages::text[] @> ARRAY['']::text[] = false
    THEN true 
    ELSE false 
  END as has_children
FROM profiles;
```

### **Task-Filtering (für Task 4 - School Registration):**

Basierend auf User Stories:
- Task 4 (School Registration) wird nur angezeigt wenn:
  - `has_children = true`
  - UND mindestens ein Kind ist 4-15 Jahre alt

```typescript
function shouldShowTask4(childrenAges: (number | string)[]): boolean {
  const hasChildren = childrenAges.some(age => 
    age !== '' && age !== null && age !== undefined
  )
  
  if (!hasChildren) return false
  
  // Prüfe ob mindestens ein Kind 4-15 Jahre alt ist
  return childrenAges.some(age => {
    const ageNum = parseInt(age.toString(), 10)
    return !isNaN(ageNum) && ageNum >= 4 && ageNum <= 15
  })
}
```

---

**Status:** ✅ Vollständig implementiert! Logik entspricht User Stories! 🚀


