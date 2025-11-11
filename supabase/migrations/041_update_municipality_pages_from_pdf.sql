-- Migration: Update municipality registration pages from PDF "Behördeninformationen für Expatriates.pdf"
-- This migration adds URLs extracted from the comprehensive PDF document

-- Zürich (BFS: 261)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadt-zuerich.ch/de/lebenslagen/einwohner-services/umziehen-melden/zuzug.html',
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/oeffnungszeiten',
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste/kontakt',
    'https://www.stadt-zuerich.ch/de/politik-und-verwaltung/politik-und-recht/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 261;

-- Winterthur (BFS: 230)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://stadt.winterthur.ch/themen/leben-in-winterthur/auslaenderinnen-und-auslaender/neu-in-winterthur',
    'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste/kontakt',
    'https://stadt.winterthur.ch/themen/buerger-verwaltung/einwohnerdienste'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 230;

-- Genf (BFS: 6621)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.ge.ch/annoncer-mon-arrivee-ocpm',
    'https://www.ge.ch/organisation/office-cantonal-population-migrations-ocpm',
    'https://www.ge.ch/inscrire-mon-enfant-ecole-primaire'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 6621;

-- Basel (BFS: 2701)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.bs.ch/jsd/bdm/bevoelkerungsamt/einwohneramt',
    'https://www.bs.ch/jsd/bdm/migrationsamt',
    'https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz/wohnsitz-an-und-abmeldung',
    'https://www.bs.ch/de/buerger/dienstleistungen/wohnsitz',
    'https://www.bs.ch/de/buerger/dienstleistungen'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 2701;

-- Lausanne (BFS: 5586)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.lausanne.ch/officiel/administration/securite-et-economie/controle-des-habitants.html',
    'https://www.lausanne.ch/officiel/administration/securite-et-economie/controle-des-habitants/a-propos/prendre-rendez-vous.html',
    'https://www.lausanne.ch/prestations/ecoles-et-parascolaire/inscription-ecole.html'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5586;

-- Montreux (BFS: 5886)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.montreux.ch/guichet-virtuel/population',
    'https://www.montreux.ch/autorites-et-services-communaux/services-communaux/office-de-la-population',
    'https://www.montreux.ch/parascol'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5886;

-- Vevey (BFS: 5890)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.vevey.ch/prestations/formalites-darrivee',
    'https://www.vevey.ch/administration/famille-education-et-sport/secteur-education'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5890;

-- Nyon (BFS: 5724)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.nyon.ch/administration/services-communaux/controle-des-habitants'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5724;

-- Zug (BFS: 1711)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste',
    'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/oeffnungszeiten',
    'https://www.stadtzug.ch/de/verwaltung/einwohnerdienste/kontakt',
    'https://www.stadtschulenzug.ch/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1711;

-- Baar (BFS: 1701)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.baar.ch/dienstleistungen/25336',
    'https://www.baar.ch/einwohnerdienste',
    'https://www.schulen-baar.ch/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1701;

-- Cham (BFS: 1703)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.cham.ch/dienstleistungen/2038',
    'https://www.schulen-cham.ch/online-schalter/10585/detail'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1703;

-- Bern (BFS: 351)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/sue/polizeiinspektorat/einwohnerdienste-migration-und-fremdenpolizei-emf',
    'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/oeffnungszeiten',
    'https://www.bern.ch/themen/leben-in-bern/wohnen/einwohnerdienste/kontakt',
    'https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/bss/schulamt'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 351;

-- Lugano (BFS: 5192)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.lugano.ch/la-mia-citta/amministrazione/dicasteri-divisioni/dicastero-istituzioni/amministrazione-generale/controllo-abitanti/',
    'https://www.lugano.ch/temi/popolazione/anagrafe/orari',
    'https://www.lugano.ch/temi/popolazione/anagrafe/contatti',
    'https://www.lugano.ch/temi/popolazione/anagrafe',
    'https://scuole.lugano.ch/Contatti/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5192;

-- Paradiso (BFS: 5214)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://paradiso.ch/servizi-comunali/ufficio-controllo-abitanti/',
    'https://paradiso.ch/servizi-comunali/scuole-comunali-di-paradiso/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 5214;

-- Freienbach (BFS: 1322)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.freienbach.ch/freienbach/verwaltung/dienstleistungen/36986',
    'https://www.gemeindeschule-freienbach.ch/onlineschalter/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1322;

-- Wollerau (BFS: 1323)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.wollerau.ch/online-schalter/140881/detail',
    'https://www.schule-wollerau.ch/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 1323;

-- Reinach BL (BFS: 2830)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.reinach-bl.ch/de/verwaltung/dienstleistungen/detail/detail.php?i=184',
    'https://www.reinach-bl.ch/de/verwaltung/onlineschalter.php?abteilung_id=25',
    'https://www.primarstufereinach-bl.ch/kontakt/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 2830;

-- Allschwil (BFS: 2762)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.allschwil.ch/de/verwaltung/dienstleistungen/detail/detail.php?i=54',
    'https://www.allschwil.ch/de/verwaltung/oeffnungszeiten/',
    'https://primarstufe-allschwil.ch/schulverwaltung'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 2762;

-- Küsnacht ZH (BFS: 191)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.kuesnacht.ch/gemeinde/verwaltung',
    'https://www.schule-kuesnacht.ch/service/an-abmeldung-schule/online-anmeldung-schule/p-377/'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 191;

-- Thalwil (BFS: 140)
UPDATE municipality_master_data
SET 
  registration_pages = ARRAY[
    'https://www.thalwil.ch/aemter/2043',
    'https://www.thalwil.ch/online-schalter/2464/detail'
  ],
  updated_at = NOW()
WHERE bfs_nummer = 140;

COMMENT ON TABLE municipality_master_data IS 'Updated with URLs from PDF "Behördeninformationen für Expatriates.pdf" on 2025-11-06';



















