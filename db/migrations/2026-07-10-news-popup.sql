-- 뉴스 팝업 기능: posts 에 팝업 노출 여부 / 팝업 레이아웃 타입 컬럼 추가
--  is_popup   : 이 글을 사이트 진입 팝업으로 띄울지 (관리자 '팝업 > 공개' 체크박스)
--  popup_type : 팝업 레이아웃 타입 (1=이미지 히어로 / 2=좌우 분할 / 3=미니멀), 기본 1
-- 실행: mysql --default-character-set=utf8mb4 -u root -p cerins < db/migrations/2026-07-10-news-popup.sql

ALTER TABLE posts
  ADD COLUMN is_popup   TINYINT(1) NOT NULL DEFAULT 0 AFTER is_published,
  ADD COLUMN popup_type TINYINT    NOT NULL DEFAULT 1 AFTER is_popup;
