-- 메인 히어로 우하단 상시 소개 동영상 site_assets 키 추가
--  - key 'hero_video' : 히어로 우측 하단에 상시 노출되는 단일 소개 동영상 URL
--    (관리자 > 히어로 슬라이드 관리 화면 맨 위 카드에서 링크/업로드로 관리)
--    site_assets 테이블은 이미 존재하므로 키만 시드한다. 값이 없으면 자리표시자만 표시.
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-12-hero-video.sql

INSERT INTO site_assets (`key`, `value`) VALUES ('hero_video', '')
  ON DUPLICATE KEY UPDATE `key` = `key`;
