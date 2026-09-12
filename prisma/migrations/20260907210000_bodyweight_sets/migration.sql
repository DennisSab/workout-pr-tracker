BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE "WorkoutSet" ALTER COLUMN "weight" DROP NOT NULL;
COMMIT;
