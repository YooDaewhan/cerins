-- 롤백: CEC 검사 요청 일정/현장 담당자 컬럼 제거.

ALTER TABLE cec_inspections
  DROP COLUMN requested_start_date,
  DROP COLUMN requested_end_date,
  DROP COLUMN requested_start_time,
  DROP COLUMN requested_end_time,
  DROP COLUMN site_contact_name,
  DROP COLUMN site_contact_phone;
