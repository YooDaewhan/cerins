-- =====================================================================
-- CERINS local MySQL bootstrap
--   - 데이터베이스 생성 + 모든 테이블 스키마 + 목업 시드 데이터
--   - 실행: mysql -u root -p < db/cerins.sql
--   - 실행: mysql -u cerins -p < ~/cerins/db/cerins.sql
-- =====================================================================

DROP DATABASE IF EXISTS cerins;
CREATE DATABASE cerins
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE cerins;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------
-- 1. locales
-- ---------------------------------------------------------------------
CREATE TABLE locales (
  code         VARCHAR(8)   NOT NULL PRIMARY KEY,
  name         VARCHAR(64)  NOT NULL,
  native_name  VARCHAR(64)  NOT NULL,
  is_enabled   TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order   INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO locales (code, name, native_name, is_enabled, sort_order) VALUES
  ('ko', 'Korean',   '한국어',   1, 1),
  ('en', 'English',  'English',  1, 2),
  ('ja', 'Japanese', '日本語',   1, 3),
  ('zh', 'Chinese',  '中文',     1, 4),
  ('ru', 'Russian',  'Русский',  1, 5),
  ('kk', 'Kazakh',   'Қазақша',  1, 6),
  ('vi', 'Vietnamese','Tiếng Việt', 1, 7);

-- ---------------------------------------------------------------------
-- 2. pages
-- ---------------------------------------------------------------------
CREATE TABLE pages (
  id           INT          NOT NULL PRIMARY KEY,
  slug         VARCHAR(128) NOT NULL UNIQUE,
  template     ENUM('home','about','certification','inspection','services','news_list','faq_list','contact','simple') NOT NULL,
  parent_id    INT          NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order   INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pages_template (template),
  INDEX idx_pages_published (is_published),
  INDEX idx_pages_parent (parent_id),
  CONSTRAINT fk_pages_parent FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ponytail: 2단계까지만. 손주가 필요해질 때 자기참조 트리 쿼리(WITH RECURSIVE)로 확장.
-- 기존 DB에 적용: ALTER TABLE pages ADD COLUMN parent_id INT NULL,
--   ADD INDEX idx_pages_parent (parent_id),
--   ADD CONSTRAINT fk_pages_parent FOREIGN KEY (parent_id) REFERENCES pages(id) ON DELETE CASCADE;

INSERT INTO pages (id, slug, template, is_published, sort_order, created_at, updated_at) VALUES
  (1,  'home',          'home',          1, 1,  '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (2,  'about',         'about',         1, 10, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (3,  'certification', 'certification', 1, 20, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (4,  'inspection',    'inspection',    1, 30, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (5,  'contact',       'contact',       1, 40, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (6,  'news',          'news_list',     1, 50, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (7,  'faq',           'faq_list',      1, 55, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (10, 'about-cerins',                     'about', 1, 11, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (11, 'vision',                           'about', 1, 12, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (12, 'business-ethics-and-compliance',   'about', 1, 13, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (13, 'certification-and-accreditations', 'about', 1, 14, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (14, 'location',                         'about', 1, 15, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (20, 'russia',        'certification', 1, 21, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (21, 'kazakhstan',    'certification', 1, 22, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (22, 'belarus',       'certification', 1, 23, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (23, 'uzbekistan',    'certification', 1, 24, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (24, 'ukraine',       'certification', 1, 25, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (25, 'turkmenistan',  'certification', 1, 26, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (26, 'azerbaijan',    'certification', 1, 27, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (27, 'vietnam',       'certification', 1, 28, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (28, 'europe',        'certification', 1, 29, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (30, 'pre-shipment-inspection', 'inspection', 1, 31, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (31, 'india-voc',               'inspection', 1, 32, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (32, 'ndt',                     'inspection', 1, 33, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (33, 'general-inspection',      'inspection', 1, 34, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (34, 'other-services',          'inspection', 1, 35, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (40, 'documentation',                       'services', 1, 41, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (41, 'project-management-custom-brokerage', 'services', 1, 42, '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- 인증서 하위 상세 페이지 (parent_id = 국가 페이지 20~28)
INSERT INTO pages (id, slug, template, parent_id, is_published, sort_order) VALUES
  -- 러시아 (20)
  (100, 'russia-trcu',            'certification', 20, 1, 1),
  (101, 'russia-trcu-ex',         'certification', 20, 1, 2),
  (102, 'russia-gost-r',          'certification', 20, 1, 3),
  (103, 'russia-ise',             'certification', 20, 1, 4),
  (104, 'russia-fire-safety',     'certification', 20, 1, 5),
  (105, 'russia-metrology',       'certification', 20, 1, 6),
  (106, 'russia-rtn',             'certification', 20, 1, 7),
  (107, 'russia-hygiene',         'certification', 20, 1, 8),
  (108, 'russia-medical',         'certification', 20, 1, 9),
  (109, 'russia-others',          'certification', 20, 1, 10),
  -- 카자흐스탄 (21)
  (110, 'kazakhstan-trcu',        'certification', 21, 1, 1),
  (111, 'kazakhstan-trcu-ex',     'certification', 21, 1, 2),
  (112, 'kazakhstan-gost-k',      'certification', 21, 1, 3),
  (113, 'kazakhstan-ise-k',       'certification', 21, 1, 4),
  (114, 'kazakhstan-fire-safety-k','certification', 21, 1, 5),
  (115, 'kazakhstan-metrology-k', 'certification', 21, 1, 6),
  (116, 'kazakhstan-ggtn',        'certification', 21, 1, 7),
  -- 벨라루스·키르기스스탄·아르메니아 (22)
  (117, 'belarus-trcu',           'certification', 22, 1, 1),
  (118, 'belarus-trcu-ex',        'certification', 22, 1, 2),
  -- 우즈베키스탄 (23)
  (119, 'uzbekistan-gust-uz',     'certification', 23, 1, 1),
  -- 우크라이나 (24)
  (120, 'ukraine-sepro',          'certification', 24, 1, 1),
  -- 투르크메니스탄 (25)
  (121, 'turkmenistan-tds',       'certification', 25, 1, 1),
  -- 아제르바이잔 (26)
  (122, 'azerbaijan-certification','certification', 26, 1, 1),
  -- 베트남 (27)
  (123, 'vietnam-cr',             'certification', 27, 1, 1),
  -- 유럽 (28)
  (124, 'europe-ce-mark',         'certification', 28, 1, 1);

-- ---------------------------------------------------------------------
-- 3. page_translations
--   content 컬럼은 JSON 배열(PageContentBlock[]).
-- ---------------------------------------------------------------------
CREATE TABLE page_translations (
  id               INT          NOT NULL PRIMARY KEY,
  page_id          INT          NOT NULL,
  locale           VARCHAR(8)   NOT NULL,
  title            VARCHAR(255) NOT NULL,
  subtitle         VARCHAR(255) NULL,
  hero_image       VARCHAR(512) NULL,
  content          JSON         NOT NULL,
  meta_title       VARCHAR(255) NOT NULL,
  meta_description TEXT         NOT NULL,
  meta_keywords    JSON         NOT NULL DEFAULT (JSON_ARRAY()),
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_page_locale (page_id, locale),
  CONSTRAINT fk_pt_page   FOREIGN KEY (page_id) REFERENCES pages(id)   ON DELETE CASCADE,
  CONSTRAINT fk_pt_locale FOREIGN KEY (locale)  REFERENCES locales(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── English ───────────────────────────────────────────────────────────
INSERT INTO page_translations (id, page_id, locale, title, subtitle, hero_image, content, meta_title, meta_description, created_at, updated_at) VALUES
  (1, 1, 'en',
   'CERINS — Global Certification & Inspection Partner',
   'Global Standards. Trusted Partners.',
   NULL,
   JSON_ARRAY(),
   'CERINS — Global Certification & Inspection Partner',
   'CERINS provides professional certification, inspection, documentation, project management and customs brokerage services for companies entering global markets.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (2, 2, 'en',
   'About CERINS',
   'Global Certification & Inspection Partner since 2009',
   NULL,
   JSON_ARRAY(),
   'About CERINS',
   'Learn who CERINS is — our history, global reach, and what sets us apart as a trusted certification and inspection partner.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (3, 3, 'en',
   'Certification',
   'Market-specific certification services across CIS, Europe, and Asia',
   NULL,
   JSON_ARRAY(),
   'Certification Services — CERINS',
   'CERINS facilitates mandatory product certification for exporters entering regulated markets worldwide.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (4, 4, 'en',
   'Inspection',
   'Professional inspection and quality assurance services worldwide',
   NULL,
   JSON_ARRAY(),
   'Inspection Services — CERINS',
   'Certified inspectors across Korea, China, Vietnam, India, and Turkey — ensuring product quality, regulatory conformity, and on-time delivery.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (5, 5, 'en',
   'Contact Us',
   'Get in touch with our certification and inspection experts.',
   NULL,
   JSON_ARRAY(
     JSON_OBJECT('heading','Head Office',                   'body','123 Teheran-ro, Gangnam-gu\nSeoul 06234, Republic of Korea'),
     JSON_OBJECT('heading','Telephone',                     'body','+82-2-1234-5678'),
     JSON_OBJECT('heading','Email',                         'body','info@cerins.com'),
     JSON_OBJECT('heading','Business Hours',                'body','Mon — Fri: 09:00 — 18:00 KST'),
     JSON_OBJECT('heading','Moscow, Russia',                'body','45 Tverskaya Street, Moscow 125009'),
     JSON_OBJECT('heading','Ho Chi Minh City, Vietnam',     'body','88 Nguyen Hue Boulevard, District 1')
   ),
   'Contact — CERINS',
   'Reach the CERINS certification and inspection team in Seoul, Moscow, and Ho Chi Minh City.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (6, 6, 'en',
   'News Room',
   'The latest announcements, insights, and regulatory updates from CERINS.',
   NULL,
   JSON_ARRAY(),
   'News Room — CERINS',
   'Announcements, insights, and regulatory updates from CERINS.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (7, 7, 'en',
   'FAQ',
   'Frequently asked questions about CERINS certification and inspection services.',
   NULL,
   JSON_ARRAY(),
   'FAQ — CERINS',
   'Frequently asked questions about CERINS certification and inspection services.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (10, 10, 'en',
   'About CERINS', 'Who We Are',
   'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Company Overview', 'body','CERINS is a global certification and inspection consulting firm headquartered in Seoul, Korea. We specialize in helping manufacturers and exporters navigate international regulatory requirements with confidence and efficiency.'),
     JSON_OBJECT('heading','Our Expertise',    'body','With more than 15 years of hands-on experience, our team provides end-to-end solutions covering certification, pre-shipment inspection, documentation, and customs brokerage across key global markets including Russia, the CIS region, Europe, and Southeast Asia.'),
     JSON_OBJECT('heading','Why Choose CERINS','body','We combine deep technical knowledge with a commitment to client success. Our multilingual team works closely with accredited testing labs and government bodies to deliver results that are accurate, timely, and fully compliant.')
   ),
   'About CERINS — Who We Are',
   'CERINS is a Seoul-based global certification and inspection consulting firm with 15+ years of experience across Russia, CIS, Europe, and Southeast Asia.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (11, 11, 'en',
   'Vision', 'Our Direction',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Our Vision',  'body','To be the most trusted bridge between global markets — enabling companies to expand internationally without friction, risk, or compliance uncertainty.'),
     JSON_OBJECT('heading','Our Mission', 'body','We exist to simplify the complexity of international trade compliance. Through expert guidance, transparent processes, and reliable partnerships, we help our clients reach new markets faster and with greater confidence.'),
     JSON_OBJECT('heading','Core Values', 'body','Integrity, Expertise, and Partnership. Every decision we make is grounded in ethical practice, deep domain knowledge, and a genuine commitment to our clients'' long-term success.')
   ),
   'Vision — CERINS',
   'CERINS''s vision, mission, and core values for serving global markets.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (12, 12, 'en',
   'Business Ethics and Compliance', 'Our Standards',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Commitment to Integrity', 'body','CERINS holds itself to the highest standards of professional conduct. We operate with full transparency and comply with all applicable local and international regulations in every jurisdiction we serve.'),
     JSON_OBJECT('heading','Anti-Corruption Policy',  'body','We maintain a zero-tolerance policy toward bribery, corruption, and any form of unethical facilitation. All CERINS employees and partners are required to adhere to our Code of Conduct.'),
     JSON_OBJECT('heading','Data Protection',         'body','Client data is treated with strict confidentiality. We implement robust data governance practices to ensure that all sensitive commercial and technical information is protected at every stage of engagement.')
   ),
   'Business Ethics and Compliance — CERINS',
   'CERINS''s ethics policy, anti-corruption stance, and approach to client data protection.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (13, 13, 'en',
   'Certification and Accreditations', 'Our Credentials',
   'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Recognized Accreditations','body','CERINS works exclusively with accredited certification bodies and testing laboratories recognized by the regulatory authorities of target markets. Our partnerships ensure that every certificate we facilitate carries full legal validity.'),
     JSON_OBJECT('heading','Partner Bodies',           'body','Our network includes ISO/IEC 17065 accredited conformity assessment bodies, Rosstandart-approved organizations in Russia, and CE notified bodies in Europe, among others.'),
     JSON_OBJECT('heading','Continuous Improvement',   'body','We invest continuously in staff training, regulatory monitoring, and process auditing to ensure our services remain aligned with the latest international standards.')
   ),
   'Certification and Accreditations — CERINS',
   'CERINS''s accreditations, partner bodies, and continuous improvement practices.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (14, 14, 'en',
   'Location', 'Find Us',
   'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Head Office — Seoul, Korea',                'body','123 Teheran-ro, Gangnam-gu, Seoul 06234, Republic of Korea\nTel: +82-2-1234-5678\nEmail: info@cerins.com'),
     JSON_OBJECT('heading','Regional Office — Moscow, Russia',          'body','45 Tverskaya Street, Moscow 125009, Russia\nTel: +7-495-123-4567'),
     JSON_OBJECT('heading','Liaison Office — Ho Chi Minh City, Vietnam','body','88 Nguyen Hue Boulevard, District 1, Ho Chi Minh City, Vietnam\nTel: +84-28-1234-5678')
   ),
   'Locations — CERINS',
   'CERINS offices in Seoul, Moscow, and Ho Chi Minh City.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (20, 20, 'en',
   'Russia Certification', 'EAC & GOST-R',
   'https://images.unsplash.com/photo-1547448415-e9f5b28e570d?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',         'body','Russia requires a range of mandatory certifications for imported goods, including EAC (Eurasian Conformity) marking and GOST-R certificates. CERINS provides full support from documentation preparation to certificate issuance.'),
     JSON_OBJECT('heading','Service Scope',    'body','EAC Declaration of Conformity, EAC Certificate of Conformity, GOST-R Certification, Fire Safety Certificate, and Metrological Approval.'),
     JSON_OBJECT('heading','Process Timeline', 'body','Typical processing time ranges from 2 to 8 weeks depending on product category and testing requirements. CERINS coordinates all laboratory testing and government interactions on behalf of the client.')
   ),
   'Russia Certification (EAC, GOST-R) — CERINS',
   'EAC and GOST-R certification support for the Russian market, including documentation, testing, and certificate issuance.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (21, 21, 'en',
   'Kazakhstan Certification', 'EAC & National Standards',
   'https://images.unsplash.com/photo-1601999453144-21bc97ca8a3a?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','As a member of the Eurasian Economic Union, Kazakhstan accepts EAC-marked products. However, certain product categories require additional national approvals from Kazakh regulatory authorities.'),
     JSON_OBJECT('heading','Service Scope', 'body','EAC Certification, ST KZ National Standard Certificates, Sanitary-Epidemiological Conclusion, and Veterinary Certificates.'),
     JSON_OBJECT('heading','Our Approach',  'body','CERINS manages all in-country coordination through its local partner network in Almaty and Nur-Sultan, ensuring smooth and timely approvals.')
   ),
   'Kazakhstan Certification — CERINS',
   'EAC and ST KZ certification support for Kazakhstan, with in-country coordination in Almaty and Nur-Sultan.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (22, 22, 'en',
   'Belarus Certification', 'EAC & BY Standards',
   'https://images.unsplash.com/photo-1505159940484-eb2b9f2588e2?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','Belarus is part of the Eurasian Economic Union (EAEU), meaning EAC certification applies across the board. Belarus also maintains specific national regulatory requirements for certain sectors.'),
     JSON_OBJECT('heading','Service Scope', 'body','EAC Conformity Certificates, Belarus Hygiene Certificates, BY National Standards Certificates, and Import Registration for Controlled Goods.'),
     JSON_OBJECT('heading','Key Contacts',  'body','CERINS maintains active relationships with Belstandart (State Committee for Standardization) and accredited Belarusian testing laboratories to facilitate smooth certification.')
   ),
   'Belarus Certification — CERINS',
   'EAC and BY national certification support for Belarus, with direct relationships to Belstandart.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (23, 23, 'en',
   'Uzbekistan Certification', 'O''zstandart Approval',
   'https://images.unsplash.com/photo-1568454537842-d933259bb258?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','Uzbekistan has its own national standardization system governed by O''zstandart. Certain products require mandatory conformity assessment before market entry.'),
     JSON_OBJECT('heading','Service Scope', 'body','O''zstandart Certificate of Conformity, Hygiene & Sanitary Registration, Metrological Approval, and Import License Support.'),
     JSON_OBJECT('heading','Timeline',      'body','Processing typically takes 3–6 weeks. CERINS handles translation, sample testing coordination, and submission through its partner agency in Tashkent.')
   ),
   'Uzbekistan Certification (O''zstandart) — CERINS',
   'O''zstandart conformity, hygiene, metrological, and import-license support for Uzbekistan.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (24, 24, 'en',
   'Ukraine Certification', 'UkrSEPRO & Technical Regulations',
   'https://images.unsplash.com/photo-1517036638908-93a18147d2fb?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',       'body','Ukraine operates its own conformity assessment system (UkrSEPRO) and has adopted a set of technical regulations aligned with EU directives. Both national and EU-aligned certification may be required.'),
     JSON_OBJECT('heading','Service Scope',  'body','UkrSEPRO Certificate, Technical Regulation Compliance (TR CU aligned), State Sanitary-Hygienic Expertise, and Product Registration.'),
     JSON_OBJECT('heading','CERINS Support', 'body','Our team tracks the evolving regulatory landscape in Ukraine and ensures clients are prepared for any changes arising from ongoing EU harmonization efforts.')
   ),
   'Ukraine Certification (UkrSEPRO) — CERINS',
   'UkrSEPRO and EU-aligned technical regulation support for the Ukrainian market.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (25, 25, 'en',
   'Turkmenistan Certification', 'National Conformity Requirements',
   'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','Turkmenistan maintains its own regulatory framework separate from the EAEU. Import certification is coordinated through the Turkmenstandartlary agency.'),
     JSON_OBJECT('heading','Service Scope', 'body','Mandatory Certification of Conformity, Hygiene Certificate, and Import Permit Support for controlled categories.'),
     JSON_OBJECT('heading','Our Network',   'body','CERINS works with trusted local agents in Ashgabat to navigate the Turkmen regulatory environment efficiently.')
   ),
   'Turkmenistan Certification — CERINS',
   'Turkmenstandartlary conformity, hygiene, and import-permit support for Turkmenistan.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (26, 26, 'en',
   'Azerbaijan Certification', 'Azstandart Certification',
   'https://images.unsplash.com/photo-1566996694010-c0c7e62a5cf0?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','Azerbaijan''s national standardization body, Azstandart, oversees mandatory product certification. The country is gradually harmonizing its standards with international norms.'),
     JSON_OBJECT('heading','Service Scope', 'body','AZ Certificate of Conformity, Sanitary-Hygienic Assessment, Metrological Type Approval, and Product Registration.'),
     JSON_OBJECT('heading','Process',       'body','CERINS coordinates laboratory testing — often in Russia or Europe — and manages all documentation submission to Azstandart through its Baku representative.')
   ),
   'Azerbaijan Certification (Azstandart) — CERINS',
   'Azstandart conformity, sanitary, metrological, and product-registration support for Azerbaijan.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (27, 27, 'en',
   'Vietnam Certification', 'CR, CR-BR & Sector-Specific Approvals',
   'https://images.unsplash.com/photo-1528127269322-539801943592?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',         'body','Vietnam requires conformity registration (CR) or conformity announcement (CB) for many imported products under the Ministry of Science and Technology (MOST) and sector-specific ministries.'),
     JSON_OBJECT('heading','Service Scope',    'body','Conformity Registration (CR), Conformity Announcement (CB), Ministry of Industry and Trade approvals, and Import License Support.'),
     JSON_OBJECT('heading','CERINS Advantage', 'body','Our Ho Chi Minh City liaison office provides on-the-ground support, ensuring accurate and timely submission to Vietnamese authorities.')
   ),
   'Vietnam Certification (CR, CB) — CERINS',
   'CR and CB conformity support for Vietnam, with on-the-ground assistance from our Ho Chi Minh City office.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (28, 28, 'en',
   'Europe Certification', 'CE Marking & EU Directives',
   'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','The CE marking is mandatory for products sold in the European Economic Area (EEA). It demonstrates compliance with relevant EU directives and regulations covering safety, health, and environmental protection.'),
     JSON_OBJECT('heading','Service Scope', 'body','CE Marking Consultancy, Technical File Preparation, Declaration of Conformity, Notified Body Coordination, REACH & RoHS Compliance, and UKCA Marking (UK).'),
     JSON_OBJECT('heading','Our Process',   'body','CERINS guides clients through directive identification, risk assessment, testing at accredited EU laboratories, and technical documentation to achieve CE marking efficiently.')
   ),
   'Europe / CE Marking — CERINS',
   'CE marking, technical file preparation, REACH/RoHS, and UKCA support for the European market.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (30, 30, 'en',
   'Pre-Shipment Inspection', 'Quality Assurance Before Dispatch',
   'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',        'body','Pre-Shipment Inspection (PSI) verifies that goods conform to agreed specifications, quantity, and quality standards before they leave the exporter''s premises or port of loading.'),
     JSON_OBJECT('heading','What We Inspect', 'body','Quantity verification, visual quality check, packaging and labeling review, functionality testing, and documentation review against purchase order or letter of credit terms.'),
     JSON_OBJECT('heading','Reporting',       'body','CERINS issues a detailed inspection report within 24–48 hours of inspection completion, including photographic evidence and a clear pass/fail summary.')
   ),
   'Pre-Shipment Inspection (PSI) — CERINS',
   'Pre-shipment inspection with quantity, quality, packaging, and documentation checks before goods leave the factory.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (31, 31, 'en',
   'India VOC', 'Voluntary Overseas Certification',
   'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',            'body','India''s Voluntary Overseas Certification scheme, administered by the Bureau of Indian Standards (BIS), allows certain goods to be certified for conformity before import into India.'),
     JSON_OBJECT('heading','Applicable Products', 'body','Electronics, electrical equipment, toys, footwear, and other consumer products listed under BIS mandatory registration schemes.'),
     JSON_OBJECT('heading','CERINS Role',         'body','We coordinate factory audits, sample testing at BIS-recognized laboratories, and complete documentation submission to secure the ISI mark or BIS registration certificate.')
   ),
   'India VOC (BIS) — CERINS',
   'BIS Voluntary Overseas Certification (VOC) support for products entering India.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (32, 32, 'en',
   'NDT', 'Non-Destructive Testing',
   'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',        'body','Non-Destructive Testing (NDT) allows the inspection of materials, components, and assemblies for defects or anomalies without causing damage to the item being tested.'),
     JSON_OBJECT('heading','Methods Offered', 'body','Ultrasonic Testing (UT), Radiographic Testing (RT), Magnetic Particle Testing (MT), Liquid Penetrant Testing (PT), Visual Testing (VT), and Eddy Current Testing (ET).'),
     JSON_OBJECT('heading','Applications',    'body','Oil & gas pipelines, pressure vessels, structural steel, welds, castings, and aerospace components. CERINS deploys certified Level II and Level III NDT technicians.')
   ),
   'Non-Destructive Testing (NDT) — CERINS',
   'UT, RT, MT, PT, VT, and ET non-destructive testing by certified Level II and III technicians.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (33, 33, 'en',
   'General Inspection', 'Comprehensive Quality Control',
   'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',      'body','CERINS provides flexible general inspection services tailored to client requirements across a wide range of product categories and industrial sectors.'),
     JSON_OBJECT('heading','Service Types', 'body','During Production Inspection (DUPRO), Final Random Inspection (FRI), Container Loading Supervision (CLS), and Factory Audit.'),
     JSON_OBJECT('heading','Coverage',      'body','We operate across major manufacturing hubs in Korea, China, Vietnam, India, and Turkey, with access to a global network of qualified inspectors.')
   ),
   'General Inspection — CERINS',
   'DUPRO, FRI, CLS, and factory audits across Korea, China, Vietnam, India, and Turkey.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (34, 34, 'en',
   'Other Services', 'Specialized Trade Support',
   'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Cargo Survey', 'body','Marine and inland cargo surveys including draft surveys, quantity determination, damage assessment, and outturn reports at ports of loading and discharge.'),
     JSON_OBJECT('heading','Expediting',   'body','On-site expediting services to monitor production progress, resolve bottlenecks, and ensure on-time delivery of critical equipment and materials.'),
     JSON_OBJECT('heading','Consulting',   'body','Regulatory consulting on international trade compliance, tariff classification, country-of-origin determination, and trade agreement utilization.')
   ),
   'Other Trade Services — CERINS',
   'Cargo survey, expediting, and trade compliance consulting from CERINS.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (40, 40, 'en',
   'Documentation', 'Trade Document Preparation & Verification',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Overview',            'body','Accurate and compliant trade documentation is critical to smooth cross-border transactions. CERINS prepares, reviews, and verifies all required commercial, shipping, and regulatory documents.'),
     JSON_OBJECT('heading','Documents We Handle', 'body','Certificate of Origin, Commercial Invoice Review, Packing List, Bill of Lading Review, Phytosanitary Certificate, Health Certificate, and Legalization / Apostille.'),
     JSON_OBJECT('heading','Added Value',         'body','Our document specialists catch errors before shipment, reducing the risk of customs delays, fines, and cargo holds at the port of destination.')
   ),
   'Trade Documentation — CERINS',
   'Preparation, review, and verification of commercial, shipping, and regulatory documents for cross-border trade.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (41, 41, 'en',
   'Project Management & Custom Brokerage', 'End-to-End Trade Execution',
   'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','Project Management',   'body','For complex multi-shipment or multi-country projects, CERINS provides dedicated project management to coordinate timelines, vendors, logistics providers, and regulatory bodies.'),
     JSON_OBJECT('heading','Customs Brokerage',    'body','Our licensed customs brokers manage import and export clearance in Korea and key partner markets, ensuring accurate HS code classification, duty calculation, and timely release.'),
     JSON_OBJECT('heading','Integrated Solutions', 'body','By combining project management with customs brokerage, CERINS offers a single point of accountability for even the most complex international trade operations.')
   ),
   'Project Management & Customs Brokerage — CERINS',
   'End-to-end project management and licensed customs brokerage for cross-border trade operations.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- ── Korean ────────────────────────────────────────────────────────────
