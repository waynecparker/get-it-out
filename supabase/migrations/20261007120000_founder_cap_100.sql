-- Founding Member initial release is the first 100 paying subscribers
-- (corrected by Wayne 2026-10-07; the Checkpoint 6 migration used 500).
-- Applied before any founder number was issued (next_number was still 1).
-- The cap stays a single editable value so a later release can raise it.

alter table public.founder_program alter column cap set default 100;

update public.founder_program set cap = 100;
