#!/bin/bash

echo "🔍 Testing CORRECTED URLs from migration 042..."
echo ""

# Test corrected URLs
CORRECTED_URLS=(
  "https://stadt.winterthur.ch/gemeinde/verwaltung/sicherheit-und-umwelt/melde-und-zivilstandswesen/einwohnerkontrolle"
  "https://www.stadt-zuerich.ch/de/lebenslagen/einwohner-services"
  "https://www.stadt-zuerich.ch/de/lebenslagen/einwohner-services/umziehen-melden"
  "https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste"
  "https://www.stadtzug.ch/de/verwaltung"
  "https://www.stadtzug.ch/de/verwaltung/einwohnerkontrolle"
  "https://www.nyon.ch/administration"
  "https://www.nyon.ch/administration/services-communaux"
  "https://www.nyon.ch/administration/services-communaux/controle-des-habitants"
  "https://www.kuesnacht.ch/gemeinde"
  "https://www.kuesnacht.ch/gemeinde/verwaltung/abteilungen/zentrale-dienste/einwohneramt"
)

WORKING=0
REDIRECTED=0
BROKEN=0
TIMEOUT=0

TOTAL=${#CORRECTED_URLS[@]}
echo "📊 Testing $TOTAL corrected URLs..."
echo ""

for url in "${CORRECTED_URLS[@]}"; do
  municipality_name=$(echo "$url" | sed -E 's|https?://(www\.)?([a-zA-Z0-9\.-]+)\.ch.*|\2|' | sed 's/stadt-//g' | sed 's/kuesnacht/küsnacht/g')
  
  status=$(curl -o /dev/null -s -w "%{http_code}" -L --max-time 10 "$url" -A "Mozilla/5.0 (Village App URL Checker 1.0)" 2>&1)
  
  if [ "$status" = "000" ] || [ -z "$status" ]; then
    echo "⏱️  $municipality_name: $url (Timeout/Error)"
    TIMEOUT=$((TIMEOUT+1))
  elif [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
    echo "✓ $municipality_name: $url"
    WORKING=$((WORKING+1))
  elif [ "$status" -ge 300 ] && [ "$status" -lt 400 ]; then
    echo "⚠ $municipality_name: $url (HTTP $status - Redirected)"
    REDIRECTED=$((REDIRECTED+1))
  else
    echo "✗ $municipality_name: $url (HTTP $status)"
    BROKEN=$((BROKEN+1))
  fi
done

echo ""
echo "📊 Summary:"
echo "  ✓ Working: $WORKING"
echo "  ⚠ Redirected: $REDIRECTED"
echo "  ✗ Broken: $BROKEN"
echo "  ⏱️  Timeout/Error: $TIMEOUT"
echo "  Total: $TOTAL"
echo ""

if [ "$TOTAL" -gt 0 ]; then
  SUCCESS_RATE=$(( (WORKING + REDIRECTED) * 100 / TOTAL ))
  echo "✅ Success rate: ${SUCCESS_RATE}%"
fi



















