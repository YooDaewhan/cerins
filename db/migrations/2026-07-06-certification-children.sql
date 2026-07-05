-- 인증 국가 페이지(template='certification') 하위에 인증서 페이지 시드
-- 어드민 /admin/pages 의 "+하위" 로 추가하는 것과 동일한 구조 (pages.parent_id)
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-06-certification-children.sql

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
