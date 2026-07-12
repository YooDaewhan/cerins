-- 롤백: 2026-07-10-service-requests.sql 에서 생성한 테이블을 제거한다.
-- FK 의존성 역순으로 DROP. (자식 → 부모)
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-10-service-requests.down.sql

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS request_messages;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS quotation_items;
DROP TABLE IF EXISTS quotations;
DROP TABLE IF EXISTS request_status_histories;
DROP TABLE IF EXISTS request_files;
DROP TABLE IF EXISTS request_number_seq;
DROP TABLE IF EXISTS service_requests;
SET FOREIGN_KEY_CHECKS = 1;
