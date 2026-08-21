\set ON_ERROR_STOP on
begin;
create extension if not exists pgcrypto;
create table public.deals (id uuid primary key default gen_random_uuid());
\ir ../migrations/20260821000100_create_acquisition_opportunities.sql
select 1 / 0;
commit;
