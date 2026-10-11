-- ClipForge initial schema
-- Tables: users, generations, credit_transactions, templates, rate_limits
-- Credits model: a job *reserves* its cost when submitted (so users can't
-- over-commit), the reservation is converted into a real deduction only when
-- the job succeeds, and released (nothing charged) when it fails.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users: one row per auth user, holds the credit balance
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  credits integer not null default 0 check (credits >= 0),
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reserved_within_balance check (reserved_credits <= credits)
);

-- ---------------------------------------------------------------------------
-- generations: one row per video job
-- ---------------------------------------------------------------------------
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  mode text not null check (mode in ('text', 'image')),
  prompt text not null,                -- what the user typed
  final_prompt text not null,          -- prompt + camera motion wording sent to the model
  model text not null,                 -- key from src/lib/config/models.ts
  settings jsonb not null default '{}'::jsonb, -- aspect_ratio, duration, camera_preset, template_id, image_path
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  fal_endpoint text,
  fal_request_id text,
  webhook_token text not null default encode(gen_random_bytes(24), 'hex'),
  queue_position integer,
  started_at timestamptz,              -- when the provider began rendering
  video_path text,                     -- object path in the "videos" storage bucket
  video_url text,                      -- original provider URL (fallback)
  cost integer not null check (cost >= 0),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index generations_user_created_idx on public.generations (user_id, created_at desc);
create unique index generations_fal_request_idx on public.generations (fal_request_id)
  where fal_request_id is not null;
create index generations_active_idx on public.generations (user_id)
  where status in ('queued', 'processing');

