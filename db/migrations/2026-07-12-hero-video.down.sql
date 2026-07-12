-- 롤백: hero_video site_assets 키 제거
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-12-hero-video.down.sql

DELETE FROM site_assets WHERE `key` = 'hero_video';
