# Database environments and safety

## Current audit (2026-11-03)

No database connection was made during this audit. Secret values were neither printed nor copied.

- The ignored root `.env` exists and defines `DATABASE_URL`. It does not define `DIRECT_URL`, `DATABASE_ENV`, or `SUPABASE_PROJECT_REF`. Its value was not displayed or used, so its target remains unverified.
- No `.env.local`, `.env.development*`, or `.env.production*` file exists in the working tree. `.gitignore` ignores `.env*`; `.env.example` is now the explicit placeholder-only exception.
- The server runtime reads only `process.env.DATABASE_URL` in `lib/prisma.ts`. No Supabase API URL/key variables are used by application code.
- Prisma 7 gets its datasource in `prisma.config.ts`; the schema deliberately has no URL. The config now prefers `DIRECT_URL`, falling back to `DATABASE_URL`.
- The app's `build` script runs `prisma generate` only. There was no package script for migration, push, reset, or seed. The historical import and exercise-catalog scripts contain opt-in write modes; those modes are now development-guarded.
- Vercel settings were not inspected or changed. The production target and backup status are therefore unknown.

## Environment loading and precedence

Next.js loads each variable from the first place where it is found:

1. the invoking process environment
2. `.env.$NODE_ENV.local`
3. `.env.local` (except under `NODE_ENV=test`)
4. `.env.$NODE_ENV`
5. `.env`

`next dev` defaults `NODE_ENV` to `development`; other Next commands default it to `production`. These rules come from the documentation bundled with the installed Next.js 16.2.7.

Prisma CLI does not inherently use Next.js's loader. This repository's `prisma.config.ts` explicitly calls `loadEnvConfig(process.cwd(), true)`, so supported local Prisma commands use the **development** order above. An already exported shell variable still wins. The maintenance scripts do the same. This is intentionally different from `next build`, which uses the production profile. Vercel injects its selected environment variables into `process.env`, so those take priority during its build and runtime.

Do not keep database credentials in `.env`. After separation, remove that file or remove its database keys so it cannot silently act as the lowest-priority fallback. Put local development credentials in ignored `.env.local` only.

## Required layout

Local `.env.local` (separate development Supabase project only):

```dotenv
DATABASE_ENV=development
SUPABASE_PROJECT_REF=the-development-project-ref
DATABASE_URL=the-development-runtime-pooler-url
DIRECT_URL=the-development-direct-or-session-pooler-url
SUPABASE_DB_CA_CERT_PATH=/absolute/path/to/the-dashboard-downloaded-ca.crt
```

- Use the transaction pooler URL for the application `DATABASE_URL` when appropriate for the deployed/runtime adapter.
- Use the direct connection URL for `DIRECT_URL`; if the network cannot reach Supabase's direct IPv6 endpoint, use the session pooler on port 5432.
- Download the public database CA from Supabase Dashboard > Database Settings >
  SSL Configuration. Local Prisma CLI commands use
  `SUPABASE_DB_CA_CERT_PATH`; deployed application runtimes may use the full
  PEM in `SUPABASE_DB_CA_CERT` instead. Do not add `sslmode` or certificate
  parameters to the base URLs because node-postgres would replace the verified
  TLS object.
- Confirm that both URLs belong to the declared development project. Never copy production rows into development.

Production credentials belong only in Vercel Project Settings > Environment Variables, scoped to **Production**: `DATABASE_ENV=production`, the production `SUPABASE_PROJECT_REF`, `DATABASE_URL`, `DIRECT_URL`, and the complete public CA PEM in `SUPABASE_DB_CA_CERT`. Preview deployments should get an isolated non-production database and its corresponding CA, not production credentials. Do not create `.env.production` or `.env.production.local` with production secrets on developer machines.

## Read-only identity verification

First compare the project reference shown in Supabase Dashboard > Project Settings with `SUPABASE_PROJECT_REF`. Then run:

```bash
npm run db:identify
```

The script validates that the project reference encoded by both configured URLs matches `SUPABASE_PROJECT_REF`, opens `DIRECT_URL` (or the runtime URL as fallback), starts a `READ ONLY` transaction, and reports only:

- the declared environment and project reference;
- whether runtime and direct targets match;
- PostgreSQL's database name, role name, and read-only transaction state.

It does not print URLs/passwords or inspect application records. It does make a read-only connection, so run it only after intentionally configuring the target. This audit did **not** run it.

## Guarded database commands

Use only these project commands:

```bash
npm run db:migrate:dev
npm run db:migrate:deploy:dev
npm run db:push:dev
npm run db:reset:dev
npm run db:seed:dev
```

