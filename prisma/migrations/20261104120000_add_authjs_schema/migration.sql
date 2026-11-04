BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Add nullable identity fields so existing users remain valid.
ALTER TABLE "public"."User"
ADD COLUMN "email" TEXT,
ADD COLUMN "emailVerified" TIMESTAMP(3),
ADD COLUMN "image" TEXT,
ADD COLUMN "name" TEXT;

-- Store OAuth/OIDC accounts linked to WorkoutPR users.
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- Store revocable database sessions linked to WorkoutPR users.
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Store one-time verification tokens for adapter-compatible auth flows.
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key"
ON "public"."Account"("provider", "providerAccountId");

CREATE UNIQUE INDEX "Session_sessionToken_key"
ON "public"."Session"("sessionToken");

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key"
ON "public"."VerificationToken"("identifier", "token");

CREATE UNIQUE INDEX "User_email_key"
ON "public"."User"("email");

ALTER TABLE "public"."Account"
ADD CONSTRAINT "Account_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Session"
ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
