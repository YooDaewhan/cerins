-- 1) 본문 우측 사진: 비우면(NULL) 본문이 기존처럼 전체 폭을 쓴다.
-- 2) 회원가입 필수 항목: 회사 전화번호 / 회사 주소.
--    기존 회원은 NULL 로 남는다(가입 시점 검증만 강제).
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-08-26-side-image-company-contact.sql

ALTER TABLE page_translations
  ADD COLUMN side_image VARCHAR(512) NULL AFTER hero_image;

ALTER TABLE users
  ADD COLUMN company_phone   VARCHAR(60)  NULL AFTER company,
  ADD COLUMN company_address VARCHAR(255) NULL AFTER company_phone;
