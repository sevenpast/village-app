-- Village App: Seed Data for Config-Driven Tables
-- Execute this in Supabase Dashboard → SQL Editor

-- =========================
-- Feature Flags
-- =========================
insert into public.feature_flags (key, value, enabled, updated_at)
values
  ('email_verification_required', '{"required": false}', false, now()),
  ('pdf_provider', '{"provider": "pdf-lib"}', true, now()),
  ('ocr_provider', '{"provider": "noop"}', true, now()),
  ('address_provider', '{"provider": "nominatim"}', true, now())
on conflict (key) do update set
  value = excluded.value,
  enabled = excluded.enabled,
  updated_at = now();

-- =========================
-- Registration Form Schema
-- =========================
insert into public.form_schemas (id, version, json, created_at)
values (
  'registration',
  1,
  '{
    "steps": [
      {
        "id": "country_language",
        "title": "Country & Language",
        "fields": [
          {
            "name": "country",
            "type": "select",
            "label": "Country",
            "required": true,
            "dictionary": "countries",
            "validation": {
              "required": true
            }
          },
          {
            "name": "language",
            "type": "select",
            "label": "Language",
            "required": true,
            "dictionary": "languages",
            "validation": {
              "required": true
            }
          }
        ]
      },
      {
        "id": "living_situation",
        "title": "Living Situation",
        "fields": [
          {
            "name": "living_situation",
            "type": "select",
            "label": "Who do you live with?",
            "required": false,
            "dictionary": "living_situations",
            "validation": {}
          }
        ]
      },
      {
        "id": "current_situation",
        "title": "Current Situation",
        "fields": [
          {
            "name": "current_situation",
            "type": "select",
            "label": "What best describes your current situation?",
            "required": false,
            "dictionary": "current_situations",
            "validation": {}
          }
        ]
      },
      {
        "id": "address",
        "title": "Address",
        "fields": [
          {
            "name": "address_street",
            "type": "text",
            "label": "Street",
            "required": false,
            "validation": {}
          },
          {
            "name": "address_number",
            "type": "text",
            "label": "Number",
            "required": false,
            "validation": {}
          },
          {
            "name": "plz",
            "type": "text",
            "label": "Postal Code",
            "required": false,
            "validation": {
              "pattern": "^[0-9]{4}$",
              "patternMessage": "Swiss postal codes are 4 digits"
            }
          },
          {
            "name": "city",
            "type": "text",
            "label": "City",
            "required": false,
            "validation": {}
          }
        ]
      },
      {
        "id": "interests",
        "title": "Interests",
        "fields": [
          {
            "name": "interests",
            "type": "multiselect",
            "label": "Select your interests",
            "required": false,
            "dictionary": "interests",
            "validation": {
              "maxItems": 20
            }
          }
        ]
      },
      {
        "id": "avatar",
        "title": "Profile Picture",
        "fields": [
          {
            "name": "avatar",
            "type": "file",
            "label": "Upload profile picture",
            "required": false,
            "accept": "image/jpeg,image/png,image/webp",
            "validation": {
              "maxSize": 5242880,
              "maxSizeMessage": "Maximum file size is 5MB"
            }
          }
        ]
      },
      {
        "id": "credentials",
        "title": "Account Credentials",
        "fields": [
          {
            "name": "email",
            "type": "email",
            "label": "Email",
            "required": true,
            "validation": {
              "required": true,
              "email": true
            }
          },
          {
            "name": "password",
            "type": "password",
            "label": "Password",
            "required": true,
            "validation": {
              "required": true,
              "minLength": 8,
              "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]",
              "patternMessage": "Password must contain uppercase, lowercase, number and special character"
            }
          },
          {
            "name": "password_confirm",
            "type": "password",
            "label": "Confirm Password",
            "required": true,
            "validation": {
              "required": true,
              "match": "password",
              "matchMessage": "Passwords must match"
            }
          }
        ]
      }
    ]
  }'::jsonb,
  now()
)
on conflict (id) do update set
  json = excluded.json,
  version = excluded.version + 1;

-- =========================
-- Dictionaries (Locale: EN)
-- =========================
insert into public.dictionaries (key, locale, version, items)
values
  (
    'countries',
    'en',
    1,
    '[
      {"value": "US", "label": "United States"},
      {"value": "DE", "label": "Germany"},
      {"value": "FR", "label": "France"},
      {"value": "IT", "label": "Italy"},
      {"value": "IN", "label": "India"},
      {"value": "CN", "label": "China"},
      {"value": "BR", "label": "Brazil"},
      {"value": "AU", "label": "Australia"},
      {"value": "CA", "label": "Canada"}
    ]'::jsonb
  ),
  (
    'languages',
    'en',
    1,
    '[
      {"value": "en", "label": "English"},
      {"value": "de", "label": "German"},
      {"value": "fr", "label": "French"},
      {"value": "it", "label": "Italian"}
    ]'::jsonb
  ),
  (
    'living_situations',
    'en',
    1,
    '[
      {"value": "alone", "label": "Alone"},
      {"value": "partner", "label": "With partner"},
      {"value": "family", "label": "With family"},
      {"value": "shared", "label": "Shared flat (WG)"},
      {"value": "other", "label": "Other"}
    ]'::jsonb
  ),
  (
    'current_situations',
    'en',
    1,
    '[
      {"value": "just_moved", "label": "Just moved to Switzerland"},
      {"value": "planning", "label": "Planning to move"},
      {"value": "student", "label": "Student"},
      {"value": "employee", "label": "Employee"},
      {"value": "job_seeker", "label": "Job seeker"},
      {"value": "family_relocating", "label": "Family relocating"}
    ]'::jsonb
  ),
  (
    'interests',
    'en',
    1,
    '[
      {"value": "sport_fitness", "label": "Sport & Fitness"},
      {"value": "nature_hiking", "label": "Nature & Hiking"},
      {"value": "kids_family", "label": "Kids & Family"},
      {"value": "culture", "label": "Culture"},
      {"value": "food", "label": "Food"},
      {"value": "language_learning", "label": "Language Learning"}
    ]'::jsonb
  )
