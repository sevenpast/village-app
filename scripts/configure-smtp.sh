#!/bin/bash

# Script to configure Custom SMTP in Supabase via Management API
# Usage: ./configure-smtp.sh <SUPABASE_ACCESS_TOKEN>

PROJECT_REF="jfldmfpbewiuahdhvjvc"
ACCESS_TOKEN="${1}"

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: Access Token required"
  echo ""
  echo "Usage: ./configure-smtp.sh <SUPABASE_ACCESS_TOKEN>"
  echo ""
  echo "To get your Access Token:"
  echo "1. Go to: https://supabase.com/dashboard/account/tokens"
  echo "2. Click 'Generate new token'"
  echo "3. Copy the token"
  exit 1
fi

echo "📧 Configuring Custom SMTP in Supabase..."
echo ""

# Gmail SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="andy.habluetzel@gmail.com"
SMTP_PASS="pshn hrai ejdi hgps"
SMTP_ADMIN_EMAIL="andy.habluetzel@gmail.com"
SMTP_SENDER_NAME="Village"

# Make API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"external_email_enabled\": true,
    \"mailer_secure_email_change_enabled\": true,
    \"mailer_autoconfirm\": false,
    \"smtp_admin_email\": \"${SMTP_ADMIN_EMAIL}\",
    \"smtp_host\": \"${SMTP_HOST}\",
    \"smtp_port\": ${SMTP_PORT},
    \"smtp_user\": \"${SMTP_USER}\",
    \"smtp_pass\": \"${SMTP_PASS}\",
    \"smtp_sender_name\": \"${SMTP_SENDER_NAME}\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
  echo "✅ Custom SMTP configured successfully!"
  echo ""
  echo "📋 Configuration:"
  echo "   Host: ${SMTP_HOST}"
  echo "   Port: ${SMTP_PORT}"
  echo "   User: ${SMTP_USER}"
  echo "   Sender: ${SMTP_SENDER_NAME} <${SMTP_ADMIN_EMAIL}>"
  echo ""
  echo "🧪 Test: Try signing up a new user - Supabase will now send emails via Gmail SMTP"
else
  echo "❌ Error: Failed to configure SMTP"
  echo "HTTP Code: $HTTP_CODE"
  echo "Response: $BODY"
  exit 1
fi