INSERT INTO page_translations (id, page_id, locale, title, subtitle, hero_image, content, meta_title, meta_description, created_at, updated_at) VALUES
  (101, 1, 'ko',
   'CERINS - 글로벌 인증 및 검사 파트너',
   '글로벌 표준. 신뢰받는 파트너.',
   NULL,
   JSON_ARRAY(),
   'CERINS - 글로벌 인증 및 검사 파트너',
   'CERINS는 글로벌 시장 진출 기업을 위해 인증, 검사, 문서화, 프로젝트 관리, 통관 중개 서비스를 제공합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (102, 2, 'ko',
   'CERINS 소개',
   '2009년부터 이어온 글로벌 인증 및 검사 파트너',
   NULL,
   JSON_ARRAY(),
   'CERINS 소개',
   'CERINS의 역사, 글로벌 네트워크, 신뢰받는 인증 및 검사 파트너로서의 강점을 소개합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (103, 3, 'ko',
   '인증',
   'CIS, 유럽, 아시아 시장별 인증 서비스',
   NULL,
   JSON_ARRAY(),
   '인증 서비스 - CERINS',
   'CERINS는 규제 시장에 진출하는 수출 기업의 필수 제품 인증을 지원합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (104, 4, 'ko',
   '검사',
   '전 세계 현장에서 제공하는 전문 검사 및 품질 보증 서비스',
   NULL,
   JSON_ARRAY(),
   '검사 서비스 - CERINS',
   '한국, 중국, 베트남, 인도, 터키의 전문 검사원이 제품 품질, 규정 적합성, 납기 준수를 지원합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (105, 5, 'ko',
   '문의하기',
   '인증 및 검사 전문가에게 문의하세요.',
   NULL,
   JSON_ARRAY(
     JSON_OBJECT('heading','본사',             'body','서울특별시 강남구 테헤란로 123\n대한민국 06234'),
     JSON_OBJECT('heading','전화',             'body','+82-2-1234-5678'),
     JSON_OBJECT('heading','이메일',           'body','info@cerins.com'),
     JSON_OBJECT('heading','운영 시간',        'body','월-금: 09:00-18:00 KST'),
     JSON_OBJECT('heading','러시아 모스크바',  'body','45 Tverskaya Street, Moscow 125009'),
     JSON_OBJECT('heading','베트남 호찌민',    'body','88 Nguyen Hue Boulevard, District 1')
   ),
   '문의 - CERINS',
   '서울, 모스크바, 호찌민의 CERINS 인증 및 검사 팀에 문의하세요.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (106, 6, 'ko',
   '뉴스룸',
   'CERINS의 최신 공지, 인사이트, 규제 업데이트를 확인하세요.',
   NULL,
   JSON_ARRAY(),
   '뉴스룸 - CERINS',
   'CERINS의 공지, 인사이트, 규제 업데이트입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (107, 7, 'ko',
   '자주 묻는 질문',
   'CERINS 인증·검사 서비스에 대해 자주 묻는 질문을 확인하세요.',
   NULL,
   JSON_ARRAY(),
   'FAQ - CERINS',
   'CERINS 인증·검사 서비스에 대해 자주 묻는 질문입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (110, 10, 'ko',
   'CERINS 소개', '회사 소개',
   'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','회사 개요',                'body','CERINS는 서울에 본사를 둔 글로벌 인증 및 검사 컨설팅 기업입니다. 제조사와 수출 기업이 국제 규제 요건을 효율적이고 안정적으로 대응할 수 있도록 지원합니다.'),
     JSON_OBJECT('heading','전문 분야',                'body','15년 이상의 실무 경험을 바탕으로 러시아, CIS, 유럽, 동남아시아 등 주요 시장에서 인증, 선적 전 검사, 문서화, 통관 중개를 포함한 엔드투엔드 솔루션을 제공합니다.'),
     JSON_OBJECT('heading','CERINS를 선택하는 이유',   'body','CERINS는 깊이 있는 기술 지식과 고객 성공에 대한 책임감을 결합합니다. 다국어 전문 인력이 공인 시험소 및 정부 기관과 긴밀히 협력하여 정확하고 신속하며 완전한 규정 준수 결과를 제공합니다.')
   ),
   'CERINS 소개 - 회사 소개',
   'CERINS는 러시아, CIS, 유럽, 동남아시아 시장에서 15년 이상의 경험을 보유한 서울 기반 글로벌 인증 및 검사 컨설팅 기업입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (111, 11, 'ko',
   '비전', 'CERINS가 나아가는 방향',
   'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','비전',      'body','CERINS는 기업이 마찰, 리스크, 규정 불확실성 없이 해외 시장으로 확장할 수 있도록 돕는 가장 신뢰받는 글로벌 시장의 연결자가 되고자 합니다.'),
     JSON_OBJECT('heading','미션',      'body','국제 무역 컴플라이언스의 복잡성을 단순하게 만드는 것이 CERINS의 역할입니다. 전문적인 안내, 투명한 프로세스, 신뢰할 수 있는 파트너십을 통해 고객의 시장 진입을 더 빠르고 확실하게 지원합니다.'),
     JSON_OBJECT('heading','핵심 가치', 'body','정직, 전문성, 파트너십. CERINS의 모든 의사결정은 윤리적 실천, 깊이 있는 전문 지식, 고객의 장기적 성공에 대한 진정성 있는 책임감에 기반합니다.')
   ),
   '비전 - CERINS',
   '글로벌 시장을 지원하는 CERINS의 비전, 미션, 핵심 가치를 소개합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (112, 12, 'ko',
   '기업 윤리 및 컴플라이언스', 'CERINS의 기준',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','정직성에 대한 약속', 'body','CERINS는 가장 높은 수준의 전문 윤리를 기준으로 삼습니다. 모든 사업 지역에서 투명하게 운영하며 현지 및 국제 규정을 준수합니다.'),
     JSON_OBJECT('heading','반부패 정책',        'body','CERINS는 뇌물, 부패, 비윤리적 편의 제공에 대해 무관용 원칙을 유지합니다. 모든 임직원과 파트너는 행동 강령을 준수해야 합니다.'),
     JSON_OBJECT('heading','데이터 보호',        'body','고객 데이터는 엄격한 기밀로 취급됩니다. CERINS는 민감한 상업 및 기술 정보가 모든 단계에서 보호되도록 견고한 데이터 거버넌스를 운영합니다.')
   ),
   '기업 윤리 및 컴플라이언스 - CERINS',
   'CERINS의 윤리 정책, 반부패 원칙, 고객 데이터 보호 방식을 소개합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (113, 13, 'ko',
   '인증 및 인정', 'CERINS의 신뢰 기반',
   'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','공인 인정',     'body','CERINS는 목표 시장의 규제 당국이 인정하는 공인 인증기관 및 시험소와 협력합니다. 이를 통해 모든 인증서가 법적 효력을 갖도록 지원합니다.'),
     JSON_OBJECT('heading','파트너 기관',   'body','CERINS의 네트워크에는 ISO/IEC 17065 공인 적합성 평가기관, 러시아 Rosstandart 승인 기관, 유럽 CE 인증기관 등이 포함됩니다.'),
     JSON_OBJECT('heading','지속적 개선',   'body','CERINS는 직원 교육, 규제 모니터링, 프로세스 감사를 지속적으로 수행하여 서비스가 최신 국제 표준에 부합하도록 관리합니다.')
   ),
   '인증 및 인정 - CERINS',
   'CERINS의 인정 현황, 파트너 기관, 지속적 개선 활동을 소개합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (114, 14, 'ko',
   '오시는 길', 'CERINS 위치 안내',
   'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','본사 - 서울, 대한민국',         'body','서울특별시 강남구 테헤란로 123, 06234\nTel: +82-2-1234-5678\nEmail: info@cerins.com'),
     JSON_OBJECT('heading','지역 사무소 - 모스크바, 러시아', 'body','45 Tverskaya Street, Moscow 125009, Russia\nTel: +7-495-123-4567'),
     JSON_OBJECT('heading','연락 사무소 - 호찌민, 베트남',   'body','88 Nguyen Hue Boulevard, District 1, Ho Chi Minh City, Vietnam\nTel: +84-28-1234-5678')
   ),
   '위치 - CERINS',
   '서울, 모스크바, 호찌민에 위치한 CERINS 사무소를 안내합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (120, 20, 'ko',
   '러시아 인증', 'EAC 및 GOST-R',
   'https://images.unsplash.com/photo-1547448415-e9f5b28e570d?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','러시아는 수입 제품에 대해 EAC 마킹, GOST-R 인증 등 다양한 필수 인증을 요구합니다. CERINS는 문서 준비부터 인증서 발급까지 전 과정을 지원합니다.'),
     JSON_OBJECT('heading','서비스 범위', 'body','EAC 적합성 선언, EAC 적합성 인증, GOST-R 인증, 화재 안전 인증, 계측 승인 등을 지원합니다.'),
     JSON_OBJECT('heading','처리 일정',   'body','제품군과 시험 요건에 따라 일반적으로 2-8주가 소요됩니다. CERINS는 시험소 테스트와 정부 기관 대응을 고객 대신 조율합니다.')
   ),
   '러시아 인증(EAC, GOST-R) - CERINS',
   '러시아 시장을 위한 EAC 및 GOST-R 인증 지원, 문서화, 시험, 인증서 발급 서비스를 제공합니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (121, 21, 'ko',
   '카자흐스탄 인증', 'EAC 및 국가 표준',
   'https://images.unsplash.com/photo-1601999453144-21bc97ca8a3a?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','카자흐스탄은 유라시아경제연합 회원국으로 EAC 마킹 제품을 인정합니다. 다만 일부 제품군은 카자흐스탄 규제 당국의 추가 국가 승인이 필요합니다.'),
     JSON_OBJECT('heading','서비스 범위', 'body','EAC 인증, ST KZ 국가 표준 인증, 위생역학 결론, 수의 인증 등을 지원합니다.'),
     JSON_OBJECT('heading','CERINS 방식', 'body','CERINS는 알마티와 아스타나의 현지 파트너 네트워크를 통해 원활하고 신속한 승인 절차를 관리합니다.')
   ),
   '카자흐스탄 인증 - CERINS',
   '알마티와 아스타나 현지 조율을 포함한 카자흐스탄 EAC 및 ST KZ 인증 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (122, 22, 'ko',
   '벨라루스 인증', 'EAC 및 BY 표준',
   'https://images.unsplash.com/photo-1505159940484-eb2b9f2588e2?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',          'body','벨라루스는 유라시아경제연합(EAEU)에 속해 EAC 인증이 적용됩니다. 일부 산업 분야에는 별도의 국가 규제 요건도 운영됩니다.'),
     JSON_OBJECT('heading','서비스 범위',   'body','EAC 적합성 인증서, 벨라루스 위생 인증, BY 국가 표준 인증, 관리 대상 제품 수입 등록을 지원합니다.'),
     JSON_OBJECT('heading','주요 네트워크', 'body','CERINS는 Belstandart와 공인 벨라루스 시험소와의 관계를 바탕으로 인증 절차를 원활하게 진행합니다.')
   ),
   '벨라루스 인증 - CERINS',
   'Belstandart 네트워크를 기반으로 한 벨라루스 EAC 및 BY 국가 인증 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (123, 23, 'ko',
   '우즈베키스탄 인증', 'O''zstandart 승인',
   'https://images.unsplash.com/photo-1568454537842-d933259bb258?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','우즈베키스탄은 O''zstandart가 관리하는 독자적인 국가 표준화 체계를 운영합니다. 특정 제품은 시장 진입 전 의무 적합성 평가가 필요합니다.'),
     JSON_OBJECT('heading','서비스 범위', 'body','O''zstandart 적합성 인증, 위생 등록, 계측 승인, 수입 허가 지원을 제공합니다.'),
     JSON_OBJECT('heading','일정',        'body','일반적으로 3-6주가 소요되며, CERINS는 번역, 샘플 시험 조율, 타슈켄트 파트너 기관 제출을 지원합니다.')
   ),
   '우즈베키스탄 인증(O''zstandart) - CERINS',
   '우즈베키스탄 O''zstandart 적합성, 위생, 계측, 수입 허가 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (124, 24, 'ko',
   '우크라이나 인증', 'UkrSEPRO 및 기술 규정',
   'https://images.unsplash.com/photo-1517036638908-93a18147d2fb?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','우크라이나는 자체 적합성 평가 제도인 UkrSEPRO를 운영하며 EU 지침에 맞춘 기술 규정을 도입하고 있습니다. 국가 인증과 EU 연계 인증이 모두 필요할 수 있습니다.'),
     JSON_OBJECT('heading','서비스 범위', 'body','UkrSEPRO 인증, 기술 규정 적합성, 국가 위생 전문 평가, 제품 등록을 지원합니다.'),
     JSON_OBJECT('heading','CERINS 지원', 'body','CERINS는 우크라이나의 변화하는 규제 환경을 추적하고 EU 조화 과정에서 필요한 대응을 준비하도록 지원합니다.')
   ),
   '우크라이나 인증(UkrSEPRO) - CERINS',
   '우크라이나 시장을 위한 UkrSEPRO 및 EU 연계 기술 규정 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (125, 25, 'ko',
   '투르크메니스탄 인증', '국가 적합성 요건',
   'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',          'body','투르크메니스탄은 EAEU와 별개의 자체 규제 체계를 운영합니다. 수입 인증은 Turkmenstandartlary 기관을 통해 진행됩니다.'),
     JSON_OBJECT('heading','서비스 범위',   'body','의무 적합성 인증, 위생 인증, 관리 대상 품목의 수입 허가 지원을 제공합니다.'),
     JSON_OBJECT('heading','현지 네트워크', 'body','CERINS는 아시가바트의 신뢰할 수 있는 현지 에이전트와 협력하여 투르크메니스탄 규제 환경을 효율적으로 대응합니다.')
   ),
   '투르크메니스탄 인증 - CERINS',
   '투르크메니스탄 Turkmenstandartlary 적합성, 위생, 수입 허가 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (126, 26, 'ko',
   '아제르바이잔 인증', 'Azstandart 인증',
   'https://images.unsplash.com/photo-1566996694010-c0c7e62a5cf0?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','아제르바이잔의 국가 표준화 기관인 Azstandart는 의무 제품 인증을 관리합니다. 아제르바이잔은 국제 기준에 맞춰 표준을 점진적으로 조화시키고 있습니다.'),
     JSON_OBJECT('heading','서비스 범위', 'body','AZ 적합성 인증, 위생 평가, 계측 형식 승인, 제품 등록을 지원합니다.'),
     JSON_OBJECT('heading','절차',        'body','CERINS는 러시아 또는 유럽 시험소 테스트를 조율하고 바쿠 대표 네트워크를 통해 Azstandart 제출 문서를 관리합니다.')
   ),
   '아제르바이잔 인증(Azstandart) - CERINS',
   '아제르바이잔 Azstandart 적합성, 위생, 계측, 제품 등록 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (127, 27, 'ko',
   '베트남 인증', 'CR, CB 및 분야별 승인',
   'https://images.unsplash.com/photo-1528127269322-539801943592?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',          'body','베트남은 과학기술부(MOST)와 분야별 부처 규정에 따라 다수의 수입 제품에 적합성 등록(CR) 또는 적합성 발표(CB)를 요구합니다.'),
     JSON_OBJECT('heading','서비스 범위',   'body','적합성 등록(CR), 적합성 발표(CB), 산업무역부 승인, 수입 허가 지원을 제공합니다.'),
     JSON_OBJECT('heading','CERINS의 강점', 'body','호찌민 연락 사무소를 통해 현지 밀착 지원을 제공하며, 베트남 당국 제출이 정확하고 신속하게 진행되도록 돕습니다.')
   ),
   '베트남 인증(CR, CB) - CERINS',
   '호찌민 현지 지원을 포함한 베트남 CR 및 CB 적합성 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (128, 28, 'ko',
   '유럽 인증', 'CE 마킹 및 EU 지침',
   'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','CE 마킹은 유럽경제지역(EEA)에서 판매되는 제품에 필수입니다. 이는 안전, 보건, 환경 보호와 관련된 EU 지침 및 규정을 준수한다는 의미입니다.'),
     JSON_OBJECT('heading','서비스 범위', 'body','CE 마킹 컨설팅, 기술 파일 준비, 적합성 선언, 인증기관 조율, REACH 및 RoHS 준수, 영국 UKCA 마킹을 지원합니다.'),
     JSON_OBJECT('heading','프로세스',    'body','CERINS는 지침 식별, 위험 평가, 공인 EU 시험소 테스트, 기술 문서 준비를 통해 CE 마킹 취득을 효율적으로 안내합니다.')
   ),
   '유럽 / CE 마킹 - CERINS',
   '유럽 시장을 위한 CE 마킹, 기술 파일 준비, REACH/RoHS, UKCA 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (130, 30, 'ko',
   '선적 전 검사', '출하 전 품질 보증',
   'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',      'body','선적 전 검사(PSI)는 제품이 수출자의 공장 또는 선적항을 떠나기 전에 합의된 사양, 수량, 품질 기준에 부합하는지 확인합니다.'),
     JSON_OBJECT('heading','검사 항목', 'body','수량 확인, 외관 품질 점검, 포장 및 라벨 검토, 기능 테스트, 구매 주문서 또는 신용장 조건에 대한 문서 검토를 수행합니다.'),
     JSON_OBJECT('heading','보고',      'body','CERINS는 검사 완료 후 24-48시간 이내에 사진 자료와 명확한 합격/불합격 요약을 포함한 상세 검사 보고서를 발행합니다.')
   ),
   '선적 전 검사(PSI) - CERINS',
   '공장 출하 전 수량, 품질, 포장, 문서 상태를 확인하는 선적 전 검사 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (131, 31, 'ko',
   '인도 VOC', '해외 자율 인증',
   'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','인도의 해외 자율 인증(VOC) 제도는 인도표준국(BIS)이 관리하며, 일부 제품이 인도 수입 전 적합성을 인증받을 수 있도록 합니다.'),
     JSON_OBJECT('heading','대상 제품',   'body','BIS 의무 등록 제도에 포함된 전자제품, 전기 장비, 장난감, 신발류 및 기타 소비재가 해당됩니다.'),
     JSON_OBJECT('heading','CERINS 역할', 'body','CERINS는 공장 심사, BIS 인정 시험소 샘플 테스트, 문서 제출을 조율하여 ISI 마크 또는 BIS 등록 인증서 취득을 지원합니다.')
   ),
   '인도 VOC(BIS) - CERINS',
   '인도 시장 진입 제품을 위한 BIS 해외 자율 인증(VOC) 지원 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (132, 32, 'ko',
   '비파괴 검사', 'NDT 서비스',
   'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',      'body','비파괴 검사(NDT)는 검사 대상에 손상을 주지 않고 재료, 부품, 조립품의 결함 또는 이상 여부를 확인하는 검사 방식입니다.'),
     JSON_OBJECT('heading','제공 방법', 'body','초음파 검사(UT), 방사선 검사(RT), 자분 탐상(MT), 침투 탐상(PT), 육안 검사(VT), 와전류 검사(ET)를 제공합니다.'),
     JSON_OBJECT('heading','적용 분야', 'body','오일 및 가스 파이프라인, 압력 용기, 구조용 강재, 용접부, 주조품, 항공우주 부품 등에 적용됩니다. CERINS는 Level II 및 Level III 인증 기술자를 배치합니다.')
   ),
   '비파괴 검사(NDT) - CERINS',
   'Level II 및 Level III 인증 기술자가 수행하는 UT, RT, MT, PT, VT, ET 비파괴 검사 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (133, 33, 'ko',
   '일반 검사', '종합 품질 관리',
   'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',        'body','CERINS는 다양한 제품군과 산업 분야에서 고객 요구사항에 맞춘 유연한 일반 검사 서비스를 제공합니다.'),
     JSON_OBJECT('heading','서비스 유형', 'body','생산 중 검사(DUPRO), 최종 무작위 검사(FRI), 컨테이너 적재 감독(CLS), 공장 심사를 제공합니다.'),
     JSON_OBJECT('heading','서비스 지역', 'body','한국, 중국, 베트남, 인도, 터키의 주요 제조 거점에서 활동하며, 글로벌 전문 검사원 네트워크를 활용합니다.')
   ),
   '일반 검사 - CERINS',
   '한국, 중국, 베트남, 인도, 터키에서 제공하는 DUPRO, FRI, CLS, 공장 심사 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (134, 34, 'ko',
   '기타 서비스', '전문 무역 지원',
   'https://images.unsplash.com/photo-1494412519320-aa613dfb7738?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','화물 검사',     'body','선적항과 양하항에서 흘수 검사, 수량 확인, 손상 평가, 양하 보고 등 해상 및 내륙 화물 검사를 수행합니다.'),
     JSON_OBJECT('heading','익스페다이팅', 'body','생산 진행 상황을 현장에서 확인하고 병목을 해결하며 핵심 장비와 자재가 제때 납품되도록 지원합니다.'),
     JSON_OBJECT('heading','컨설팅',       'body','국제 무역 컴플라이언스, 관세 분류, 원산지 판정, 무역 협정 활용에 대한 규제 컨설팅을 제공합니다.')
   ),
   '기타 무역 서비스 - CERINS',
   'CERINS가 제공하는 화물 검사, 익스페다이팅, 무역 컴플라이언스 컨설팅 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (140, 40, 'ko',
   '문서화', '무역 문서 준비 및 검토',
   'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','개요',      'body','정확하고 규정에 맞는 무역 문서는 원활한 국경 간 거래의 핵심입니다. CERINS는 상업, 선적, 규제 관련 필수 문서를 준비, 검토, 확인합니다.'),
     JSON_OBJECT('heading','취급 문서', 'body','원산지 증명서, 상업 송장 검토, 포장 명세서, 선하증권 검토, 식물위생증명서, 보건증명서, 공증 및 아포스티유를 지원합니다.'),
     JSON_OBJECT('heading','부가 가치', 'body','CERINS의 문서 전문가는 선적 전 오류를 발견하여 목적항 통관 지연, 벌금, 화물 보류 리스크를 줄입니다.')
   ),
   '무역 문서화 - CERINS',
   '국경 간 무역을 위한 상업, 선적, 규제 문서의 준비, 검토, 확인 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (141, 41, 'ko',
   '프로젝트 관리 및 통관 중개', '엔드투엔드 무역 실행',
   'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80&auto=format&fit=crop',
   JSON_ARRAY(
     JSON_OBJECT('heading','프로젝트 관리', 'body','복수 선적 또는 다국가 프로젝트의 경우 CERINS는 일정, 공급사, 물류사, 규제 기관을 조율하는 전담 프로젝트 관리를 제공합니다.'),
     JSON_OBJECT('heading','통관 중개',     'body','CERINS의 통관 네트워크는 한국 및 주요 파트너 시장에서 수입·수출 통관, HS 코드 분류, 관세 산정, 신속한 반출을 지원합니다.'),
     JSON_OBJECT('heading','통합 솔루션',   'body','프로젝트 관리와 통관 중개를 결합하여 복잡한 국제 무역 업무에도 단일 책임 창구를 제공합니다.')
   ),
   '프로젝트 관리 및 통관 중개 - CERINS',
   '국경 간 무역 운영을 위한 엔드투엔드 프로젝트 관리 및 통관 중개 서비스입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- 인증서 하위 상세 페이지 번역 (ko)
