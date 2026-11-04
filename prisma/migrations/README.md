# Bodyweight support

`0_baseline` records the existing public database schema before nullable weights.
For the existing Supabase database, it was historically marked applied with
`prisma migrate resolve --applied 0_baseline`; its CREATE statements must not
be executed there. There is no supported production migration command in this
repository. Follow `docs/database-environments.md` and verify a backup/restore
before any future production work.
On a new empty database, Prisma can apply the baseline normally.

`20260907210000_bodyweight_sets` only drops NOT NULL from WorkoutSet.weight.
It runs in a transaction with short lock/statement timeouts and preserves all
rows and numeric weights. It imports no workouts. On the separate, empty
development project, deploy with `npm run db:migrate:deploy:dev`. Do not use
migrate reset or migrate dev against production.

Prisma migrations use the Supabase session pooler on port 5432. The migration
invocation sets this in memory, without changing the app's environment files
or exposing credentials. Transaction-pooler introspection stalled even with
pgbouncer compatibility enabled.

The baseline was introspected from the live database. Pre-existing differences
from schema.prisma (Workout.date nullability/precision and foreign-key actions)
are preserved; this migration intentionally only changes WorkoutSet.weight.

Null means bodyweight. Existing positive numeric weights retain their meaning.
Reinstating NOT NULL after bodyweight rows exist is not a safe automatic rollback;
do not convert nulls to zero to reverse this migration.
