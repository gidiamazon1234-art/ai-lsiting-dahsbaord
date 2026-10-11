-- Assertions for the ClipForge schema. Run via `npm run test:db`.
\set QUIET on
set client_min_messages = warning;

create or replace function pg_temp.assert_eq(actual anyelement, expected anyelement, label text) returns void
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL %: expected %, got %', label, expected, actual;
  end if;
  raise notice 'ok - %', label;
end $$;

set client_min_messages = notice;

do $$
declare
  alice constant uuid := '00000000-0000-0000-0000-00000000000a';
  bob constant uuid := '00000000-0000-0000-0000-00000000000b';
  g1 public.generations;
  g2 public.generations;
  g3 public.generations;
  r public.generations;
  bal integer;
  err text;
begin
  -- Signup bonus ----------------------------------------------------------
  insert into auth.users (id, email) values (alice, 'alice@example.com'), (bob, 'bob@example.com');
  perform pg_temp.assert_eq((select credits from public.users where id = alice), 20, 'new user gets 20 credits');
  perform pg_temp.assert_eq(
    (select count(*)::int from public.credit_transactions where user_id = alice and type = 'signup_bonus'), 1,
    'signup bonus is logged');

  -- Templates seeded --------------------------------------------------------
  perform pg_temp.assert_eq((select count(*)::int from public.templates), 6, 'six templates seeded');

  -- Reservation ------------------------------------------------------------
  g1 := public.create_generation(alice, 'text', 'a cat', 'a cat. Camera: orbit', 'kling-v3',
                                 '{"aspect_ratio":"9:16","duration":5}', 8, 3);
  perform pg_temp.assert_eq(g1.status, 'queued', 'job starts queued');
  perform pg_temp.assert_eq((select reserved_credits from public.users where id = alice), 8, 'cost is reserved');
  perform pg_temp.assert_eq((select credits from public.users where id = alice), 20, 'balance not yet deducted');

  g2 := public.create_generation(alice, 'text', 'a dog', 'a dog', 'kling-v3', '{}', 8, 3);
  perform pg_temp.assert_eq((select reserved_credits from public.users where id = alice), 16, 'second reservation');

  -- 20 - 16 = 4 available: an 8-credit job must be refused
  begin
    perform public.create_generation(alice, 'text', 'x', 'x', 'kling-v3', '{}', 8, 3);
    raise exception 'FAIL: expected insufficient_credits';
  exception when others then
    err := sqlerrm;
  end;
  perform pg_temp.assert_eq(err, 'insufficient_credits', 'cannot over-commit reserved credits');

  -- Success deducts exactly once -------------------------------------------
  r := public.complete_generation(g1.id, alice || '/' || g1.id || '.mp4', 'https://fal.media/x.mp4');
  perform pg_temp.assert_eq(r.status, 'completed', 'complete marks completed');
  perform pg_temp.assert_eq((select credits from public.users where id = alice), 12, 'success deducts cost');
  perform pg_temp.assert_eq((select reserved_credits from public.users where id = alice), 8, 'success releases reservation');
  r := public.complete_generation(g1.id, 'other', 'other');
  perform pg_temp.assert_eq(r.id, null::uuid, 'complete is idempotent (webhook + poll race)');
  perform pg_temp.assert_eq((select credits from public.users where id = alice), 12, 'no double charge');
  perform pg_temp.assert_eq(
    (select amount from public.credit_transactions where generation_id = g1.id and type = 'generation'), -8,
    'generation ledger entry');

  -- Failure charges nothing --------------------------------------------------
  r := public.fail_generation(g2.id, 'model error');
  perform pg_temp.assert_eq(r.status, 'failed', 'fail marks failed');
  perform pg_temp.assert_eq((select credits from public.users where id = alice), 12, 'failure charges nothing');
  perform pg_temp.assert_eq((select reserved_credits from public.users where id = alice), 0, 'failure releases reservation');
  perform pg_temp.assert_eq(
    (select count(*)::int from public.credit_transactions where generation_id = g2.id and type = 'refund'), 1,
    'refund ledger entry');
  r := public.fail_generation(g2.id, 'again');
  perform pg_temp.assert_eq(r.id, null::uuid, 'fail is idempotent');
  r := public.complete_generation(g2.id, 'late', 'late');
  perform pg_temp.assert_eq(r.id, null::uuid, 'cannot complete a failed job');

  -- Concurrency cap ----------------------------------------------------------
  g3 := public.create_generation(bob, 'text', 'a', 'a', 'wan-2.7', '{}', 4, 2);
  perform public.create_generation(bob, 'text', 'b', 'b', 'wan-2.7', '{}', 4, 2);
  begin
    perform public.create_generation(bob, 'text', 'c', 'c', 'wan-2.7', '{}', 4, 2);
    raise exception 'FAIL: expected too_many_active_jobs';
  exception when others then
    err := sqlerrm;
  end;
  perform pg_temp.assert_eq(err, 'too_many_active_jobs', 'active job cap enforced');

  -- Purchases are idempotent per Stripe session ------------------------------
  bal := public.add_credits(bob, 50, 'purchase', 'cs_test_123', 'Starter pack');
  perform pg_temp.assert_eq(bal, 70, 'purchase adds credits');
  bal := public.add_credits(bob, 50, 'purchase', 'cs_test_123', 'Starter pack');
  perform pg_temp.assert_eq(bal, null::integer, 'duplicate webhook ignored');
  perform pg_temp.assert_eq((select credits from public.users where id = bob), 70, 'balance unchanged by duplicate');

  -- Rate limit ---------------------------------------------------------------
  perform pg_temp.assert_eq(public.check_rate_limit('gen:test', 60, 2), true, 'rate limit hit 1 allowed');
  perform pg_temp.assert_eq(public.check_rate_limit('gen:test', 60, 2), true, 'rate limit hit 2 allowed');
  perform pg_temp.assert_eq(public.check_rate_limit('gen:test', 60, 2), false, 'rate limit hit 3 blocked');
end $$;

-- RLS: users only see their own rows; RPCs are not callable by end users ------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  perform pg_temp.assert_eq((select count(*)::int from public.users), 1, 'RLS: user sees only own profile');
  perform pg_temp.assert_eq(
    (select count(*)::int from public.generations where user_id <> auth.uid()), 0, 'RLS: no foreign generations');
  perform pg_temp.assert_eq((select count(*)::int from public.templates), 6, 'RLS: templates are public');
  begin
    perform public.add_credits(auth.uid(), 1000, 'purchase', null, 'free money');
    raise exception 'FAIL: authenticated user could call add_credits';
  exception when insufficient_privilege then
    raise notice 'ok - RLS: add_credits not callable by users';
  end;
  begin
    update public.users set credits = 9999 where id = auth.uid();
    if (select credits from public.users where id = auth.uid()) = 9999 then
      raise exception 'FAIL: user could edit own credits';
    end if;
    raise notice 'ok - RLS: users cannot edit credits';
  exception when insufficient_privilege then
    raise notice 'ok - RLS: users cannot edit credits';
  end;
end $$;
reset role;
