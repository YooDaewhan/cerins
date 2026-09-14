-- 의뢰서(TRCU/GOST)에 제품 정보 필수 입력 항목 추가: 제품명 / HS코드 / 제품 용도.
-- 기존 행은 NULL. 필수 검증은 신규 접수 경로(POST /api/requests)에서만 한다.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-08-13-request-product-fields.sql
ALTER TABLE service_requests
  ADD COLUMN product_name VARCHAR(255) NULL AFTER title,
  ADD COLUMN hs_code      VARCHAR(64)  NULL AFTER product_name,
  ADD COLUMN product_use  VARCHAR(255) NULL AFTER hs_code;
