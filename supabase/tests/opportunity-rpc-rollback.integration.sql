\set ON_ERROR_STOP on
begin;
\ir ../migrations/20260821000200_create_opportunity_transaction_rpcs.sql
select 1 / 0;
commit;
