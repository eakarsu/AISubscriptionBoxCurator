# Subscription Box Curator operations

## Supported operating boundary

The governed path covers inventory-scoped order, price/payment reconciliation, staff approval, fulfillment provider queueing, receipt feedback, partial fulfillment, refund, and recovery. Provider names are typed adapter contracts, not a claim that a live third-party account is connected. Keep outbound execution disabled until each configured payment, tax, inventory, scheduling, messaging, accounting, delivery, Shippo, ShipStation, and partner portals adapter has passed sandbox contract tests and receipt reconciliation.

Generated feature and gap routes remain quarantined unless `ENABLE_GENERATED_FEATURES=true` is deliberately set in a development environment. The governed workflow never makes an autonomous consequential commitment.

## Configuration and deployment

1. Install backend and frontend dependencies explicitly in their respective directories.
2. Copy `.env.example` to `.env`; set a PostgreSQL `DATABASE_URL`, a unique `GOVERNANCE_TENANT_ID`, and a random `JWT_SECRET` of at least 32 characters. Store real provider credentials in a secret manager and pass only secret references in workflow payloads.
3. Run `./start.sh check`.
4. Review every SQL file, take a database backup, set `ALLOW_SCHEMA_MIGRATION=1`, and run `./start.sh migrate`. Migration is never part of application startup.
5. Run `./start.sh start`. The launcher starts only this repository's API and UI and stops only the child processes it owns.

Deploy migrations before application instances. Roll back application code independently; database changes are additive. Do not run destructive seed scripts against shared or production databases.

## Governed request lifecycle

- Authenticate with a signed HS256 token containing actor, tenant, role, and subject scopes.
- Create a subject-scoped work item under `/api/governance` with a unique `Idempotency-Key` and complete versioned provenance.
- Integration workers record each successful or failed inbound batch at `/api/governance/connectors/:provider/checkpoint` with capture time, source version, bounded error code, counts, cursor, and a unique idempotency key. Immutable connector events prevent duplicate counter advancement during replay.
- Submit the current version, then obtain a decision from an authorized reviewer who is not the creator.
- Queue only allow-listed provider operations from an approved item. Workers claim an outbox row with a lease token, persist a typed provider receipt, and retry transient failures with the same idempotency key and a bounded non-secret error code.
- Failed deliveries move to dead letter after the bounded retry limit. Reconciliation and historical validation evidence remain attached to immutable events.

## Failure and recovery

On stale or duplicate telemetry/feed input, validation failure, provider timeout, ambiguous receipt, or policy mismatch, stop outbound execution and move the domain job to its explicit failure or manual-recovery state. Inspect immutable work-item events and the outbox receipt/error fields, correct the authoritative source or adapter, then retry with the original provider idempotency key. Never create a second external command to work around an uncertain receipt.

For an erasure request, queue deletion operations for every applicable provider and mark erasure complete only after all deletion receipts are recorded. Preserve only the minimal immutable audit evidence allowed by policy.

## Verification

Run:

```sh
node --test backend/src/governance/tests/*.test.js
bash -n start.sh
./start.sh check
```

The workflow tests use versioned fixtures and require expected error classes, independent approval, tenant/subject isolation, idempotent replay, outbox retry/dead-letter behavior, and prohibited secret/provenance failures.

## Demo data

Destructive seeding is separate from startup. Use only an isolated disposable database and supply credentials through the environment:

```sh
cd backend
ALLOW_DESTRUCTIVE_SEED=1 SEED_ADMIN_EMAIL='<operator-owned-address>' SEED_ADMIN_PASSWORD='<secret-manager-value>' npm run seed
```

The seed command refuses to run without the opt-in flag, database URL, and a password of at least 12 characters.
