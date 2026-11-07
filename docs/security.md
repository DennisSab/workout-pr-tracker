# Security follow-up

WorkoutPR V2 foundation improves data integrity but does not make the application production-secure.

- Workout, set, and exercise API routes require an Auth.js session, and workout and set reads and writes are scoped to the authenticated user. Remaining gaps: any signed-in user can add to the shared exercise catalog, state-changing requests have no explicit Origin/CSRF check, and there is no rate limiting.
- PostgreSQL connections load the Supabase CA from `SUPABASE_DB_CA_CERT` or
  `SUPABASE_DB_CA_CERT_PATH` and require certificate and hostname verification.
  Prisma CLI always uses `sslmode=verify-full`; the path form also supplies
  `sslrootcert` for Supabase's private CA. Never add `sslmode` to the base
  connection URLs or disable `rejectUnauthorized`; the shared TLS helper fails
  closed when its CA configuration is absent or invalid.
- No database backup could be verified from repository artifacts during the V2 foundation work. Verify a restorable backup before any database-changing maintenance, migration, or production-data operation.
- Workout creation uses the authenticated user's ID. Legacy production workouts are not reassigned to OAuth users automatically; any claim must be an explicit, reviewed migration rather than matching by email or `findFirst()`.
