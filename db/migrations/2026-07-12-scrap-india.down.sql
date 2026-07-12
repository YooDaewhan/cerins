-- 롤백: 2026-07-12-scrap-india.sql 에서 추가한 스크랩 India 테이블/컬럼 제거.
-- 공통 payments.payment_type 확장은 제품검사 마이그레이션 소유이므로 여기서 되돌리지 않는다.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-12-scrap-india.down.sql

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE request_files
  DROP FOREIGN KEY fk_rf_doc_requirement,
  DROP COLUMN display_name_snapshot,
  DROP COLUMN service_document_requirement_id;

DROP TABLE IF EXISTS service_document_requirements;
DROP TABLE IF EXISTS scrap_dgft_registrations;
DROP TABLE IF EXISTS scrap_inspections;

SET FOREIGN_KEY_CHECKS = 1;
