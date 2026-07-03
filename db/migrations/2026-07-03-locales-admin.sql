-- =====================================================================
-- 언어(locales) 관리 어드민 활성화용 마이그레이션
--   - 스키마 변경 없음. locales 테이블은 db/cerins.sql 최초 스키마에 이미 존재.
--   - 신규 설치는 cerins.sql 한번만 돌리면 되고, 기존 서버에서는 이 파일을
--     실행할 필요가 없습니다. 아래는 방어적 검증 스니펫입니다.
--
--   실행: mysql -u root -p cerins < db/migrations/2026-07-03-locales-admin.sql
-- =====================================================================

USE cerins;

-- 1) locales 테이블 존재/구조 확인. (없다면 아래 CREATE 를 실행하세요.)
--
-- CREATE TABLE IF NOT EXISTS locales (
--   code         VARCHAR(8)   NOT NULL PRIMARY KEY,
--   name         VARCHAR(64)  NOT NULL,
--   native_name  VARCHAR(64)  NOT NULL,
--   is_enabled   TINYINT(1)   NOT NULL DEFAULT 1,
--   sort_order   INT          NOT NULL DEFAULT 0
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 시드가 비어 있을 때만 기본 5개 언어를 채워 넣습니다.
INSERT IGNORE INTO locales (code, name, native_name, is_enabled, sort_order) VALUES
  ('ko', 'Korean',   '한국어',   1, 1),
  ('en', 'English',  'English',  1, 2),
  ('ja', 'Japanese', '日本語',   1, 3),
  ('zh', 'Chinese',  '中文',     1, 4),
  ('ru', 'Russian',  'Русский',  1, 5);

-- 3) 결과 확인
SELECT code, name, native_name, is_enabled, sort_order
FROM locales
ORDER BY sort_order, code;
