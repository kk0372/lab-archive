-- ==========================================================
-- RF-01 / Supabase 복구용 스키마
-- 새 프로젝트에 다시 만들 때 SQL Editor에서 순서대로 실행.
-- ⚠️ UID와 열람 코드는 넣지 않음. 실행할 때만 직접 바꿔 넣기.
-- 그 외 대시보드 설정:
--   - Storage: 버킷 'images' 생성, Public 켜기
--   - Authentication → Sign In / Providers → Allow new users to sign up 끄기
-- ==========================================================
begin;
create extension if not exists pgcrypto with schema extensions;
-- 1) 주인 확인 함수
create or replace function public.is_owner()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.uid() = '여기에-UID-붙여넣기'::uuid, false)
$$;
grant execute on function public.is_owner() to authenticated;
-- 2) posts
drop table if exists public.posts cascade;
create table public.posts (
  id          bigint generated always as identity primary key,
  section     text not null check (section in ('visual', 'chronicles', 'logs')),
  title       text not null default '',
  body        text not null default '',
  images      text[] not null default '{}',
  subjects    text[] not null default '{}'
              check (subjects <@ array['yeon', 'evie']::text[]),
  artist      text,
  artist_url  text,
  drawn_on    date,
  observed_at timestamptz,
  access      text not null default 'public'
              check (access in ('public', 'classified')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index posts_section_created_idx on public.posts (section, created_at desc);
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();
alter table public.posts enable row level security;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
create policy "posts_read"
  on public.posts for select to anon, authenticated
  using (access = 'public' or (select public.is_owner()));
create policy "posts_insert_owner"
  on public.posts for insert to authenticated
  with check ((select public.is_owner()));
create policy "posts_update_owner"
  on public.posts for update to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));
create policy "posts_delete_owner"
  on public.posts for delete to authenticated
  using ((select public.is_owner()));
-- 3) Storage (images 버킷)
drop policy if exists "images_read_all" on storage.objects;
drop policy if exists "images_insert_owner" on storage.objects;
drop policy if exists "images_update_owner" on storage.objects;
drop policy if exists "images_delete_owner" on storage.objects;
create policy "images_read_all"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'images');
create policy "images_insert_owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and (select public.is_owner()));
create policy "images_update_owner"
  on storage.objects for update to authenticated
  using (bucket_id = 'images' and (select public.is_owner()))
  with check (bucket_id = 'images' and (select public.is_owner()));
create policy "images_delete_owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'images' and (select public.is_owner()));
-- 4) 열람 코드 보관함
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.access_code (
  id         int primary key default 1 check (id = 1),
  hash       text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.access_code from public, anon, authenticated;
-- 5) 목록용 통로
create or replace function public.post_stubs()
returns table (id bigint, section text, access text, observed_at timestamptz, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.section, p.access, p.observed_at, p.created_at
  from public.posts p
  order by p.created_at desc
$$;
-- 6) CLASSIFIED 열람
create or replace function public.unlock_classified(code text)
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  h text;
begin
  select a.hash into h from private.access_code a where a.id = 1;
  if h is null or code is null or extensions.crypt(code, h) <> h then
    perform pg_sleep(0.8);
    raise exception 'ACCESS DENIED' using errcode = '28000';
  end if;
  return query
    select * from public.posts p
    where p.access = 'classified'
    order by p.created_at desc;
end $$;
revoke all on function public.post_stubs() from public;
revoke all on function public.unlock_classified(text) from public;
grant execute on function public.post_stubs() to anon, authenticated;
grant execute on function public.unlock_classified(text) to anon, authenticated;
commit;
-- ==========================================================
-- 열람 코드 설정/변경 (따로 실행, 실행 후 쿼리 탭에서 코드 지우기)
-- ==========================================================
-- insert into private.access_code (id, hash)
-- values (1, extensions.crypt('여기에-열람코드', extensions.gen_salt('bf')))
-- on conflict (id) do update
--   set hash = excluded.hash, updated_at = now();