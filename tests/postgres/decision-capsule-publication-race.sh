#!/usr/bin/env bash
set -euo pipefail

capsule_id='50000000-0000-4000-8000-000000000001'
user_id='10000000-0000-4000-8000-000000000001'
tmp_dir="$(mktemp -d)"
ready_file="$tmp_dir/lock-ready"
continue_file="$tmp_dir/continue-append"

# Keep the append transaction open after the append function acquires its lock.
# The marker makes sure the stale publisher starts only after that lock exists.
psql -v ON_ERROR_STOP=1 >"$tmp_dir/appender.log" 2>&1 <<SQL &
begin;
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
\\! touch $ready_file
\\! while [ ! -e $continue_file ]; do sleep 0.05; done
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

PGAPPNAME=capsule-publication-race-publisher psql -v ON_ERROR_STOP=1 >"$tmp_dir/publisher.log" 2>&1 <<SQL &
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
publisher_pid=$!

publisher_waiting=false
for attempt in {1..50}; do
  wait_state="$(psql -At -v ON_ERROR_STOP=1 -c "select exists (select 1 from pg_catalog.pg_stat_activity where application_name = 'capsule-publication-race-publisher' and wait_event_type = 'Lock' and wait_event = 'advisory')")"
  if [[ "$wait_state" == "t" ]]; then
    publisher_waiting=true
    break
  fi
  sleep 0.1
done
if [[ "$publisher_waiting" != true ]]; then
  touch "$continue_file"
  wait "$appender_pid" || true
  wait "$publisher_pid" || true
  cat "$tmp_dir/appender.log" "$tmp_dir/publisher.log"
  echo "capsule publisher did not block on the held advisory lock" >&2
  exit 1
fi

# The publisher is now known to be waiting on the same advisory lock. Allow
# the appender transaction to append and commit, then inspect the RPC result.
touch "$continue_file"
set +e
wait "$publisher_pid"
publish_status=$?
set -e

wait "$appender_pid"

if [[ $publish_status -eq 0 ]] || ! grep -Fq 'capsule_event_head_changed' "$tmp_dir/publisher.log"; then
  printf 'Expected stale publication rejection after a concurrent append. Status: %s\n' "$publish_status" >&2
  cat "$tmp_dir/appender.log" "$tmp_dir/publisher.log"
  exit 1
fi

printf 'Concurrent append advanced the event head; stale publication was rejected.\n'