on conflict (key, locale, version) do update set
  items = excluded.items;

-- =========================
-- Dictionaries (Locale: DE)
-- =========================
insert into public.dictionaries (key, locale, version, items)
values
  (
    'countries',
    'de',
    1,
    '[
      {"value": "US", "label": "Vereinigte Staaten"},
      {"value": "DE", "label": "Deutschland"},
      {"value": "FR", "label": "Frankreich"},
      {"value": "IT", "label": "Italien"},
      {"value": "IN", "label": "Indien"},
      {"value": "CN", "label": "China"},
      {"value": "BR", "label": "Brasilien"},
      {"value": "AU", "label": "Australien"},
      {"value": "CA", "label": "Kanada"}
    ]'::jsonb
  ),
  (
    'languages',
    'de',
    1,
    '[
      {"value": "en", "label": "Englisch"},
      {"value": "de", "label": "Deutsch"},
      {"value": "fr", "label": "Französisch"},
      {"value": "it", "label": "Italienisch"}
    ]'::jsonb
  ),
  (
    'living_situations',
    'de',
    1,
    '[
      {"value": "alone", "label": "Allein"},
      {"value": "partner", "label": "Mit Partner/in"},
      {"value": "family", "label": "Mit Familie"},
      {"value": "shared", "label": "Wohngemeinschaft (WG)"},
      {"value": "other", "label": "Andere"}
    ]'::jsonb
  ),
  (
    'current_situations',
    'de',
    1,
    '[
      {"value": "just_moved", "label": "Gerade in die Schweiz gezogen"},
      {"value": "planning", "label": "Plane umzuziehen"},
      {"value": "student", "label": "Student/in"},
      {"value": "employee", "label": "Angestellte/r"},
      {"value": "job_seeker", "label": "Arbeitssuchende/r"},
      {"value": "family_relocating", "label": "Familie zieht um"}
    ]'::jsonb
  ),
  (
    'interests',
    'de',
    1,
    '[
      {"value": "sport_fitness", "label": "Sport & Fitness"},
      {"value": "nature_hiking", "label": "Natur & Wandern"},
      {"value": "kids_family", "label": "Kinder & Familie"},
      {"value": "culture", "label": "Kultur"},
      {"value": "food", "label": "Essen"},
      {"value": "language_learning", "label": "Sprachen lernen"}
    ]'::jsonb
  )
on conflict (key, locale, version) do update set
  items = excluded.items;

-- =========================
-- Email Templates (Welcome Email)
-- =========================
insert into public.email_templates (key, locale, version, mjml, html)
values
  (
    'welcome',
    'en',
    1,
    '<mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Welcome to Village!</mj-text>
            <mj-text>Thank you for joining us.</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>',
    '<html><body><h1>Welcome to Village!</h1><p>Thank you for joining us.</p></body></html>'
  ),
  (
    'welcome',
    'de',
    1,
    '<mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Willkommen bei Village!</mj-text>
            <mj-text>Vielen Dank, dass du dabei bist.</mj-text>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>',
    '<html><body><h1>Willkommen bei Village!</h1><p>Vielen Dank, dass du dabei bist.</p></body></html>'
  ),
  (
    'password_reset',
    'en',
    1,
    '<mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Password Reset Request</mj-text>
            <mj-text>Click the link below to reset your password:</mj-text>
            <mj-button href="{{resetLink}}">Reset Password</mj-button>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>',
    '<html><body><h1>Password Reset Request</h1><p>Click the link below to reset your password:</p><a href="{{resetLink}}">Reset Password</a></body></html>'
  ),
  (
    'password_reset',
    'de',
    1,
    '<mjml>
      <mj-body>
        <mj-section>
          <mj-column>
            <mj-text>Passwort zurücksetzen</mj-text>
            <mj-text>Klicke auf den Link unten, um dein Passwort zurückzusetzen:</mj-text>
            <mj-button href="{{resetLink}}">Passwort zurücksetzen</mj-button>
          </mj-column>
        </mj-section>
      </mj-body>
    </mjml>',
    '<html><body><h1>Passwort zurücksetzen</h1><p>Klicke auf den Link unten, um dein Passwort zurückzusetzen:</p><a href="{{resetLink}}">Passwort zurücksetzen</a></body></html>'
  )
on conflict (key, locale, version) do update set
  mjml = excluded.mjml,
  html = excluded.html;





