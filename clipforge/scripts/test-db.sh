#!/usr/bin/env bash
# Spins up a throwaway local Postgres, applies the migration + seed, and runs
# scripts/db/tests.sql. Requires Postgres binaries (initdb, pg_ctl, psql).
set -euo pipefail
cd "$(dirname "$0")/.."

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
export PATH="$PGBIN:$PATH"
DATA="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
SOCK="$DATA"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DATA"
  RUN_AS=(runuser -u postgres --)
fi

cleanup() { "${RUN_AS[@]}" pg_ctl -D "$DATA/pg" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

"${RUN_AS[@]}" initdb -D "$DATA/pg" -U postgres -A trust >/dev/null
"${RUN_AS[@]}" pg_ctl -D "$DATA/pg" -o "-p $PORT -k $SOCK -c listen_addresses=''" -l "$DATA/pg.log" start >/dev/null

PSQL=("${RUN_AS[@]}" psql -h "$SOCK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f scripts/db/supabase-stubs.sql
"${PSQL[@]}" -f supabase/migrations/0001_init.sql
"${PSQL[@]}" -f supabase/seed.sql
"${PSQL[@]}" -f scripts/db/tests.sql
echo "✅ SQL tests passed"

# Integration tests: real route handlers against this database (fal.ai mocked).
DATABASE_URL="postgresql://postgres@localhost/postgres?host=$SOCK&port=$PORT" npx vitest run tests/integration
echo "✅ integration tests passed"
