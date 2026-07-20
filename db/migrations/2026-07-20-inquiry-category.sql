-- /contact 문의 폼에 분류(category) 추가: 불편 접수 / 추가 요청사항 / 기타
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-20-inquiry-category.sql
ALTER TABLE inquiries
  ADD COLUMN category VARCHAR(40) NULL AFTER id;
