-- Populate registration_pages for top municipalities (80%+ of expats)
-- These pages are pre-configured to avoid dynamic searching with Gemini
-- Top 10 cities = 84% of expats in Switzerland

-- Zürich (19% of expats) - BFS: 261
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten',
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt',
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste',
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten.html'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 261;

-- Genf (18% of expats) - BFS: 6458
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.geneve.ch/fr/themes/administration/etat-civil/contact-et-horaires',
    'https://www.geneve.ch/fr/themes/administration/etat-civil'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 6458;

-- Basel (12% of expats) - BFS: 2701
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.basel.ch/verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://www.basel.ch/verwaltung/einwohnerdienste/kontakt',
    'https://www.basel.ch/verwaltung/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 2701;

-- Lausanne (9% of expats) - BFS: 5586
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.lausanne.ch/officiel/administration/etat-civil/contact-et-horaires',
    'https://www.lausanne.ch/officiel/administration/etat-civil'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5586;

-- Bern (6% of expats) - BFS: 351
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten',
    'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt',
    'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 351;

-- Lugano (6% of expats) - BFS: 5192
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.lugano.ch/temi/popolazione/anagrafe/orari',
    'https://www.lugano.ch/temi/popolazione/anagrafe/contatti',
    'https://www.lugano.ch/temi/popolazione/anagrafe'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5192;

-- Zug (6% of expats) - BFS: 1711
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt',
    'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1711;

-- Luzern (3% of expats) - BFS: 1061
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
    'https://www.stadtluzern.ch/themen/buerger-verwaltung/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1061;

-- Neuenburg (3% of expats) - BFS: 6454
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.neuchatelville.ch/fr/administration/etat-civil/contact-et-horaires',
    'https://www.neuchatelville.ch/fr/administration/etat-civil'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 6454;

-- St. Gallen (2% of expats) - BFS: 3203
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
    'https://www.stadt.sg.ch/themen/buerger-verwaltung/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 3203;

-- Winterthur (major city, many expats) - BFS: 230
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
    'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 230;

-- Allschwil (Basel region, many expats) - BFS: 2771
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/',
    'https://www.allschwil.ch/de/verwaltung/kontakt/',
    'https://www.allschwil.ch/de/verwaltung/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 2771;

-- Verify updates
SELECT 
  gemeinde_name,
  bfs_nummer,
  array_length(registration_pages, 1) as pages_count,
  registration_pages
FROM municipality_master_data
WHERE bfs_nummer IN (261, 6458, 2701, 5586, 351, 5192, 1711, 1061, 6454, 3203, 230, 2771)
ORDER BY bfs_nummer;




