-- ---------------------------------------------------------------------------
-- credit_transactions: append-only ledger
-- ---------------------------------------------------------------------------
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount integer not null,             -- positive = added, negative = spent
  type text not null check (type in ('signup_bonus', 'purchase', 'generation', 'refund', 'adjustment')),
  generation_id uuid references public.generations (id) on delete set null,
  reference text unique,               -- e.g. Stripe checkout session id (idempotency)
  description text,
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index credit_transactions_user_idx on public.credit_transactions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- templates: public gallery of ready-made presets
-- ---------------------------------------------------------------------------
create table public.templates (
  id text primary key,                 -- slug
  title text not null,
  description text not null,
  category text not null,
  mode text not null default 'text' check (mode in ('text', 'image')),
  prompt text not null,
  camera_preset text,
  aspect_ratio text not null default '9:16',
  duration integer not null default 5,
  model text,
  cover_gradient text,                 -- tailwind gradient classes for the card
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- rate_limits: fixed-window counters (works across serverless instances)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

-- ---------------------------------------------------------------------------
-- Row level security
-- Writes to users / generations / credit_transactions happen only through the
-- service role (API routes) or the security-definer functions below.
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.generations enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.templates enable row level security;
alter table public.rate_limits enable row level security;

create policy "users: read own row" on public.users
  for select to authenticated using (id = auth.uid());

create policy "generations: read own" on public.generations
  for select to authenticated using (user_id = auth.uid());

create policy "credit_transactions: read own" on public.credit_transactions
  for select to authenticated using (user_id = auth.uid());

create policy "templates: public read" on public.templates
  for select to anon, authenticated using (true);

-- rate_limits: no policies -> only service role can touch it.

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch before update on public.users
  for each row execute function public.touch_updated_at();
create trigger generations_touch before update on public.generations
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> users row + signup bonus
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  bonus constant integer := 20;  -- keep in sync with SIGNUP_BONUS_CREDITS in src/lib/config/credits.ts
begin
  insert into public.users (id, email, credits) values (new.id, new.email, bonus);
  insert into public.credit_transactions (user_id, amount, type, description, balance_after)
  values (new.id, bonus, 'signup_bonus', 'Welcome bonus', bonus);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- create_generation: atomically reserve credits and insert the job row.
-- Raises 'insufficient_credits' or 'too_many_active_jobs'.
-- ---------------------------------------------------------------------------
create or replace function public.create_generation(
  p_user_id uuid,
  p_mode text,
  p_prompt text,
  p_final_prompt text,
  p_model text,
  p_settings jsonb,
  p_cost integer,
  p_max_active integer
) returns public.generations
language plpgsql security definer set search_path = public as $$
declare
  u public.users;
  active_count integer;
  g public.generations;
begin
  select * into u from public.users where id = p_user_id for update;
  if not found then
    raise exception 'user_not_found';
  end if;

  if u.credits - u.reserved_credits < p_cost then
    raise exception 'insufficient_credits';
  end if;

  select count(*) into active_count from public.generations
   where user_id = p_user_id and status in ('queued', 'processing');
  if active_count >= p_max_active then
    raise exception 'too_many_active_jobs';
  end if;

  update public.users set reserved_credits = reserved_credits + p_cost where id = p_user_id;

  insert into public.generations (user_id, mode, prompt, final_prompt, model, settings, cost)
  values (p_user_id, p_mode, p_prompt, p_final_prompt, p_model, coalesce(p_settings, '{}'::jsonb), p_cost)
  returning * into g;

  return g;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_generation: idempotent. Marks success and converts the
-- reservation into a real deduction. Returns null if the job was already final.
-- ---------------------------------------------------------------------------
create or replace function public.complete_generation(
  p_generation_id uuid,
  p_video_path text,
  p_video_url text
) returns public.generations
language plpgsql security definer set search_path = public as $$
declare
  g public.generations;
  new_balance integer;
begin
  update public.generations
     set status = 'completed', video_path = p_video_path, video_url = p_video_url,
         completed_at = now(), error = null, queue_position = null
   where id = p_generation_id and status in ('queued', 'processing')
  returning * into g;

  if not found then
    return null;
  end if;

  update public.users
     set credits = credits - g.cost, reserved_credits = reserved_credits - g.cost
   where id = g.user_id
  returning credits into new_balance;

  insert into public.credit_transactions (user_id, amount, type, generation_id, description, balance_after)
  values (g.user_id, -g.cost, 'generation', g.id, 'Video generation (' || g.model || ')', new_balance);

  return g;
end;
$$;

-- ---------------------------------------------------------------------------
-- fail_generation: idempotent. Marks failure and releases the reservation,
-- so the user is never charged. Logs a zero-amount 'refund' ledger entry.
-- ---------------------------------------------------------------------------
create or replace function public.fail_generation(
  p_generation_id uuid,
  p_error text
) returns public.generations
language plpgsql security definer set search_path = public as $$
declare
  g public.generations;
  bal integer;
begin
  update public.generations
     set status = 'failed', error = left(coalesce(p_error, 'Unknown error'), 1000),
         completed_at = now(), queue_position = null
   where id = p_generation_id and status in ('queued', 'processing')
  returning * into g;

  if not found then
    return null;
  end if;

  update public.users
     set reserved_credits = reserved_credits - g.cost
   where id = g.user_id
  returning credits into bal;

  insert into public.credit_transactions (user_id, amount, type, generation_id, description, balance_after)
  values (g.user_id, 0, 'refund', g.id,
          'Generation failed - ' || g.cost || ' reserved credits released, nothing charged', bal);

  return g;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_credits: idempotent on p_reference (e.g. Stripe session id).
-- Returns the new balance, or null if this reference was already applied.
-- ---------------------------------------------------------------------------
create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference text,
  p_description text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'amount_must_be_positive';
  end if;

  if p_reference is not null and exists (
    select 1 from public.credit_transactions where reference = p_reference
  ) then
    return null;
  end if;

  update public.users set credits = credits + p_amount where id = p_user_id
  returning credits into new_balance;
  if not found then
    raise exception 'user_not_found';
  end if;

  insert into public.credit_transactions (user_id, amount, type, reference, description, balance_after)
  values (p_user_id, p_amount, p_type, p_reference, p_description, new_balance);

  return new_balance;
exception
  when unique_violation then
    -- concurrent duplicate webhook delivery: the other call won
    return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_rate_limit: fixed window counter. Returns true when allowed.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max integer
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, win, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;

  -- opportunistic cleanup of old windows for this key
  delete from public.rate_limits where key = p_key and window_start < win - interval '1 day';

  return c <= p_max;
end;
$$;

-- Only the service role (server-side API routes) may call these.
revoke all on function public.create_generation(uuid, text, text, text, text, jsonb, integer, integer) from public, anon, authenticated;
revoke all on function public.complete_generation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_generation(uuid, text) from public, anon, authenticated;
revoke all on function public.add_credits(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.create_generation(uuid, text, text, text, text, jsonb, integer, integer) to service_role;
grant execute on function public.complete_generation(uuid, text, text) to service_role;
grant execute on function public.fail_generation(uuid, text) to service_role;
grant execute on function public.add_credits(uuid, integer, text, text, text) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Storage buckets (private). Paths are always "<user_id>/<file>".
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('inputs', 'inputs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('videos', 'videos', false, 209715200, array['video/mp4'])
on conflict (id) do nothing;

create policy "inputs: users upload to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inputs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "inputs: users read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'inputs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "videos: users read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
