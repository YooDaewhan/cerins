-- FAQ 게시판 추가 (뉴스와 동일한 posts 구조, board_code='faq')
--  1) pages.template ENUM 에 'faq_list' 추가
--  2) FAQ 목록 페이지(pages) + 번역(page_translations) 시드
--  3) 헤더 메뉴(menus) + 라벨(menu_translations) 추가
--  4) 예시 FAQ 글 1건 (posts.board_code='faq')
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-06-faq-board.sql

-- 1) template ENUM 확장 ---------------------------------------------------
ALTER TABLE pages
  MODIFY COLUMN template
    ENUM('home','about','certification','inspection','services','news_list','faq_list','contact','simple')
    NOT NULL;

-- 2) FAQ 페이지 + 번역 ----------------------------------------------------
INSERT INTO pages (id, slug, template, is_published, sort_order, created_at, updated_at) VALUES
  (7, 'faq', 'faq_list', 1, 55, '2026-01-01 00:00:00', '2026-01-01 00:00:00');

INSERT INTO page_translations
  (id, page_id, locale, title, subtitle, hero_image, content, meta_title, meta_description, created_at, updated_at) VALUES
  (7, 7, 'en',
   'FAQ',
   'Frequently asked questions about CERINS certification and inspection services.',
   NULL,
   JSON_ARRAY(),
   'FAQ — CERINS',
   'Frequently asked questions about CERINS certification and inspection services.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (107, 7, 'ko',
   '자주 묻는 질문',
   'CERINS 인증·검사 서비스에 대해 자주 묻는 질문을 확인하세요.',
   NULL,
   JSON_ARRAY(),
   'FAQ - CERINS',
   'CERINS 인증·검사 서비스에 대해 자주 묻는 질문입니다.',
   '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- 3) 헤더 메뉴 (뉴스=500 다음, sort_order 60) ---------------------------
INSERT INTO menus (id, parent_id, page_id, url, mega_image_url, sort_order, is_visible, created_at, updated_at) VALUES
  (600, NULL, 7, NULL, NULL, 60, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00');

INSERT INTO menu_translations (id, menu_id, locale, label, created_at, updated_at) VALUES
  (6,   600, 'en', 'FAQ', '2026-01-01 00:00:00', '2026-01-01 00:00:00'),
  (106, 600, 'ko', 'FAQ', '2026-01-01 00:00:00', '2026-01-01 00:00:00');

-- 4) 예시 FAQ 글 (board_code='faq') --------------------------------------
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
