-- Phase-1 campaign grouping.
--
-- A shareable text "code" groups characters into a party without a full
-- campaigns table yet. The existing `campaign_id uuid` column stays reserved
-- for the real campaigns foreign key once multiplayer lands; for now, party
-- membership is "my characters that share a campaign_code".
alter table characters add column if not exists campaign_code text;

-- Party lookups filter by code (and RLS already scopes to the owner).
create index if not exists characters_campaign_code_idx on characters(campaign_code);
