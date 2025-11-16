#!/bin/bash
# Simple script to check municipality URLs

echo "🔍 Testing municipality URLs..."
echo ""

# URLs from database (top municipalities)
declare -a urls=(
  "Allschwil|https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/"
  "Allschwil|https://www.allschwil.ch/de/verwaltung/kontakt/"
  "Allschwil|https://www.allschwil.ch/de/verwaltung/"
  "Basel|https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz/wohnsitz-an-und-abmeldung"
  "Basel|https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz"
  "Basel|https://www.bs.ch/de/buerger/dienstleistungen"
  "Bern|https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten"
  "Bern|https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt"
  "Bern|https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste"
  "Genf|https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires"
  "Genf|https://www.geneve.ch/fr/themes/administration/etat-civil"
  "Lausanne|https://www.lausanne.ch/officiel/administration/etat-civil/contact-et-horaires"
  "Lausanne|https://www.lausanne.ch/officiel/administration/etat-civil"
  "Lugano|https://www.lugano.ch/temi/popolazione/anagrafe/orari"
  "Lugano|https://www.lugano.ch/temi/popolazione/anagrafe/contatti"
  "Lugano|https://www.lugano.ch/temi/popolazione/anagrafe"
  "Luzern|https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten"
  "Luzern|https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt"
  "Luzern|https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste"
  "Neuenburg|https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires"
  "Neuenburg|https://www.neuchatelville.ch/fr/administration/etat-civil"
  "St. Gallen|https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten"
  "St. Gallen|https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt"
  "St. Gallen|https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste"
  "Winterthur|https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten"
  "Winterthur|https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt"
  "Winterthur|https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste"
  "Zug|https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten"
  "Zug|https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt"
  "Zug|https://www.stadtzug.ch/de/verwaltung/einwohnerdienste"
  "Zürich|https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten"
  "Zürich|https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt"
  "Zürich|https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste"
  "Zürich|https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten.html"
)

working=0
broken=0
redirected=0

for entry in "${urls[@]}"; do
  IFS='|' read -r gemeinde url <<< "$entry"
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 "$url" 2>/dev/null)
  
  if [ "$http_code" = "200" ]; then
    echo "✓ $gemeinde: $url"
    ((working++))
  elif [ "$http_code" = "301" ] || [ "$http_code" = "302" ] || [ "$http_code" = "307" ] || [ "$http_code" = "308" ]; then
    redirect_url=$(curl -s -o /dev/null -w "%{redirect_url}" -L --max-time 10 "$url" 2>/dev/null)
    echo "⚠ $gemeinde: $url → $redirect_url ($http_code)"
    ((redirected++))
  elif [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
    echo "✗ $gemeinde: $url (TIMEOUT/ERROR)"
    ((broken++))
  else
    echo "✗ $gemeinde: $url (HTTP $http_code)"
    ((broken++))
  fi
  
  sleep 0.3
done

echo ""
echo "📊 Summary:"
echo "  ✓ Working: $working"
echo "  ⚠ Redirected: $redirected"
echo "  ✗ Broken: $broken"
echo "  Total: $((working + redirected + broken))"




















