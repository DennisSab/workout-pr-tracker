# Security follow-up

WorkoutPR V2 foundation improves data integrity but does not make the application production-secure.

- API routes are still unauthenticated. Workout, set, and exercise reads and mutations need authentication and per-user authorization before the application can safely serve multiple users.
- `lib/prisma.ts` currently configures PostgreSQL with `ssl.rejectUnauthorized: false`. Replace this with verified TLS using the database provider's CA certificate in a separate, deployment-coordinated task. Do not weaken TLS settings further.
- No database backup could be verified from repository artifacts during the V2 foundation work. Verify a restorable backup before any database-changing maintenance, migration, or production-data operation.
- Workout creation still uses the existing `findFirst()` user behavior to preserve current functionality. Authentication work must replace this with the authenticated user's identity rather than a hardcoded ID.
