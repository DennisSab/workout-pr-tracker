# Bodyweight support

`0_baseline` records the existing public database schema before nullable weights.
For the existing Supabase database, it is marked applied with `prisma migrate
resolve --applied 0_baseline`; its CREATE statements must not be executed there.
On a new empty database, Prisma can apply the baseline normally.

`20260907210000_bodyweight_sets` only drops NOT NULL from WorkoutSet.weight.
It runs in a transaction with short lock/statement timeouts and preserves all
rows and numeric weights. It imports no workouts. Deploy using `prisma migrate
deploy` after the baseline is recorded. Do not use migrate reset or migrate dev
against the shared production database.

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
