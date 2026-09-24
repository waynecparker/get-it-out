-- Checkpoint 5: record whether a saved assistant message triggered the
-- safety-support panel, so History can re-render it correctly. Deliberately
-- just a boolean, only ever written when the user explicitly saves the
-- conversation — no separate audit record of risk classification exists.

alter table public.messages
  add column triggered_safety_panel boolean not null default false;
