-- CEC India: 고객이 의뢰(step 0) 시 입력하는 "검사 요청 일정(가능일)/현장 담당자" 컬럼 추가.
-- 스크랩 India(scrap_inspections)와 동일하게, 고객이 신청 당시 희망한 검사 가능일/시간과
-- 현장 담당자 연락처를 cec_inspections 에 보존한다. 담당자가 접수 시 확정하는 예정 일정
-- (planned_start_date 등)과는 별개이며, 시간 미정을 지원하므로 시간 컬럼은 nullable.
-- 실행:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-13-cec-requested-schedule.sql
-- 롤백:   mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-13-cec-requested-schedule.down.sql

ALTER TABLE cec_inspections
  ADD COLUMN requested_start_date DATE         NULL AFTER service_request_id,
  ADD COLUMN requested_end_date   DATE         NULL AFTER requested_start_date,
  ADD COLUMN requested_start_time TIME         NULL AFTER requested_end_date,
  ADD COLUMN requested_end_time   TIME         NULL AFTER requested_start_time,
  ADD COLUMN site_contact_name    VARCHAR(190) NULL AFTER requested_end_time,
  ADD COLUMN site_contact_phone   VARCHAR(60)  NULL AFTER site_contact_name;
