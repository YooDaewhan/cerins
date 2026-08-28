-- 사진보고서 생성 결과(Word/zip) 보관. 실제 파일은 private-uploads/photo-reports/ 에 두고
-- 여기에는 메타만 남긴다. 다운로드는 관리자 전용 API 로만 제공.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-08-28-photo-reports.sql

CREATE TABLE photo_reports (
  id            BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  report_type   VARCHAR(48)  NOT NULL,          -- reportForms 의 보고서 id (직접 업로드는 'upload')
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  storage_path  VARCHAR(512) NOT NULL,
  mime_type     VARCHAR(190) NOT NULL,
  file_size     BIGINT       NOT NULL DEFAULT 0,
  created_by    BIGINT       NULL,              -- users.id (비로그인 생성은 NULL)
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_photo_reports_created (created_at),
  CONSTRAINT fk_photo_reports_user FOREIGN KEY (created_by)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
