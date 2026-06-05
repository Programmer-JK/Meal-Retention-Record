-- =============================================
-- 보존식 기록표 DB 스키마 (커스텀 인증)
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. 사용자 테이블
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,       -- SHA-256 해시값
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 보존식 기록 테이블
CREATE TABLE public.records (
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
-- 기존 테이블에 컬럼 추가 (이미 생성된 경우)
-- =============================================
ALTER TABLE public.records DROP COLUMN IF EXISTS diet;
ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS morning_snack   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lunch           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS afternoon_snack TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dinner          TEXT NOT NULL DEFAULT '';

-- =============================================
-- RLS 비활성화 (anon key로 직접 접근)
-- 내부 시스템용: anon key를 외부에 노출하지 마세요
-- =============================================
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.records DISABLE ROW LEVEL SECURITY;

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