INSERT INTO page_translations (id, page_id, locale, title, subtitle, content, meta_title, meta_description) VALUES
  (200, 100, 'ko', 'TRCU', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '유라시아경제연합(EAEU) 관세동맹 기술규정(TR CU) 적합성 인증입니다. 하나의 인증으로 EAEU 회원국 전체 시장에 통용됩니다.')),
   'TRCU - CERINS', '러시아 TR CU 적합성 인증 서비스'),
  (201, 101, 'ko', 'TRCU ex', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '폭발 위험 환경에서 사용되는 방폭 설비에 대한 TR CU Ex 적합성 인증입니다.')),
   'TRCU ex - CERINS', '러시아 TR CU Ex 방폭 인증 서비스'),
  (202, 102, 'ko', 'GOST R', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '러시아 국가 표준(GOST R) 적합성 인증으로, 러시아 내수 시장 판매에 필요한 대표적인 인증입니다.')),
   'GOST R - CERINS', '러시아 GOST R 인증 서비스'),
  (203, 103, 'ko', 'ISE', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '러시아 수출 제품에 요구되는 ISE 인증입니다.')),
   'ISE - CERINS', '러시아 ISE 인증 서비스'),
  (204, 104, 'ko', '화재안전', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '화재 안전 기술규정에 따른 화재안전 인증서입니다. 건축자재, 케이블 등 화재 위험 제품군에 요구됩니다.')),
   '화재안전 - CERINS', '러시아 화재안전 인증 서비스'),
  (205, 105, 'ko', '계층기기', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '계층기기 관련 인증으로, 해당 설비의 러시아 시장 진입에 필요합니다.')),
   '계층기기 - CERINS', '러시아 계층기기 인증 서비스'),
  (206, 106, 'ko', 'RTN', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '러시아 기술감독국(RTN, Rostechnadzor) 사용허가로, 위험 산업시설에서 사용되는 설비에 필요합니다.')),
   'RTN - CERINS', '러시아 RTN 사용허가 서비스'),
  (207, 107, 'ko', '국가위생등록', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '소비자 건강·위생과 관련된 제품에 요구되는 국가위생등록입니다.')),
   '국가위생등록 - CERINS', '러시아 국가위생등록 서비스'),
  (208, 108, 'ko', '의료기기등록', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '러시아 보건당국 의료기기 등록으로, 의료기기 판매에 필수입니다.')),
   '의료기기등록 - CERINS', '러시아 의료기기등록 서비스'),
  (209, 109, 'ko', '기타인증서', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '위 항목 외에 제품별로 요구되는 기타 인증서 취득을 지원합니다.')),
   '기타인증서 - CERINS', '러시아 기타 인증 서비스'),

  (210, 110, 'ko', 'TRCU', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '유라시아경제연합(EAEU) 관세동맹 기술규정(TR CU) 적합성 인증입니다. 하나의 인증으로 EAEU 회원국 전체 시장에 통용됩니다.')),
   'TRCU - CERINS', '카자흐스탄 TR CU 적합성 인증 서비스'),
  (211, 111, 'ko', 'TRCU ex', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '폭발 위험 환경에서 사용되는 방폭 설비에 대한 TR CU Ex 적합성 인증입니다.')),
   'TRCU ex - CERINS', '카자흐스탄 TR CU Ex 방폭 인증 서비스'),
  (212, 112, 'ko', 'GOST K', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '카자흐스탄 국가 표준(GOST K) 적합성 인증입니다.')),
   'GOST K - CERINS', '카자흐스탄 GOST K 인증 서비스'),
  (213, 113, 'ko', 'ISE K', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '카자흐스탄 수출 제품에 요구되는 ISE K 인증입니다.')),
   'ISE K - CERINS', '카자흐스탄 ISE K 인증 서비스'),
  (214, 114, 'ko', '화재안전 K', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '카자흐스탄 화재안전 기술규정에 따른 화재안전 인증서입니다.')),
   '화재안전 K - CERINS', '카자흐스탄 화재안전 인증 서비스'),
  (215, 115, 'ko', '계층기기 K', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '카자흐스탄 계층기기 관련 인증입니다.')),
   '계층기기 K - CERINS', '카자흐스탄 계층기기 인증 서비스'),
  (216, 116, 'ko', 'GGTN 사용허가', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '카자흐스탄 산업안전감독국(GGTN) 사용허가로, 산업 설비 사용에 필요합니다.')),
   'GGTN 사용허가 - CERINS', '카자흐스탄 GGTN 사용허가 서비스'),

  (217, 117, 'ko', 'TRCU', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '유라시아경제연합(EAEU) 관세동맹 기술규정(TR CU) 적합성 인증입니다. 벨라루스, 키르기스스탄, 아르메니아 시장에 통용됩니다.')),
   'TRCU - CERINS', '벨라루스·키르기스스탄·아르메니아 TR CU 인증 서비스'),
  (218, 118, 'ko', 'TRCU ex', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '폭발 위험 환경에서 사용되는 방폭 설비에 대한 TR CU Ex 적합성 인증입니다.')),
   'TRCU ex - CERINS', '벨라루스·키르기스스탄·아르메니아 TR CU Ex 인증 서비스'),

  (219, 119, 'ko', 'GUST UZ', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '우즈베키스탄 국가 표준(GUST UZ) 적합성 인증으로, 우즈베키스탄 수출에 필요합니다.')),
   'GUST UZ - CERINS', '우즈베키스탄 GUST UZ 인증 서비스'),

  (220, 120, 'ko', 'Ukr SEPRO', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '우크라이나 국가 인증 제도(UkrSEPRO)에 따른 적합성 인증입니다.')),
   'Ukr SEPRO - CERINS', '우크라이나 UkrSEPRO 인증 서비스'),

  (221, 121, 'ko', 'TDS', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '투르크메니스탄 수출에 필요한 TDS 인증입니다.')),
   'TDS - CERINS', '투르크메니스탄 TDS 인증 서비스'),

  (222, 122, 'ko', 'Azerbaijan Certification', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '아제르바이잔 국가 표준에 따른 적합성 인증으로, 아제르바이잔 수출에 필요합니다.')),
   'Azerbaijan Certification - CERINS', '아제르바이잔 인증 서비스'),

  (223, 123, 'ko', '베트남 CR 적합성마크', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', '베트남 기술규정 적합성을 나타내는 CR 마크 인증으로, 베트남 시장 판매에 필요합니다.')),
   '베트남 CR 적합성마크 - CERINS', '베트남 CR 적합성마크 인증 서비스'),

  (224, 124, 'ko', 'CE Mark', NULL,
   JSON_ARRAY(JSON_OBJECT('heading', '개요', 'body', 'EU 시장 진입에 필요한 CE 마킹으로, 유럽 지침·규정에 대한 제품 적합성을 나타냅니다.')),
   'CE Mark - CERINS', '유럽 CE 마킹 인증 서비스');

