-- 롤백: 2026-07-14-email-verifications.sql 에서 추가한 테이블 제거.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-14-email-verifications.down.sql

DROP TABLE IF EXISTS email_verifications;
