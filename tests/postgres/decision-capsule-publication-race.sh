#!/usr/bin/env bash
set -euo pipefail

capsule_id='50000000-0000-4000-8000-000000000001'
user_id='10000000-0000-4000-8000-000000000001'
tmp_dir="$(mktemp -d)"
ready_file="$tmp_dir/lock-ready"

# Hold the same transaction lock as the append and publisher while the event
# is added. The marker makes sure the stale publisher starts only after the
# append session owns the lock.
psql -v ON_ERROR_STOP=1 >"$tmp_dir/appender.log" 2>&1 <<SQL &
begin;
select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('$capsule_id'::text, 0));
\\! touch $ready_file
select pg_catalog.pg_sleep(1);
select public.append_decision_capsule_event(
  '$capsule_id',
  '30000000-0000-4000-8000-000000000005',
  3,
  'forecast',
  '40000000-0000-4000-8000-000000000005',
  null,
  '{"instrument":{"type":"us_equity","symbol":"NVDA"},"referencePrice":106,"referenceSourceUrl":"https://prices.example/nvda","referenceSourceTimestamp":"2026-12-01T00:00:00Z","referenceReportedBy":"user","direction":"up","thresholdPercent":5,"horizonAt":"2026-12-02T00:00:00Z"}'::jsonb,
  repeat('c', 64),
  repeat('d', 64),
  '2026-12-01T00:02:00Z'
);
commit;
SQL
appender_pid=$!

for attempt in {1..50}; do
  [[ -f "$ready_file" ]] && break
  sleep 0.1
done
if [[ ! -f "$ready_file" ]]; then
  cat "$tmp_dir/appender.log"
  echo "capsule appender did not acquire its advisory lock" >&2
  exit 1
fi

set +e
publish_output="$(psql -v ON_ERROR_STOP=1 2>&1 <<SQL
set role service_role;
select public.publish_decision_capsule_publication(
  '$capsule_id',
  '$user_id',
  2,
  repeat('c', 64),
  repeat('f', 64),
  '{"schemaVersion":1}'::jsonb,
  repeat('e', 64)
);
SQL
)"
publish_status=$?
set -e

wait "$appender_pid"

if [[ $publish_status -eq 0 ]] || ! grep -Fq 'capsule_event_head_changed' <<<"$publish_output"; then
  printf 'Expected stale publication rejection after a concurrent append. Status: %s\n%s\n' "$publish_status" "$publish_output" >&2
  exit 1
fi

printf 'Concurrent append advanced the event head; stale publication was rejected.\n'