-- ---------------------------------------------------------------------
-- 4. menus
-- ---------------------------------------------------------------------
CREATE TABLE menus (
  id             INT          NOT NULL PRIMARY KEY,
  parent_id      INT          NULL,
  page_id        INT          NULL,
  url            VARCHAR(512) NULL,
  mega_image_url VARCHAR(512) NULL,
  sort_order     INT          NOT NULL DEFAULT 0,
  is_visible     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_menus_parent (parent_id),
  INDEX idx_menus_page   (page_id),
  CONSTRAINT fk_menus_parent FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE,
  CONSTRAINT fk_menus_page   FOREIGN KEY (page_id)   REFERENCES pages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO menus (id, parent_id, page_id, url, mega_image_url, sort_order, is_visible, created_at, updated_at) VALUES
  (100, NULL, 2, NULL, 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=80&auto=format&fit=crop', 10, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (200, NULL, 3, NULL, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&auto=format&fit=crop', 20, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (300, NULL, 4, NULL, 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=1400&q=80&auto=format&fit=crop', 30, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  -- '문의' 탭 → 서비스 의뢰(/requests). 문의 폼(/contact)은 FAQ 목록에서 진입.
  (400, NULL, NULL, '/requests', NULL, 40, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (500, NULL, 6, NULL, NULL, 50, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (600, NULL, 7, NULL, NULL, 60, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (110, 100, 10, NULL, NULL, 11, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (111, 100, 11, NULL, NULL, 12, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (112, 100, 12, NULL, NULL, 13, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (113, 100, 13, NULL, NULL, 14, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (114, 100, 14, NULL, NULL, 15, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (210, 200, 20, NULL, NULL, 21, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (211, 200, 21, NULL, NULL, 22, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (212, 200, 22, NULL, NULL, 23, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (213, 200, 23, NULL, NULL, 24, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (214, 200, 24, NULL, NULL, 25, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (215, 200, 25, NULL, NULL, 26, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (216, 200, 26, NULL, NULL, 27, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (217, 200, 27, NULL, NULL, 28, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (218, 200, 28, NULL, NULL, 29, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (310, 300, 30, NULL, NULL, 31, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (311, 300, 31, NULL, NULL, 32, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (312, 300, 32, NULL, NULL, 33, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (313, 300, 33, NULL, NULL, 34, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (314, 300, 34, NULL, NULL, 35, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- ---------------------------------------------------------------------
-- 5. menu_translations
-- ---------------------------------------------------------------------
CREATE TABLE menu_translations (
  id         INT          NOT NULL PRIMARY KEY,
  menu_id    INT          NOT NULL,
  locale     VARCHAR(8)   NOT NULL,
  label      VARCHAR(128) NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_menu_locale (menu_id, locale),
  CONSTRAINT fk_mt_menu   FOREIGN KEY (menu_id) REFERENCES menus(id)    ON DELETE CASCADE,
  CONSTRAINT fk_mt_locale FOREIGN KEY (locale)  REFERENCES locales(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO menu_translations (id, menu_id, locale, label, created_at, updated_at) VALUES
  ( 1, 100, 'en', 'About',         '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  ( 2, 200, 'en', 'Certification', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  ( 3, 300, 'en', 'Inspection',    '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  ( 4, 400, 'en', 'Contact',       '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  ( 5, 500, 'en', 'News',          '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  ( 6, 600, 'en', 'FAQ',           '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (10, 110, 'en', 'About CERINS',                       '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (11, 111, 'en', 'Vision',                             '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (12, 112, 'en', 'Business Ethics and Compliance',     '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (13, 113, 'en', 'Certification and Accreditations',   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (14, 114, 'en', 'Location',                           '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (20, 210, 'en', 'Russia',       '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (21, 211, 'en', 'Kazakhstan',   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (22, 212, 'en', 'Belarus',      '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (23, 213, 'en', 'Uzbekistan',   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (24, 214, 'en', 'Ukraine',      '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (25, 215, 'en', 'Turkmenistan', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (26, 216, 'en', 'Azerbaijan',   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (27, 217, 'en', 'Vietnam',      '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (28, 218, 'en', 'Europe',       '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (30, 310, 'en', 'Pre-Shipment Inspection', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (31, 311, 'en', 'India VOC',               '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (32, 312, 'en', 'NDT',                     '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (33, 313, 'en', 'General Inspection',      '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (34, 314, 'en', 'Other Services',          '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (101, 100, 'ko', '소개', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (102, 200, 'ko', '인증', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (103, 300, 'ko', '검사', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (104, 400, 'ko', '문의', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (105, 500, 'ko', '뉴스', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (106, 600, 'ko', 'FAQ', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (110, 110, 'ko', 'CERINS 소개',              '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (111, 111, 'ko', '비전',                     '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (112, 112, 'ko', '기업 윤리 및 컴플라이언스', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (113, 113, 'ko', '인증 및 인정',             '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (114, 114, 'ko', '오시는 길',                '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (120, 210, 'ko', '러시아',         '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (121, 211, 'ko', '카자흐스탄',     '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (122, 212, 'ko', '벨라루스',       '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (123, 213, 'ko', '우즈베키스탄',   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (124, 214, 'ko', '우크라이나',     '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (125, 215, 'ko', '투르크메니스탄', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (126, 216, 'ko', '아제르바이잔',   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (127, 217, 'ko', '베트남',         '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (128, 218, 'ko', '유럽',           '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (130, 310, 'ko', '선적 전 검사', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (131, 311, 'ko', '인도 VOC',     '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (132, 312, 'ko', '비파괴 검사',  '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (133, 313, 'ko', '일반 검사',    '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (134, 314, 'ko', '기타 서비스',  '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- ---------------------------------------------------------------------
-- 6. posts (게시판 글)
--   slug 은 (board_code, locale) 안에서 고유. 작성자 표시는 author 컬럼으로 통합.
-- ---------------------------------------------------------------------
CREATE TABLE posts (
  id           INT          NOT NULL PRIMARY KEY,
  board_code   VARCHAR(32)  NOT NULL,
  locale       VARCHAR(8)   NOT NULL,
  slug         VARCHAR(128) NOT NULL,
  title        VARCHAR(255) NOT NULL,
  summary      TEXT         NOT NULL,
  content      MEDIUMTEXT   NOT NULL,
  thumbnail    VARCHAR(512) NULL,
  author       VARCHAR(128) NULL,
  is_published TINYINT(1)   NOT NULL DEFAULT 1,
  is_popup     TINYINT(1)   NOT NULL DEFAULT 0,
  popup_type   TINYINT      NOT NULL DEFAULT 1,
  popup_start  DATE         NULL,
  popup_end    DATE         NULL,
  published_at DATE         NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_board_locale_slug (board_code, locale, slug),
  INDEX idx_posts_published (board_code, locale, is_published, published_at),
  CONSTRAINT fk_posts_locale FOREIGN KEY (locale) REFERENCES locales(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO posts (id, board_code, locale, slug, title, summary, content, author, is_published, published_at, created_at, updated_at) VALUES
  (1, 'news', 'en', '1',
   'CERINS Expands Certification Services to Vietnam Market',
   'CERINS has officially expanded its certification consulting services to Vietnam, offering full support for conformity registration and sector-specific approvals.',
   'CERINS is pleased to announce the expansion of its certification consulting services to the Vietnamese market. With a newly established liaison office in Ho Chi Minh City, our team is now positioned to provide on-the-ground support for companies seeking conformity registration (CR) and conformity announcement (CB) approvals under Vietnamese regulatory requirements. This development reinforces CERINS''s commitment to serving as a comprehensive gateway for clients entering Southeast Asian markets.',
   'CERINS Editorial', 1, '2026-06-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (2, 'news', 'en', '2',
   'New EAC Technical Regulations Effective from July 2026',
   'Updated Eurasian Economic Union technical regulations will take effect in July 2026. CERINS advises clients to review their current certifications for compliance.',
   'The Eurasian Economic Commission has published updated technical regulations covering electrical equipment, machinery, and personal protective equipment, which will become mandatory from July 1, 2026. Companies holding existing EAC certificates should work with CERINS to assess whether their documentation remains valid under the new requirements. Our regulatory affairs team is available to conduct a compliance gap analysis and guide clients through any necessary recertification steps.',
   'CERINS Editorial', 1, '2026-05-20', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (3, 'news', 'en', '3',
   'CERINS Achieves ISO 9001:2015 Recertification',
   'CERINS has successfully completed its triennial ISO 9001:2015 recertification audit, reaffirming its commitment to quality management.',
   'We are pleased to announce that CERINS has successfully passed its ISO 9001:2015 surveillance and recertification audit conducted by Bureau Veritas. The audit assessed our quality management system across all core service lines including certification consulting, inspection, documentation, and project management. The recertification reflects our ongoing dedication to delivering consistent, high-quality services to our global client base.',
   'CERINS Editorial', 1, '2026-05-05', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (4, 'news', 'en', '4',
   'Understanding CE Marking Requirements for 2026',
   'A comprehensive guide to CE marking obligations for exporters targeting the European Economic Area, including recent regulatory updates.',
   'The CE marking remains one of the most critical compliance requirements for any company wishing to sell products in the European Economic Area. In 2026, several EU directives have been updated, including the Low Voltage Directive (LVD) and the Electromagnetic Compatibility (EMC) Directive. This article provides an overview of the CE marking process, the role of notified bodies, and the key changes manufacturers must be aware of when preparing their technical documentation.',
   'James Park', 1, '2026-04-18', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (5, 'news', 'en', '5',
   'CERINS Hosts Webinar on Russia EAC Certification Process',
   'CERINS hosted a live webinar covering the step-by-step process for obtaining EAC certification for export to Russia, with Q&A from industry experts.',
   'Over 120 trade compliance professionals joined CERINS''s recent online webinar dedicated to the EAC certification process for the Russian market. Topics covered included the differences between EAC Certificates and Declarations of Conformity, laboratory testing requirements, and documentation preparation. Recording and presentation slides are now available for registered participants on the CERINS client portal.',
   'CERINS Editorial', 1, '2026-04-02', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (6, 'news', 'en', '6',
   'Global Shipping Disruptions: How CERINS Supports Clients',
   'Ongoing logistical challenges in global shipping are affecting certification and inspection timelines. CERINS outlines its contingency approach.',
   'Disruptions to global shipping routes continue to impact delivery timelines and, in turn, certification and inspection scheduling. CERINS has implemented contingency measures including expanded digital document processing, alternative laboratory routing, and dedicated account management for clients facing time-sensitive shipments. We encourage all clients to contact their CERINS representative well in advance of anticipated shipping dates to allow sufficient lead time.',
   'Sarah Kim', 1, '2026-03-15', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (7, 'news', 'en', '7',
   'Kazakhstan Introduces New Import Registration Requirements',
   'Kazakhstan''s Committee for Technical Regulation has introduced updated import registration requirements for electronics and household appliances.',
   'Kazakhstan''s regulatory authority has issued new mandatory registration requirements for electronics and household appliances effective from the second quarter of 2026. Importers must now submit updated test reports and technical specifications conforming to revised national standards. CERINS''s Kazakhstan team is actively supporting clients through the transition and can conduct a full review of current registration status upon request.',
   'CERINS Editorial', 1, '2026-03-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (8, 'news', 'en', '8',
   'CERINS Partners with New Accredited Laboratory in Germany',
   'A new partnership with a DAkkS-accredited laboratory in Frankfurt strengthens CERINS''s European testing capabilities.',
   'CERINS has formalized a partnership with a DAkkS-accredited testing laboratory in Frankfurt, Germany. This collaboration enhances our capacity to conduct product testing for CE marking and other European regulatory requirements with shorter lead times and competitive pricing. Clients targeting the European market can now benefit from CERINS-coordinated testing without the logistical complexity of managing laboratory relationships independently.',
   'CERINS Editorial', 1, '2026-02-14', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (9, 'news', 'en', '9',
   'Pre-Shipment Inspection Best Practices for Asian Manufacturers',
   'A practical guide to maximizing the value of pre-shipment inspections for manufacturers in Korea, China, and Vietnam.',
   'Pre-shipment inspection is one of the most effective tools available to importers for managing product quality risk. This guide outlines best practices for setting inspection criteria, selecting sampling plans aligned with AQL standards, and interpreting inspection reports. CERINS inspectors emphasize the importance of clearly defined acceptance criteria agreed upon before production begins, as this significantly reduces the likelihood of disputes during final inspection.',
   'David Lee', 1, '2026-02-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (10, 'news', 'en', '10',
   'CERINS at Korea International Trade Association Annual Forum',
   'CERINS representatives participated in the KITA Annual Trade Forum, sharing insights on regulatory trends across CIS and Southeast Asian markets.',
   'CERINS was represented at the Korea International Trade Association''s Annual Trade Forum, where our senior consultants delivered a panel presentation on evolving certification requirements in the CIS region and Southeast Asia. The session attracted significant interest from Korean exporters seeking to better understand the regulatory landscape in target markets. We thank KITA for the opportunity and look forward to continued collaboration.',
   'CERINS Editorial', 1, '2026-01-20', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (11, 'news', 'en', '11',
   'NDT Services Now Available for Offshore Projects',
   'CERINS has extended its NDT capabilities to support offshore oil and gas projects, with certified inspectors available for deployment globally.',
   'CERINS is pleased to announce the extension of its Non-Destructive Testing services to offshore oil and gas projects. Our team of certified NDT Level II and Level III inspectors is now available for deployment to offshore platforms and marine structures globally. Services include ultrasonic weld inspection, corrosion mapping, and structural integrity assessment, all conducted in compliance with international standards such as AWS D1.1 and ASME Section V.',
   'CERINS Editorial', 1, '2026-01-05', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (12, 'news', 'en', '12',
   '2025 Annual Review: CERINS Milestones and Highlights',
   'A look back at CERINS''s key achievements in 2025, including new markets entered, certificates issued, and partnerships formed.',
   'As 2025 draws to a close, CERINS reflects on a year of significant growth and achievement. Highlights include the successful entry into the Vietnamese market, a 35% increase in EAC certification volume for Russian and CIS markets, and the launch of our expanded NDT service line. We thank our clients and partners for their continued trust and look forward to building on these foundations in 2026.',
   'CERINS Editorial', 1, '2025-12-31', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (101, 'news', 'ko', '1',
   'CERINS, 베트남 시장으로 인증 서비스 확대',
   'CERINS가 베트남 인증 컨설팅 서비스를 공식 확대하고 적합성 등록 및 분야별 승인 절차를 종합 지원합니다.',
   'CERINS는 베트남 시장을 대상으로 인증 컨설팅 서비스를 확대하게 되었음을 알려드립니다. 호찌민시에 새 연락 사무소를 마련함에 따라, 베트남 규정에 따른 적합성 등록(CR) 및 적합성 발표(CB) 승인을 준비하는 기업에 현지 밀착 지원을 제공할 수 있게 되었습니다. 이번 확장은 동남아 시장 진출 고객을 위한 종합 관문 역할을 강화하려는 CERINS의 의지를 보여줍니다.',
   'CERINS 편집팀', 1, '2026-06-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (102, 'news', 'ko', '2',
   '2026년 7월부터 신규 EAC 기술 규정 시행',
   '유라시아경제연합의 개정 기술 규정이 2026년 7월부터 시행됩니다. CERINS는 기존 인증의 적합성을 사전 검토할 것을 권장합니다.',
   '유라시아경제위원회는 전기 장비, 기계류, 개인 보호 장비를 포함한 분야의 개정 기술 규정을 발표했으며, 해당 규정은 2026년 7월 1일부터 의무 적용됩니다. 기존 EAC 인증서를 보유한 기업은 문서가 새 요구사항에서도 유효한지 CERINS와 함께 확인할 필요가 있습니다. 당사의 규제 대응 팀은 적합성 갭 분석과 필요한 재인증 절차를 지원합니다.',
   'CERINS 편집팀', 1, '2026-05-20', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (103, 'news', 'ko', '3',
   'CERINS, ISO 9001:2015 재인증 획득',
   'CERINS가 3년 주기 ISO 9001:2015 재인증 심사를 성공적으로 완료하며 품질경영에 대한 의지를 재확인했습니다.',
   'CERINS는 Bureau Veritas가 수행한 ISO 9001:2015 사후 및 재인증 심사를 성공적으로 통과했습니다. 이번 심사는 인증 컨설팅, 검사, 문서화, 프로젝트 관리 등 핵심 서비스 전반의 품질경영시스템을 평가했습니다. 재인증 획득은 글로벌 고객에게 일관되고 높은 품질의 서비스를 제공하기 위한 CERINS의 지속적인 노력을 보여줍니다.',
   'CERINS 편집팀', 1, '2026-05-05', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (104, 'news', 'ko', '4',
   '2026년 CE 마킹 요구사항 이해하기',
   '유럽경제지역 수출 기업을 위한 CE 마킹 의무와 최근 규정 변경 사항을 정리한 안내입니다.',
   'CE 마킹은 유럽경제지역에서 제품을 판매하려는 기업에 가장 중요한 적합성 요건 중 하나입니다. 2026년에는 저전압 지침(LVD), 전자파 적합성 지침(EMC) 등 여러 EU 지침이 업데이트되었습니다. 이 글에서는 CE 마킹 절차, 인증기관의 역할, 기술 문서 준비 시 제조사가 알아야 할 주요 변경 사항을 소개합니다.',
   'James Park', 1, '2026-04-18', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (105, 'news', 'ko', '5',
   'CERINS, 러시아 EAC 인증 절차 웨비나 개최',
   'CERINS가 러시아 수출을 위한 EAC 인증 취득 절차를 단계별로 설명하는 라이브 웨비나를 개최했습니다.',
   '120명 이상의 무역 컴플라이언스 담당자가 러시아 시장 EAC 인증 절차를 다룬 CERINS 온라인 웨비나에 참여했습니다. EAC 인증서와 적합성 선언의 차이, 시험소 테스트 요구사항, 문서 준비 방법 등이 주요 주제로 다뤄졌습니다. 녹화본과 발표 자료는 CERINS 고객 포털에서 등록 참가자에게 제공됩니다.',
   'CERINS 편집팀', 1, '2026-04-02', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (106, 'news', 'ko', '6',
   '글로벌 물류 지연 속 CERINS의 고객 지원 방식',
   '국제 물류의 지속적인 어려움이 인증 및 검사 일정에 영향을 주고 있습니다. CERINS는 이에 대한 대응 방안을 안내합니다.',
   '글로벌 운송 경로의 지연은 납기뿐 아니라 인증 및 검사 일정에도 영향을 미치고 있습니다. CERINS는 디지털 문서 처리 확대, 대체 시험소 경로 확보, 긴급 선적 고객을 위한 전담 계정 관리 등 대응 체계를 운영하고 있습니다. 모든 고객께서는 충분한 리드타임을 확보할 수 있도록 예상 선적일보다 앞서 담당자에게 문의하시기 바랍니다.',
   'Sarah Kim', 1, '2026-03-15', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (107, 'news', 'ko', '7',
   '카자흐스탄, 신규 수입 등록 요건 도입',
   '카자흐스탄 기술규제위원회가 전자제품 및 생활가전에 대한 새로운 수입 등록 요건을 도입했습니다.',
   '카자흐스탄 규제 당국은 2026년 2분기부터 전자제품 및 생활가전에 적용되는 신규 의무 등록 요건을 발표했습니다. 수입자는 개정 국가 표준에 부합하는 시험 성적서와 기술 사양을 제출해야 합니다. CERINS 카자흐스탄 팀은 전환 과정에서 고객을 적극 지원하고 있으며, 요청 시 현재 등록 상태에 대한 종합 검토를 제공합니다.',
   'CERINS 편집팀', 1, '2026-03-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (108, 'news', 'ko', '8',
   'CERINS, 독일 신규 공인 시험소와 파트너십 체결',
   '프랑크푸르트의 DAkkS 공인 시험소와의 신규 파트너십으로 CERINS의 유럽 시험 역량이 강화되었습니다.',
   'CERINS는 독일 프랑크푸르트에 위치한 DAkkS 공인 시험소와 공식 파트너십을 체결했습니다. 이번 협력으로 CE 마킹 및 유럽 규제 요구사항에 필요한 제품 시험을 더 짧은 리드타임과 경쟁력 있는 비용으로 진행할 수 있게 되었습니다. 유럽 시장을 목표로 하는 고객은 복잡한 시험소 관리 부담 없이 CERINS가 조율하는 시험 서비스를 이용할 수 있습니다.',
   'CERINS 편집팀', 1, '2026-02-14', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (109, 'news', 'ko', '9',
   '아시아 제조사를 위한 선적 전 검사 모범 사례',
   '한국, 중국, 베트남 제조사가 선적 전 검사의 가치를 높이기 위해 참고할 수 있는 실무 가이드입니다.',
   '선적 전 검사는 수입자가 제품 품질 리스크를 관리하는 데 가장 효과적인 수단 중 하나입니다. 이 글은 검사 기준 설정, AQL 표준에 맞춘 샘플링 계획 선택, 검사 보고서 해석 방법을 설명합니다. CERINS 검사원은 생산 전 명확한 합격 기준을 합의하는 것이 최종 검사 단계의 분쟁 가능성을 크게 줄인다고 강조합니다.',
   'David Lee', 1, '2026-02-01', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (110, 'news', 'ko', '10',
   'CERINS, 한국무역협회 연례 포럼 참가',
   'CERINS 임직원이 KITA 연례 무역 포럼에 참가해 CIS 및 동남아 시장의 규제 동향을 공유했습니다.',
   'CERINS는 한국무역협회 연례 무역 포럼에 참가했으며, 수석 컨설턴트들이 CIS 지역과 동남아시아의 변화하는 인증 요건을 주제로 패널 발표를 진행했습니다. 세션은 목표 시장의 규제 환경을 더 깊이 이해하려는 한국 수출 기업들의 높은 관심을 받았습니다. CERINS는 KITA에 감사드리며 앞으로도 지속적인 협력을 기대합니다.',
   'CERINS 편집팀', 1, '2026-01-20', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (111, 'news', 'ko', '11',
   '해양 프로젝트 대상 NDT 서비스 제공 시작',
   'CERINS가 해양 오일 및 가스 프로젝트 지원을 위해 NDT 역량을 확대하고, 인증 검사원을 전 세계 현장에 배치합니다.',
   'CERINS는 비파괴 검사(NDT) 서비스를 해양 오일 및 가스 프로젝트까지 확대합니다. NDT Level II 및 Level III 자격을 갖춘 검사원이 전 세계 해양 플랫폼과 해양 구조물 현장에 투입될 수 있습니다. 서비스에는 초음파 용접 검사, 부식 매핑, 구조 건전성 평가가 포함되며, AWS D1.1 및 ASME Section V 등 국제 표준에 따라 수행됩니다.',
   'CERINS 편집팀', 1, '2026-01-05', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),

  (112, 'news', 'ko', '12',
   '2025 연간 리뷰: CERINS의 주요 성과',
   '신규 시장 진출, 인증서 발급, 파트너십 체결 등 CERINS의 2025년 주요 성과를 돌아봅니다.',
   '2025년을 마무리하며 CERINS는 의미 있는 성장과 성과를 되돌아봅니다. 주요 성과로는 베트남 시장 진출, 러시아 및 CIS 시장 대상 EAC 인증 물량 35% 증가, NDT 서비스 라인 확대가 있습니다. CERINS는 고객과 파트너의 변함없는 신뢰에 감사드리며, 2026년에도 이러한 기반 위에서 더 큰 성장을 이어가겠습니다.',
   'CERINS 편집팀', 1, '2025-12-31', '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- FAQ 게시글 (board_code='faq')
INSERT INTO posts
  (id, board_code, locale, slug, title, summary, content, thumbnail, author, is_published, published_at, created_at, updated_at) VALUES
  (1001, 'faq', 'ko', '1',
   '인증 절차는 얼마나 걸리나요?',
   '제품군과 대상 국가에 따라 다르지만 일반적으로 3~8주가 소요됩니다.',
   '<p>인증 소요 기간은 제품군, 대상 국가, 시험 항목에 따라 달라집니다. 정확한 일정은 담당자와 상담을 통해 안내해 드립니다.</p>',
   NULL, 'CERINS Editorial', 1, '2026-01-01',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (1002, 'faq', 'en', '1',
   'How long does the certification process take?',
   'It varies by product category and target country, but typically 3–8 weeks.',
   '<p>The lead time depends on the product category, target country, and required tests. Our team will advise you on an exact schedule after consultation.</p>',
   NULL, 'CERINS Editorial', 1, '2026-01-01',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- ---------------------------------------------------------------------
-- 7. partners
-- ---------------------------------------------------------------------
CREATE TABLE partners (
  id         INT          NOT NULL PRIMARY KEY,
  name       VARCHAR(128) NOT NULL,
  logo       VARCHAR(512) NULL,
  website    VARCHAR(512) NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_visible TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO partners (id, name, logo, website, sort_order, is_visible) VALUES
  (1, 'Bureau Veritas',   '/images/partners/bv.png',       NULL, 1, 1),
  (2, 'SGS Group',        '/images/partners/sgs.png',      NULL, 2, 1),
  (3, 'TÜV Rheinland',    '/images/partners/tuv.png',      NULL, 3, 1),
  (4, 'Intertek',         '/images/partners/intertek.png', NULL, 4, 1),
  (5, 'Lloyd''s Register','/images/partners/lloyds.png',   NULL, 5, 1),
  (6, 'DNV GL',           '/images/partners/dnv.png',      NULL, 6, 1),
  (7, 'DEKRA',            '/images/partners/dekra.png',    NULL, 7, 1),
  (8, 'Eurofins',         '/images/partners/eurofins.png', NULL, 8, 1);

-- ---------------------------------------------------------------------
-- 8. home_slides (hero slides)
-- ---------------------------------------------------------------------
CREATE TABLE home_slides (
  id         INT          NOT NULL PRIMARY KEY,
  locale     VARCHAR(8)   NOT NULL,
  eyebrow    VARCHAR(128) NOT NULL,
  headline   VARCHAR(255) NOT NULL,
  sub        VARCHAR(512) NOT NULL,
  image      VARCHAR(512) NOT NULL,
  fallback   VARCHAR(32)  NOT NULL,
  sort_order INT          NOT NULL DEFAULT 0,
  is_visible TINYINT(1)   NOT NULL DEFAULT 1,
  INDEX idx_home_slides_locale (locale, is_visible, sort_order),
  CONSTRAINT fk_home_slides_locale FOREIGN KEY (locale) REFERENCES locales(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO home_slides (id, locale, eyebrow, headline, sub, image, fallback, sort_order, is_visible) VALUES
  (  1, 'en', 'Global Standards',  'Global Certification & Inspection Partner',
     'Connecting standards, markets, and trust across 20+ countries.',
     'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&q=80&auto=format&fit=crop',
     '#0d2244', 1, 1),
  (  2, 'en', 'Trade Compliance',  'Reliable Trade Compliance Solutions',
     'EAC, CE, GOST-R and more, handled by certified professionals.',
     'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=80&auto=format&fit=crop',
     '#12223a', 2, 1),
  (  3, 'en', 'Trust Network',     'Connecting Standards, Markets and Trust',
     'From pre-shipment inspection to customs brokerage, CERINS delivers.',
     'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80&auto=format&fit=crop',
     '#0e1e38', 3, 1),
  (  4, 'en', 'Global Markets',    'Your Gateway to Global Markets',
     'Comprehensive certification and inspection services for international trade.',
     'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1600&q=80&auto=format&fit=crop',
     '#101f3a', 4, 1),
  (101, 'ko', '글로벌 표준',        '글로벌 인증 및 검사 파트너',
     '20개 이상 국가에서 표준, 시장, 신뢰를 연결합니다.',
     'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1600&q=80&auto=format&fit=crop',
     '#0d2244', 1, 1),
  (102, 'ko', '무역 규정 준수',     '신뢰할 수 있는 무역 컴플라이언스 솔루션',
     'EAC, CE, GOST-R 등 주요 인증을 전문 인력이 지원합니다.',
     'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1600&q=80&auto=format&fit=crop',
     '#12223a', 2, 1),
  (103, 'ko', '신뢰 네트워크',      '표준과 시장, 신뢰를 연결합니다',
     '선적 전 검사부터 통관 중개까지 CERINS가 함께합니다.',
     'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80&auto=format&fit=crop',
     '#0e1e38', 3, 1),
  (104, 'ko', '글로벌 시장',        '글로벌 시장 진출의 관문',
     '국제 무역을 위한 종합 인증 및 검사 서비스를 제공합니다.',
     'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1600&q=80&auto=format&fit=crop',
     '#101f3a', 4, 1);

-- ---------------------------------------------------------------------
-- 9. site_assets (key/value 이미지 카탈로그)
-- ---------------------------------------------------------------------
CREATE TABLE site_assets (
  `key`      VARCHAR(64)  NOT NULL PRIMARY KEY,
  `value`    VARCHAR(512) NOT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_assets (`key`, `value`) VALUES
  ('default_hero_image',
   'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1400&q=80&auto=format&fit=crop'),
  ('hero_video', '');

-- ---------------------------------------------------------------------
-- 10. users (회원가입 / 로그인)
--   - login_id      : 사용자가 직접 입력하는 로그인용 ID (영문/숫자)
--   - password_hash : bcrypt 해시 (평문 비밀번호 저장 금지)
--   - email         : 이메일
--   - company       : 회사명 (선택 입력)
--   - job_title     : 직위 (선택 입력)
--   - email_consent : 이메일 수신 동의 여부
--   - account_type  : 'personal' | 'business' — 회원가입 시 선택
--   - user_level    : 권한 레벨. 1=일반 회원, 3=기업 회원, 7=직원, 9=관리자
--                     (값/라벨은 src/lib/userTypes.ts 와 동기화)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  login_id      VARCHAR(64)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  company       VARCHAR(190) NULL,
  job_title     VARCHAR(190) NULL,
  country       VARCHAR(8)   NULL,
  email_consent TINYINT(1)   NOT NULL DEFAULT 0,
  account_type  ENUM('personal','business') NOT NULL DEFAULT 'personal',
  user_level    INT          NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_login_id (login_id),
  UNIQUE KEY uq_users_email    (email),
  INDEX idx_users_account_type (account_type),
  INDEX idx_users_user_level   (user_level),
  CONSTRAINT fk_users_country FOREIGN KEY (country) REFERENCES locales(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 관리자 계정 (로그인 ID: admin / 비밀번호: admin1234)
-- 비밀번호 해시는 bcrypt(cost=10) 결과이며, 운영 환경에서는 반드시 교체할 것.
INSERT INTO users (login_id, password_hash, email, email_consent, account_type, user_level) VALUES
  ('admin',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'admin@cerins.local',
   0, 'business', 9);

-- ---------------------------------------------------------------------
-- 11. inquiries / satisfaction_reviews / staff_evaluations
--   - inquiries            : /contact 문의 폼 접수 내역 (누구나 제출)
--   - satisfaction_reviews : 고객 만족도 (일반회원=1 / 기업회원=3 제출)
--   - staff_evaluations    : 직원 평가 (직원=7 제출)
--   - 별점 항목은 ratings(JSON)에 {항목키: 점수} 로 저장 → 항목 추가 시 스키마 변경 불필요.
--     (항목 라벨은 src/lib/reviewTypes.ts 와 동기화)
-- ---------------------------------------------------------------------
CREATE TABLE inquiries (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category   VARCHAR(40)  NULL,
  name       VARCHAR(190) NOT NULL,
  company    VARCHAR(190) NULL,
  department VARCHAR(190) NULL,
  country    VARCHAR(120) NULL,
  email      VARCHAR(190) NOT NULL,
  website    VARCHAR(255) NULL,
  phone      VARCHAR(60)  NULL,
  subject    VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inquiries_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE satisfaction_reviews (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NULL,
  name       VARCHAR(190) NOT NULL,
  company    VARCHAR(190) NULL,
  email      VARCHAR(190) NULL,
  ratings    JSON         NOT NULL,
  comment    TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_satisfaction_created_at (created_at),
  INDEX idx_satisfaction_user_id (user_id),
  CONSTRAINT fk_satisfaction_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff_evaluations (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NULL,
  name       VARCHAR(190) NOT NULL,
  department VARCHAR(190) NULL,
  ratings    JSON         NOT NULL,
  comment    TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_staff_eval_created_at (created_at),
  INDEX idx_staff_eval_user_id (user_id),
  CONSTRAINT fk_staff_eval_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 고객 의뢰 / 업무 프로세스 (2026-07-10-service-requests.sql 와 동일)
-- =====================================================================

CREATE TABLE service_requests (
  id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_number   VARCHAR(32)  NULL,
  customer_user_id BIGINT       NULL,
  assignee_user_id BIGINT       NULL,
  category         VARCHAR(32)  NOT NULL,
  service_type     VARCHAR(48)  NOT NULL,
  company_name     VARCHAR(190) NOT NULL,
  contact_name     VARCHAR(190) NOT NULL,
  contact_phone    VARCHAR(60)  NOT NULL,
  contact_email    VARCHAR(190) NOT NULL,
  title            VARCHAR(255) NOT NULL,
  -- 제품 정보(TRCU/GOST 접수 시 필수. 타 서비스는 NULL)
  product_name     VARCHAR(255) NULL,
  hs_code          VARCHAR(64)  NULL,
  product_use      VARCHAR(255) NULL,
  description      TEXT         NOT NULL,
  workflow_step    INT          NOT NULL DEFAULT 0,
  status           VARCHAR(48)  NOT NULL DEFAULT 'REQUESTED',
  submitted_at     DATETIME     NULL,
  assigned_at      DATETIME     NULL,
  completed_at     DATETIME     NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_requests_request_number (request_number),
  INDEX idx_sr_customer (customer_user_id),
  INDEX idx_sr_assignee (assignee_user_id),
  INDEX idx_sr_status (status),
  INDEX idx_sr_service_type (service_type),
  INDEX idx_sr_created_at (created_at),
  CONSTRAINT fk_sr_customer FOREIGN KEY (customer_user_id)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sr_assignee FOREIGN KEY (assignee_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_number_seq (
  year_2   INT         NOT NULL,
  prefix   VARCHAR(16) NOT NULL,
  last_seq INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (year_2, prefix)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_files (
  id                  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id  BIGINT       NOT NULL,
  file_type           VARCHAR(48)  NOT NULL,
  -- 동적 제출서류 항목 연결(스크랩 India 등). 일반 첨부에는 NULL.
  service_document_requirement_id BIGINT       NULL,
  display_name_snapshot           VARCHAR(190) NULL,
  original_name       VARCHAR(255) NOT NULL,
  stored_name         VARCHAR(255) NOT NULL,
  storage_path        VARCHAR(512) NOT NULL,
  mime_type           VARCHAR(190) NOT NULL,
  extension           VARCHAR(16)  NOT NULL,
  file_size           BIGINT       NOT NULL DEFAULT 0,
  uploaded_by         BIGINT       NULL,
  is_customer_visible TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rf_request (service_request_id),
  INDEX idx_rf_type (service_request_id, file_type),
  CONSTRAINT fk_rf_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rf_uploader FOREIGN KEY (uploaded_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_status_histories (
  id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id BIGINT       NOT NULL,
  actor_user_id      BIGINT       NULL,
  action             VARCHAR(48)  NOT NULL,
  from_step          INT          NULL,
  to_step            INT          NULL,
  from_status        VARCHAR(48)  NULL,
  to_status          VARCHAR(48)  NULL,
  message            TEXT         NULL,
  metadata_json      JSON         NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rsh_request (service_request_id),
  INDEX idx_rsh_created (service_request_id, created_at),
  CONSTRAINT fk_rsh_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsh_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quotations (
  id                 BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id BIGINT        NOT NULL,
  currency           VARCHAR(8)    NOT NULL DEFAULT 'KRW',
  total_amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  deposit_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  balance_amount     DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes              TEXT          NULL,
  created_by         BIGINT        NULL,
  sent_at            DATETIME      NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quotations_request (service_request_id),
  CONSTRAINT fk_q_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_q_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quotation_items (
  id           BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  quotation_id BIGINT        NOT NULL,
  item_type    VARCHAR(48)   NULL,
  item_name    VARCHAR(190)  NOT NULL,
  quantity     DECIMAL(15,2) NOT NULL DEFAULT 0,
  unit_price   DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount       DECIMAL(15,2) NOT NULL DEFAULT 0,
  memo         VARCHAR(255)  NULL,
  sort_order   INT           NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_qi_quotation (quotation_id),
  CONSTRAINT fk_qi_quotation FOREIGN KEY (quotation_id)
    REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id                 BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id BIGINT        NOT NULL,
  payment_type       VARCHAR(32)   NOT NULL,
  expected_amount    DECIMAL(15,2) NULL,
  -- 외부 인증기관 정산 입금(제품검사 등)용 확장 컬럼(고객 선금/잔금에는 NULL).
  currency                  VARCHAR(8)    NULL,
  paid_amount               DECIMAL(15,2) NULL,
  payer_organization_name   VARCHAR(190)  NULL,
  external_reference_number VARCHAR(120)  NULL,
  received_account          VARCHAR(190)  NULL,
  depositor_name     VARCHAR(190)  NOT NULL,
  sender_account     VARCHAR(190)  NULL,
  payment_date       DATE          NULL,
  memo               VARCHAR(255)  NULL,
  status             VARCHAR(16)   NOT NULL DEFAULT 'PENDING',
  submitted_by       BIGINT        NULL,
  submitted_at       DATETIME      NULL,
  confirmed_by       BIGINT        NULL,
  confirmed_at       DATETIME      NULL,
  rejection_reason   TEXT          NULL,
  created_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pay_request (service_request_id),
  INDEX idx_pay_type (service_request_id, payment_type),
  CONSTRAINT fk_pay_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_pay_submitter FOREIGN KEY (submitted_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pay_confirmer FOREIGN KEY (confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_messages (
  id                  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id  BIGINT       NOT NULL,
  author_user_id      BIGINT       NULL,
  message_type        VARCHAR(48)  NOT NULL,
  message             TEXT         NOT NULL,
  is_customer_visible TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rm_request (service_request_id),
  INDEX idx_rm_visible (service_request_id, is_customer_visible),
  CONSTRAINT fk_rm_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_rm_author FOREIGN KEY (author_user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- CEC India 인증 프로세스 상세 (2026-07-11-cec-india)
--   cec_inspections : 검사 일정(예정/실제) + 장소/메모. 의뢰당 1행(upsert).
--   cec_valuations  : 가격평가(append-only, 최신 id = 현재 평가).
-- ---------------------------------------------------------------------
CREATE TABLE cec_inspections (
  id                  BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id  BIGINT       NOT NULL,
  requested_start_date DATE        NULL,
  requested_end_date   DATE        NULL,
  requested_start_time TIME        NULL,
  requested_end_time   TIME        NULL,
  site_contact_name   VARCHAR(190) NULL,
  site_contact_phone  VARCHAR(60)  NULL,
  planned_start_date  DATE         NULL,
  planned_end_date    DATE         NULL,
  planned_days        INT          NULL,
  actual_start_date   DATE         NULL,
  actual_end_date     DATE         NULL,
  actual_days         INT          NULL,
  inspection_location VARCHAR(255) NULL,
  inspection_memo     TEXT         NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cec_inspection_request (service_request_id),
  CONSTRAINT fk_cec_insp_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cec_valuations (
  id                    BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id    BIGINT        NOT NULL,
  valuation_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  valuation_currency    VARCHAR(8)    NOT NULL DEFAULT 'USD',
  valuation_description  TEXT         NULL,
  surcharge_applied     TINYINT(1)    NOT NULL DEFAULT 0,
  surcharge_rate        DECIMAL(6,5)  NOT NULL DEFAULT 0.00500,
  surcharge_amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes                 TEXT          NULL,
  created_by            BIGINT        NULL,
  customer_confirmed_at DATETIME      NULL,
  created_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cec_val_request (service_request_id),
  INDEX idx_cec_val_latest (service_request_id, id),
  CONSTRAINT fk_cec_val_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_cec_val_creator FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 제품검사(Product Inspection) 상세 (2026-07-11-product-inspection)
--   product_inspections : 검사 일정(예정/실제, 시간대) + 처리자/시각 + 외부기관 리포트 정보.
--   (payments 확장 컬럼은 위 payments CREATE TABLE 에 인라인 반영됨)
-- ---------------------------------------------------------------------
CREATE TABLE product_inspections (
  id                            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id            BIGINT       NOT NULL,

  planned_start_date            DATE         NULL,
  planned_end_date              DATE         NULL,
  planned_start_time            TIME         NULL,
  planned_end_time              TIME         NULL,

  actual_start_date             DATE         NULL,
  actual_end_date               DATE         NULL,
  actual_start_time             TIME         NULL,
  actual_end_time               TIME         NULL,

  inspection_location           VARCHAR(255) NULL,

  schedule_confirmed_at         DATETIME     NULL,
  schedule_confirmed_by         BIGINT       NULL,
  inspection_started_at         DATETIME     NULL,
  inspection_started_by         BIGINT       NULL,
  inspection_completed_at       DATETIME     NULL,
  inspection_completed_by       BIGINT       NULL,
  report_submitted_at           DATETIME     NULL,
  report_submitted_by           BIGINT       NULL,

  -- 다른 인증기관 리포트 제출 정보(내부용).
  external_agency_name          VARCHAR(190) NULL,
  external_agency_department    VARCHAR(190) NULL,
  external_agency_contact_name  VARCHAR(190) NULL,
  external_agency_contact_email VARCHAR(190) NULL,
  external_agency_contact_phone VARCHAR(60)  NULL,
  external_reference_number     VARCHAR(120) NULL,
  report_submission_method      VARCHAR(16)  NULL,  -- EMAIL / PORTAL / OFFLINE / OTHER

  customer_visible_memo         TEXT         NULL,
  internal_memo                 TEXT         NULL,

  created_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pi_request (service_request_id),
  CONSTRAINT fk_pi_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_schedule_by FOREIGN KEY (schedule_confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pi_started_by FOREIGN KEY (inspection_started_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pi_completed_by FOREIGN KEY (inspection_completed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_pi_report_by FOREIGN KEY (report_submitted_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 검사 → 스크랩(인도) (Scrap India) 상세 + 동적 제출서류 (2026-07-12-scrap-india)
--   scrap_inspections             : 검사 일정(요청/확정/실제) + 현장 담당자 + 처리자/시각 + 메모.
--   scrap_dgft_registrations      : DGFT 등록 문서/신청/등록번호/증빙 처리 정보.
--   service_document_requirements : 서비스별·단계별 고객 제출서류 항목(동적).
--   (request_files 의 동적 서류 연결 컬럼은 위 request_files CREATE TABLE 에 인라인 반영,
--    FK 는 service_document_requirements 생성 후 아래에서 추가)
-- ---------------------------------------------------------------------
CREATE TABLE scrap_inspections (
  id                              BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id              BIGINT       NOT NULL,

  -- 고객이 신청한 요청 일정/장소(step 0).
  requested_start_date            DATE         NULL,
  requested_end_date              DATE         NULL,
  requested_start_time            TIME         NULL,
  requested_end_time              TIME         NULL,
  requested_location              VARCHAR(255) NULL,
  requested_location_detail       VARCHAR(255) NULL,

  -- 담당자가 확정한 검사 일정/장소(step 3).
  confirmed_start_date            DATE         NULL,
  confirmed_end_date              DATE         NULL,
  confirmed_start_time            TIME         NULL,
  confirmed_end_time              TIME         NULL,
  confirmed_location              VARCHAR(255) NULL,

  -- 실제 현장검사 일정.
  actual_start_date               DATE         NULL,
  actual_end_date                 DATE         NULL,
  actual_start_time               TIME         NULL,
  actual_end_time                 TIME         NULL,

  -- 현장 담당자(고객측 현장 연락처).
  site_contact_name               VARCHAR(190) NULL,
  site_contact_phone              VARCHAR(60)  NULL,

  -- 처리자/처리시각.
  schedule_confirmed_at           DATETIME     NULL,
  schedule_confirmed_by           BIGINT       NULL,
  inspection_started_at           DATETIME     NULL,
  inspection_started_by           BIGINT       NULL,
  inspection_completed_at         DATETIME     NULL,
  inspection_completed_by         BIGINT       NULL,
  customer_documents_submitted_at DATETIME     NULL,
  customer_documents_confirmed_at DATETIME     NULL,
  customer_documents_confirmed_by BIGINT       NULL,

  customer_visible_memo           TEXT         NULL,
  internal_memo                   TEXT         NULL,

  created_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scrap_request (service_request_id),
  CONSTRAINT fk_scrap_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_scrap_schedule_by FOREIGN KEY (schedule_confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scrap_started_by FOREIGN KEY (inspection_started_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scrap_completed_by FOREIGN KEY (inspection_completed_by)
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_scrap_docs_by FOREIGN KEY (customer_documents_confirmed_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE scrap_dgft_registrations (
  id                        BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_request_id        BIGINT       NOT NULL,

  document_prepared_at      DATE         NULL,  -- DGFT 등록 문서 작성일
  registration_submitted_at DATE         NULL,  -- DGFT 등록 신청일
  registration_confirmed_at DATE         NULL,  -- DGFT 등록 완료(확인)일
  registration_number       VARCHAR(120) NULL,  -- DGFT 등록번호
  external_reference_number VARCHAR(120) NULL,  -- 외부 접수번호
  registered_by             BIGINT       NULL,  -- 등록 담당자(직원)
  registration_status       VARCHAR(32)  NOT NULL DEFAULT 'PREPARING', -- PREPARING/IN_PROGRESS/REGISTERED/BLOCKED
  customer_visible_memo     TEXT         NULL,
  internal_memo             TEXT         NULL,

  created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scrap_dgft_request (service_request_id),
  CONSTRAINT fk_scrap_dgft_request FOREIGN KEY (service_request_id)
    REFERENCES service_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_scrap_dgft_registered_by FOREIGN KEY (registered_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE service_document_requirements (
  id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_type       VARCHAR(48)  NOT NULL,   -- 예: 'SCRAP_INDIA'
  workflow_step      INT          NOT NULL,   -- 예: 5 (고객 서류 제출 단계)
  document_code      VARCHAR(64)  NOT NULL,   -- 내부 식별 코드(서비스+단계 내 유일)
  display_name       VARCHAR(190) NOT NULL,   -- 고객에게 보이는 서류명(관리자 입력)
  description        VARCHAR(500) NULL,
  is_required        TINYINT(1)   NOT NULL DEFAULT 1,
  allows_multiple    TINYINT(1)   NOT NULL DEFAULT 0,
  allowed_extensions VARCHAR(190) NULL,        -- 쉼표구분(.pdf,.jpg). NULL 이면 공통 업로드 정책 사용.
  max_file_size      BIGINT       NULL,        -- 바이트. NULL 이면 공통 MAX_UPLOAD_BYTES 사용.
  sort_order         INT          NOT NULL DEFAULT 0,
  is_active          TINYINT(1)   NOT NULL DEFAULT 1,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sdr_code (service_type, workflow_step, document_code),
  INDEX idx_sdr_lookup (service_type, workflow_step, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- request_files → service_document_requirements FK (컬럼은 request_files 정의에 인라인됨).
ALTER TABLE request_files
  ADD CONSTRAINT fk_rf_doc_requirement FOREIGN KEY (service_document_requirement_id)
    REFERENCES service_document_requirements(id) ON DELETE SET NULL;

-- =====================================================================
-- 관리자 회원 대상 메일 발송: 양식(템플릿) + 발송 로그
-- =====================================================================

-- 저장해 둔 메일 양식(제목 + 에디터 HTML 본문).
CREATE TABLE email_templates (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(190) NOT NULL,
  subject    VARCHAR(255) NOT NULL DEFAULT '',
  body_html  MEDIUMTEXT   NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 발송 1건(캠페인) = 1행. 수신자 목록/성공·실패 수를 함께 보관.
CREATE TABLE email_logs (
  id           BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subject      VARCHAR(255) NOT NULL,
  body_html    MEDIUMTEXT   NOT NULL,
  recipients   JSON         NOT NULL,           -- 발송 대상 이메일 배열
  sent_count   INT          NOT NULL DEFAULT 0,
  failed_count INT          NOT NULL DEFAULT 0,
  error        TEXT         NULL,               -- 첫 실패 메시지(요약)
  sent_by      BIGINT       NULL,               -- users.id (관리자)
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_logs_created (created_at),
  CONSTRAINT fk_email_logs_sent_by FOREIGN KEY (sent_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 끝.
-- =====================================================================
