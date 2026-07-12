-- 롤백: 2026-07-11-cec-india.sql 에서 생성한 CEC 전용 테이블을 제거한다.
-- 공통 테이블(service_requests 등)은 건드리지 않는다.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-11-cec-india.down.sql

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS cec_valuations;
DROP TABLE IF EXISTS cec_inspections;
SET FOREIGN_KEY_CHECKS = 1;
