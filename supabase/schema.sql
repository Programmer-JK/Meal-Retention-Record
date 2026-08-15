-- =============================================
-- 보존식 기록표 DB 스키마
-- Neon 콘솔 SQL Editor에서 실행하세요
-- =============================================

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,       -- SHA-256 해시값
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 보존식 기록 테이블
CREATE TABLE IF NOT EXISTS public.records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  collection_date TIMESTAMPTZ NOT NULL,
  disposal_date TIMESTAMPTZ NOT NULL,
  morning_snack TEXT NOT NULL DEFAULT '',   -- 오전간식
  lunch         TEXT NOT NULL DEFAULT '',   -- 점심
  afternoon_snack TEXT NOT NULL DEFAULT '', -- 오후간식
  dinner        TEXT NOT NULL DEFAULT '',   -- 석식
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 계정 생성 방법
-- 웹 앱의 "계정 만들기" 탭을 사용하거나
-- 아래 방식으로 직접 SQL 삽입 가능:
--
-- password_hash = SHA-256("foodlog:" + 비밀번호)
-- 예) 비밀번호 "1234" → 웹브라우저 콘솔에서 실행:
--   const enc = new TextEncoder()
--   const buf = await crypto.subtle.digest('SHA-256', enc.encode('foodlog:1234'))
--   console.log(Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''))
--
-- INSERT INTO public.users (username, password_hash, display_name)
-- VALUES ('admin', '해시값', '관리자');
-- =============================================
