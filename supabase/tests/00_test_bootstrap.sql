-- =========================================================
-- HARNESS DE TESTE LOCAL (não é uma migration de produção)
-- =========================================================
-- Simula o mínimo do ambiente Supabase necessário para os triggers/policies
-- funcionarem fora de um projeto Supabase real: schema auth.users, auth.uid(),
-- schema storage e o papel "authenticated" com os grants que o Supabase
-- concede automaticamente em produção (e que por isso não aparecem nas nossas
-- migrations — lá eles já vêm prontos).

create extension if not exists pgcrypto;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Em produção, auth.uid() lê o JWT da sessão. Aqui, lemos uma variável de
-- sessão que o script de teste define antes de cada consulta.
create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$ language sql stable;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
alter table storage.objects enable row level security;

-- Papel usado pelo cliente Supabase (PostgREST). Local: LOGIN direto.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated login;
  end if;
end $$;

grant usage on schema public, auth, storage to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on all tables in schema storage to authenticated;
grant select on all tables in schema auth to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Garante que os grants acima também valham para tabelas/funções criadas
-- pelas migrations rodadas DEPOIS deste bootstrap (rodamos este arquivo
-- primeiro, então isso é redundante aqui, mas documenta a intenção).
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
