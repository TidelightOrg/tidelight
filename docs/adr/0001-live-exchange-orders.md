# ADR 0001: Live exchange orders stay fail-closed

## Status

Accepted

## Context

Exchange writes are a different product from paper trading and from Bitget's demo environment. The implementation keeps those paths apart, and only an explicit deployment opt-in can open a live write.

## Decision

- Real exchange execution is disabled unless this is exactly "true". (`.env.example`)
- Demo spot orders are unchanged: they still use Bitget demo trading. (`.env.example`)
- The decision is committed; any queued notification is retried by the protected worker. (`app/api/admin/futures-live-access/route.ts`)
- This endpoint requires trade READ, the permission relevant to the spot desk. The account-assets endpoint requires a separate management permission and rejects otherwise usable dedicated trading keys. (`app/api/bitget/connection/route.ts`)
- Demo orders are Bitget virtual-funds orders (paptrading). They stay outside this switch. (`app/api/bitget/order/route.ts`)
- The committed request remains pending; the protected retry worker will deliver queued mail. (`app/api/futures/live-access/route.ts`)
- Real exchange orders stay disabled unless an operator explicitly opts a deployment in after the product, legal, security, and operations reviews. Paper and demo execution do not use this gate. Missing configuration fails closed: only the exact string "true" enables writes. (`lib/live-order-policy.ts`)
- Live-credential writes, and any place-order path, are exchange order effects. (`lib/live-order-policy.ts`)
- Refuse a private Bitget call that could place or prepare a live order. Demo mode is never refused here. Reads stay available so a deployment can still verify a key without sending an order. (`lib/live-order-policy.ts`)
- Read only a small preview. An oversized blocked request is still refused, without buffering it. (`lib/live-order-policy.ts`)

## Consequences

Code no longer repeats these constraints. Change the behavior only by updating this record and the implementation together. Applied migrations under `supabase/migrations/` are not rewritten.
