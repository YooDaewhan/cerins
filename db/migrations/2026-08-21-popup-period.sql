-- 팝업 노출기간: 비우면(NULL) 제한 없음. 둘 다 포함(inclusive) 비교.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-08-21-popup-period.sql

ALTER TABLE posts
  ADD COLUMN popup_start DATE NULL AFTER popup_type,
  ADD COLUMN popup_end   DATE NULL AFTER popup_start;
