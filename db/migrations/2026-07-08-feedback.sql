-- 문의 / 고객만족도 / 직원평가 테이블 추가
--  1) inquiries           : /contact 문의 폼 접수 내역 (누구나 제출)
--  2) satisfaction_reviews : 고객 만족도 (일반회원=1 / 기업회원=3 이 제출)
--  3) staff_evaluations    : 직원 평가 (직원=7 이 제출)
-- 별점 항목은 ratings(JSON) 컬럼에 {항목키: 점수} 형태로 저장하므로,
-- 항목을 추가/삭제해도 스키마 변경이 필요 없다. (항목 라벨은 src/lib/reviewTypes.ts)
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-08-feedback.sql

-- 1) 문의 접수 ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(190) NOT NULL,
  company    VARCHAR(190) NULL,
  department VARCHAR(190) NULL,
  country    VARCHAR(120) NULL,
  email      VARCHAR(190) NOT NULL,
  website    VARCHAR(255) NULL,
  phone      VARCHAR(60)  NULL,
  subject    VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inquiries_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) 고객 만족도 ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS satisfaction_reviews (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NULL,
  name       VARCHAR(190) NOT NULL,
  company    VARCHAR(190) NULL,
  email      VARCHAR(190) NULL,
  ratings    JSON         NOT NULL,
  comment    TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_satisfaction_created_at (created_at),
  INDEX idx_satisfaction_user_id (user_id),
  CONSTRAINT fk_satisfaction_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3) 직원 평가 ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_evaluations (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NULL,
  name       VARCHAR(190) NOT NULL,
  department VARCHAR(190) NULL,
  ratings    JSON         NOT NULL,
  comment    TEXT         NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_staff_eval_created_at (created_at),
  INDEX idx_staff_eval_user_id (user_id),
  CONSTRAINT fk_staff_eval_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
