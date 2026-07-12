-- 롤백: 2026-07-11-product-inspection.sql 에서 추가한 제품검사 테이블/컬럼 제거.
-- 공통 테이블(service_requests 등)의 구조는 payments 확장 컬럼만 되돌린다.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-11-product-inspection.down.sql

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS product_inspections;
SET FOREIGN_KEY_CHECKS = 1;

ALTER TABLE payments
  DROP COLUMN received_account,
  DROP COLUMN external_reference_number,
  DROP COLUMN payer_organization_name,
  DROP COLUMN paid_amount,
  DROP COLUMN currency,
  MODIFY COLUMN payment_type VARCHAR(16) NOT NULL;
