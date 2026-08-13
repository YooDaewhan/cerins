-- 상단 '문의' 탭을 서비스 의뢰(/requests) 화면으로 연결.
-- 기존 문의 폼(/contact)은 FAQ 목록 우측 상단 링크로 이동.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-08-13-contact-menu-to-requests.sql
UPDATE menus SET url = '/requests', page_id = NULL WHERE id = 400;
