# PDF Data Extraction Summary

## Behördeninformationen für Expatriates.pdf

Die PDF wurde erfolgreich extrahiert und analysiert. Sie enthält umfassende Informationen über administrative Kontaktstellen für Expats in der Schweiz.

### Extrahierte Daten

- **206 unique URLs** gefunden
- **63 unique phone numbers** gefunden  
- **47 unique emails** gefunden
- **20 Gemeinden** mit strukturierten Daten extrahiert

### Wichtige Erkenntnisse

1. **URLs sind in der PDF über mehrere Zeilen verteilt** - Das automatische Parsing hat teilweise abgeschnittene URLs erkannt
2. **Strukturierte Daten nach Kantonen** - Die PDF ist nach Regionen/Kantonen organisiert
3. **Vier Hauptbehördenkategorien**:
   - Migration (Kantonale Ebene)
   - Einwohnerdienste (Kommunale Ebene)
   - Schule (Kommunale Ebene)
   - Steuern (Kantonale/Kommunale Ebene)

### Nächste Schritte

1. **Manuelle URL-Extraktion**: Die vollständigen URLs müssen manuell aus der PDF extrahiert werden, da sie über Zeilenumbrüche gehen
2. **Datenbank-Update**: Die extrahierten URLs sollten in `municipality_master_data.registration_pages` gespeichert werden
3. **Kontaktdaten-Update**: Telefonnummern und E-Mails können in die Cache-Datenbank integriert werden

### Empfohlene Vorgehensweise

1. Manuell die vollständigen URLs aus der PDF extrahieren (siehe `extracted-municipality-data.json`)
2. SQL-Migration erstellen, um die URLs in die Datenbank einzufügen
3. Die URLs in `municipality-scraper.ts` als "top municipalities" markieren, wenn sie zu den Top-80% gehören

### Beispiel-URLs (aus PDF extrahiert)

- **Zürich**: `https://www.stadt-zuerich.ch/de/lebenslagen/einwohner-services/umziehen-melden/zuzug.html`
- **Genf**: `https://www.ge.ch/annoncer-mon-arrivee-ocpm`
- **Basel**: `https://www.bs.ch/jsd/bdm/bevoelkerungsamt/einwohneramt`
- **Lausanne**: `https://www.lausanne.ch/officiel/administration/securite-et-economie/controle-des-habitants.html`
- **Montreux**: `https://www.montreux.ch/guichet-virtuel/population`
- **Zug**: `https://www.stadtzug.ch/` (Einwohnerdienste)
- **Lugano**: `https://www.lugano.ch/la-mia-citta/amministrazione/dicasteri-divisioni/dicastero-istituzioni/amministrazione-generale/controllo-abitanti/`

### Wichtige Hinweise

- Die PDF enthält **Öffnungszeiten** für einige Gemeinden (z.B. Basel: "Mo, Di, Mi, Fr: 09:00–16:00 Uhr; Do: 13:00–16:00 Uhr")
- **Prozessinformationen** sind detailliert beschrieben (z.B. Lausanne: "ouvert uniquement sur rendez-vous")
- **Sprachliche Besonderheiten** müssen beachtet werden (deutsch/französisch/italienisch)




















