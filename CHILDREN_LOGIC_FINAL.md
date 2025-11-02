# ✅ Children Logic: Automatische Erkennung

## 📋 Finale Implementierung:

### **Step 5: "Living Situation"**

**Nur 2 Felder:**

1. **"Who do you live with?"**
   - Typ: Select (Dropdown)
   - Dictionary: `living_situations`
   - Nicht erforderlich

2. **"How old are your children?"**
   - Typ: Dynamic (number fields)
   - Standardmäßig 3 Felder: Child 1, Child 2, Child 3
   - Plus-Button zum Hinzufügen weiterer Felder
   - Nicht erforderlich

### **❌ ENTFERNT: "Do you have children?"**

**Begründung:**
- Automatische Erkennung basierend auf Feld-Befüllung
- Keine explizite Frage nötig

### **Automatische Logik:**

```typescript
/**
 * Prüft ob User Kinder hat basierend auf children_ages Array
 * @param childrenAges - Array von Alters-Werten (Zahlen oder Strings)
 * @returns true wenn mindestens ein Feld ausgefüllt ist
 */
function hasChildren(childrenAges: (number | string)[]): boolean {
  // Wenn mindestens ein Feld ausgefüllt ist = User hat Kinder
  return childrenAges.some(age => {
    const value = age?.toString().trim()
    return value !== '' && value !== null && value !== undefined
  })
}

// Beispiele:
hasChildren(["8", "5", ""])   // → true (2 Felder ausgefüllt)
hasChildren(["", "", ""])      // → false (keine Felder ausgefüllt)
hasChildren(["10", "", ""])    // → true (1 Feld ausgefüllt)
hasChildren([])                // → false (leer)
```

### **Verwendung in Tasks:**

**Task 4 - School Registration:**
- Wird nur angezeigt wenn `hasChildren(children_ages) === true`
- UND mindestens ein Kind ist 4-15 Jahre alt

**Task-Filtering:**
```typescript
function shouldShowSchoolTask(childrenAges: (number | string)[]): boolean {
  // Prüfe ob User Kinder hat
  const userHasChildren = hasChildren(childrenAges)
  if (!userHasChildren) return false
  
  // Prüfe ob mindestens ein Kind schulpflichtig ist (4-15 Jahre)
  return childrenAges.some(age => {
    const ageNum = parseInt(age?.toString() || '', 10)
    return !isNaN(ageNum) && ageNum >= 4 && ageNum <= 15
  })
}
```

### **Datenbank-Speicherung:**

```json
{
  "children_ages": ["8", "5", ""]  // Array mit Alters-Werten
}
```

**Profil-Abfrage:**
```sql
-- Prüfe ob User Kinder hat
SELECT 
  user_id,
  children_ages,
  CASE 
    WHEN children_ages IS NOT NULL 
         AND jsonb_array_length(children_ages) > 0
         AND children_ages::text[] @> ARRAY['']::text[] = false
    THEN true 
    ELSE false 
  END as has_children
FROM profiles;
```

---

**Status:** ✅ "Do you have children?" Feld entfernt! Logik ist automatisch basierend auf Feld-Befüllung! 🚀


