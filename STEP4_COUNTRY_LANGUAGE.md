# ✅ Step 4: Country of Origin & Primary Language implementiert

## 📋 Was wurde implementiert:

### **Step 4: "Country & Language"**

Nach Step 3 (Arrival & Duration) kommt jetzt Step 4 mit:

1. **"What is your country of origin?"**
   - Typ: Select (Dropdown)
   - Dictionary: `countries` (dynamisch aus `countries` Tabelle)
   - Speichert: `country_of_origin_id` (FK zu `countries.id`)
   - **WICHTIG:** Visa-Status wird automatisch mit verknüpft

2. **"What is your primary language?"**
   - Typ: Select (Dropdown)
   - Dictionary: `languages` (English, German, French, Italian, etc.)
   - Speichert: `primary_language` (z.B. "en", "de", "fr")

### **Datenbank-Struktur:**

#### **`countries` Tabelle (NEU)**
```sql
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  iso_code VARCHAR(2) UNIQUE,     -- 'US', 'DE', 'IN'
  name_en VARCHAR(255),            -- 'United States of America'
  visa_status VARCHAR(20),         -- 'exempt', 'required', 'eu_efta'
  CHECK (visa_status IN ('exempt', 'required', 'eu_efta'))
);
```

**Beispieldaten:**
- `exempt`: USA, Kanada, Australien, Japan, Neuseeland
- `required`: Indien, China, Brasilien, Russland, Türkei
- `eu_efta`: Deutschland, Frankreich, Italien, Schweiz, etc.

#### **`profiles` Tabelle (erweitert)**
```sql
ALTER TABLE profiles 
ADD COLUMN country_of_origin_id INTEGER REFERENCES countries(id),
ADD COLUMN primary_language TEXT;
```

### **Visa-Status Verknüpfung:**

**WICHTIG für Task 1:**
- Wenn User `country_of_origin_id` wählt, wird automatisch der `visa_status` aus `countries` Tabelle mit verknüpft
- Task 1 kann später die Visa-Information so abfragen:
  ```sql
  SELECT c.visa_status 
  FROM profiles p
  JOIN countries c ON p.country_of_origin_id = c.id
  WHERE p.user_id = '<user_id>';
  ```

**Visa-Status Werte:**
- `exempt`: Non-EU/EFTA, visa-exempt (z.B. USA - 90 Tage visumfrei, dann Permit)
- `required`: Non-EU/EFTA, visa-required (z.B. Indien - D-Visum nötig)
- `eu_efta`: EU/EFTA-Bürger (keine Visa nötig, aber Gemeinde-Anmeldung)

### **API Integration:**

1. **Dictionary API:** `/api/config/dictionary/countries`
   - Holt Länder aus `countries` Tabelle
   - Transformiert zu Dictionary-Format
   - Enthält `visa_status` als Metadata

2. **Registration API:** `/api/auth/register`
   - Speichert `country_of_origin_id` in `profiles`
   - Speichert `primary_language` in `profiles`
   - Visa-Status wird automatisch via Foreign Key verfügbar

### **Step-Reihenfolge:**

1. Step 1: Personal Information
2. Step 2: Account Credentials
3. Step 3: Arrival & Duration
4. **Step 4: Country & Language** ← **NEU**
5. Step 5: Living Situation
6. Step 6: Current Situation
7. Step 7: Address
8. Step 8: Interests
9. Step 9: Profile Picture

### **Design:**

- ✅ Title: "Tailor your experience"
- ✅ Subtitle: "on Village" (orange)
- ✅ Progress Bar aktualisiert sich
- ✅ Dark Green Borders auf Dropdowns
- ✅ Searchable Dropdown für Countries (später möglich)

---

**Status:** ✅ Vollständig implementiert! Visa-Status wird automatisch mit verknüpft! 🚀

**Wichtig:** Diese Information ist essentiell für Task 1 (Residence Permit/Visa), da dort die Visa-Klassifizierung benötigt wird!


