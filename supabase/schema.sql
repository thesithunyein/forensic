-- Run in Supabase SQL editor.

create table if not exists autopsies (
  token_address text primary key,
  chain_name text not null,
  symbol text,
  name text,
  total_drained_usd numeric,
  victim_count int,
  extractor_count int,
  lifespan_human text,
  summary text,
  timeline jsonb,
  extractors jsonb,
  deployer jsonb,
  updated_at timestamptz default now()
);

create index if not exists autopsies_updated_idx on autopsies(updated_at desc);

create table if not exists watches (
  deployer text not null,
  telegram_chat_id text not null,
  last_tx_hash text,
  created_at timestamptz default now(),
  primary key (deployer, telegram_chat_id)
);

alter table autopsies enable row level security;
alter table watches enable row level security;

-- read public
create policy if not exists autopsies_read on autopsies for select using (true);