Before Prisma starts, each command requires:

- `DATABASE_ENV` to equal `development` exactly;
- a syntactically valid `SUPABASE_PROJECT_REF`;
- `DATABASE_URL` and, when set, `DIRECT_URL` to encode that same project reference.

The apply modes in `import-historical-workouts.mjs` and `sync-exercise-catalog.mjs` use the same guard. Read-only preview modes remain available.

`npm run dev` also runs the identity guard before Next.js starts. Until a separate development project is configured, local development intentionally fails closed rather than risking application writes to production. This guard checks configuration only; it does not connect to the database.

This is defense in depth, not a universal lock. It cannot prevent direct `npx prisma`, `psql`, Supabase SQL Editor, application code, or a deliberately altered environment/script. Access control, separate projects, least-privilege credentials, backups, and command review remain necessary. There is intentionally no supported production migration command in `package.json`.

## Create the development project and switch local development

1. In the Supabase Dashboard, choose **New project**. Select the intended organization, name it clearly (for example `workoutpr-development`), choose a nearby region, generate a unique database password, and store it in a password manager. Do not reuse the production password.
2. Wait for provisioning. Record the new project reference from Project Settings. Do not import or clone production data.
3. In the new project's **Connect** panel, copy its runtime transaction-pooler URL and its direct URL (or session-pooler URL on port 5432 if direct IPv6 is unavailable).
4. Copy `.env.example` to ignored `.env.local`; replace placeholders with only the new development values. Set `DATABASE_ENV=development`.
5. Remove the old root `.env` database value after securely recording where it came from; do not paste it into chat, documentation, commits, or shell history.
6. Run `npm run db:identify` and verify that the printed project reference is the new development reference. Stop if anything differs.
7. Confirm a production backup and complete a restore test as described below **before** changing production schema or migration history.
8. On the empty development project only, review `prisma/migrations/README.md`, then apply migrations with `npm run db:migrate:deploy:dev`. This is a future manual database operation and was not run during this task.
9. Start the app with `npm run dev` and create disposable development-only records to validate it.
10. Separately inspect Vercel's Production variables and confirm they identify the existing production project. Do not change them as part of the local switch. Configure Preview variables only after choosing an isolated preview database policy.

## Production backup and tested restore runbook

Status: **no production backup or restore has been verified**. First determine the production project's Supabase plan in Billing and inspect Database > Backups.

Supabase currently documents automatic daily backups for Pro, Team, and Enterprise projects, retained for 7, 14, and up to 30 days respectively. Free projects have no guaranteed automatic backups and should be exported regularly. PITR is a paid add-on and replaces daily backups while enabled. Database backups do not contain Storage API objects, and custom login-role passwords are not present in daily backups. See [Supabase database backups](https://supabase.com/docs/guides/platform/backups) and the [Free plan backup note](https://supabase.com/kb/faqs/platform/free-plan-backups).

Before any production migration:

1. In Database > Backups, record the plan, backup type, latest recovery point, retention, and whether the UI offers restore/download. A visible recovery point is not a tested restore.
2. Create an encrypted, access-controlled, off-site logical export using Supabase's documented `supabase db dump` sequence for roles, schema, and data. Supply the connection string through a protected local environment variable or prompt; never put it in a committed command/file or CI log. Follow [Backup and Restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Record timestamps, CLI/Postgres versions, file sizes, and cryptographic checksums.
3. Include a separate export of migration history if it must be preserved. Back up Storage objects separately if the product begins using Supabase Storage; a database dump contains metadata, not the objects.
4. Test restoration into a new, isolated **restore-test** Supabase project—not development and never the live production project. Restrict access because the restore contains production data. Match required extensions/settings, restore roles/schema/data using the official single-transaction procedure, and capture errors.
5. Validate schema, migration history, table row counts, key constraints, and a small set of non-sensitive aggregate checks. Run the app against the restore only in a controlled environment. Do not send email/webhooks or other external side effects.
6. Record the restore date, source backup checksum, target project reference, operator, validation results, elapsed time (RTO), and latest represented transaction/time (RPO). A backup is considered verified only after this succeeds.
7. Securely destroy the restore-test project and any plaintext exports according to the retention policy. Keep the encrypted backup and restore report in approved storage.

Dashboard physical-backup restores and PITR can be suitable on eligible paid plans, but also test the actual recovery path offered by the project's plan. Logical restores have Supabase-specific caveats for managed schemas, extensions, custom roles, Vault/encryption, Realtime publications, and Storage; follow the current official guide rather than treating a successful dump command as proof of recoverability.
