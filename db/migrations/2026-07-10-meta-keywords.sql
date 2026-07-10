-- 페이지 번역에 검색용 메타 태그(키워드) 추가
--   상세검색 최적화를 위해 관리자가 언어별로 태그를 입력한다.
--   JSON 문자열 배열 (예: ["가전", "전자파", "KC 인증"]).
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-10-meta-keywords.sql

ALTER TABLE page_translations
  ADD COLUMN meta_keywords JSON NOT NULL DEFAULT (JSON_ARRAY()) AFTER meta_description;
