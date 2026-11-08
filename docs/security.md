# Security follow-up

WorkoutPR V2 foundation improves data integrity but does not make the application production-secure.

- Workout, set, and exercise API routes require an Auth.js session, and workout and set reads and writes are scoped to the authenticated user. Remaining gaps: state-changing requests have no explicit Origin/CSRF check, and there is no rate limiting.
- The exercise catalog is shared by all users and is read-only over HTTP: `/api/exercises` exports only an authenticated `GET`, so `POST` returns 405. Catalog changes go through the reviewed preview/apply workflow in `scripts/sync-exercise-catalog.mjs`. We chose an admin-only catalog over per-user custom exercises because no UI creates exercises, and per-user rows would need a schema migration plus owner filtering on every exercise read. Revisit that if custom exercises become a product feature. `scripts/authorization.integration.test.mjs` fails if a write method is re-added to the route or any `app/`, `components/`, or `lib/` code writes to `prisma.exercise`.
- PostgreSQL connections load the Supabase CA from `SUPABASE_DB_CA_CERT` or
  `SUPABASE_DB_CA_CERT_PATH` and require certificate and hostname verification.
  Prisma CLI always uses `sslmode=verify-full`; the path form also supplies
  `sslrootcert` for Supabase's private CA. Never add `sslmode` to the base
  connection URLs or disable `rejectUnauthorized`; the shared TLS helper fails
  closed when its CA configuration is absent or invalid.
- No database backup could be verified from repository artifacts during the V2 foundation work. Verify a restorable backup before any database-changing maintenance, migration, or production-data operation.
- Workout creation uses the authenticated user's ID. Legacy production workouts are not reassigned to OAuth users automatically; any claim must be an explicit, reviewed migration rather than matching by email or `findFirst()`.
