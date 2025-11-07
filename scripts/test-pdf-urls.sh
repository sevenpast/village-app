#!/bin/bash

echo "🔍 Testing URLs from PDF migration..."
echo ""

# Extract URLs from SQL migration file
MIGRATION_FILE="supabase/migrations/041_update_municipality_pages_from_pdf.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

# Extract URLs from SQL file (lines with https://)
# Use sed instead of grep -P for macOS compatibility
URLS=$(grep "https://" "$MIGRATION_FILE" | sed -E "s/.*'https:\/\/([^']+)'.*/\1/" | sed 's|^|https://|' | sort -u)

WORKING=0
REDIRECTED=0
BROKEN=0
TIMEOUT=0

TOTAL=$(echo "$URLS" | wc -l | tr -d ' ')
echo "📊 Testing $TOTAL unique URLs..."
echo ""

for url in $URLS; do
  # Extract municipality name from URL for logging
  municipality_name=$(echo "$url" | sed -E 's|https?://(www\.)?([a-zA-Z0-9\.-]+)\.ch.*|\2|' | sed 's/stadt-//g' | sed 's/ville-//g' | sed 's/neuchatelville/neuenburg/g' | sed 's/geneve/genf/g' | sed 's/lausanne/lausanne/g' | sed 's/lugano/lugano/g' | sed 's/bern/bern/g' | sed 's/basel/basel/g' | sed 's/zuerich/zürich/g' | sed 's/luzern/luzern/g' | sed 's/winterthur/winterthur/g' | sed 's/zug/zug/g' | sed 's/allschwil/allschwil/g' | sed 's/st\.sg/st. gallen/g' | sed 's/bs/basel/g' | sed 's/edubs/basel/g' | sed 's/nyon/nyon/g' | sed 's/montreux/montreux/g' | sed 's/vevey/vevey/g' | sed 's/baar/baar/g' | sed 's/cham/cham/g' | sed 's/paradiso/paradiso/g' | sed 's/freienbach/freienbach/g' | sed 's/wollerau/wollerau/g' | sed 's/reinach-bl/reinach/g' | sed 's/kuesnacht/küsnacht/g' | sed 's/thalwil/thalwil/g' | sed 's/primarstufe-allschwil/allschwil/g' | sed 's/schule-kuesnacht/küsnacht/g' | sed 's/thalwil/thalwil/g' | sed 's/stadtschulenzug/zug/g' | sed 's/schulen-baar/baar/g' | sed 's/schulen-cham/cham/g' | sed 's/gemeindeschule-freienbach/freienbach/g' | sed 's/schule-wollerau/wollerau/g' | sed 's/primarstufereinach-bl/reinach/g')
  
  # Test URL with curl (10 second timeout)
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

# Calculate success rate
if [ "$TOTAL" -gt 0 ]; then
  SUCCESS_RATE=$(( (WORKING + REDIRECTED) * 100 / TOTAL ))
  echo "✅ Success rate: ${SUCCESS_RATE}%"
  
  if [ "$SUCCESS_RATE" -ge 80 ]; then
    echo "🎉 Excellent! Most URLs are working."
  elif [ "$SUCCESS_RATE" -ge 60 ]; then
    echo "⚠️  Warning: Some URLs need attention."
  else
    echo "❌ Critical: Many URLs are broken. Review needed."
  fi
fi

