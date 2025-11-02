# 📋 Alle Felder aus der Datenbank

## Aktuelle Felder (15 total):

### Step 1: Personal Information
1. ✅ `first_name` (text, required) - First Name
2. ✅ `last_name` (text, required) - Last Name
3. `gender` (select, optional) - M / F / Other
4. `date_of_birth` (text, optional) - Date of Birth (DD.MM.YYYY)

### Step 2: Living Situation
5. `living_situation` (select, optional) - Who do you live with?

### Step 3: Current Situation
6. `current_situation` (select, optional) - What best describes your current situation?

### Step 4: Address
7. `address_street` (text, optional) - Street
8. `address_number` (text, optional) - Number
9. `plz` (text, optional) - Postal Code
10. `city` (text, optional) - City

### Step 5: Interests
11. `interests` (multiselect, optional) - Select your interests

### Step 6: Profile Picture
12. `avatar` (file, optional) - Upload profile picture

### Step 7: Account Credentials
13. ✅ `email` (email, required) - Email
14. ✅ `password` (password, required) - Password
15. ✅ `password_confirm` (password, required) - Confirm Password

---

## ❌ Fehlende Felder (laut Screenshots):

### Aus Screenshot-Analyse erwartet:
- `country_of_origin` (select) - What is your country of origin?
- `primary_language` (select) - What is your primary language?
- `arrival_date` (text) - When did you arrive in Switzerland?
- `living_duration` (select) - How long are you planning on living in Switzerland?
- `swiss_address` (text, searchable) - What is your Swiss home address?
- `children_*` (dynamisch, variabel) - How old are your children? (Child 1, Child 2, Child 3, ...)

---

## 🔄 Dynamische Felder:

Dynamische Felder (die variabel sind):
- `children_*` - Kann 0-N Kinder haben
- Diese sollten **NICHT** in der Progress-Berechnung mitgezählt werden

---

**Status:** ✅ Liste erstellt. Progress-Logik wird angepasst.

