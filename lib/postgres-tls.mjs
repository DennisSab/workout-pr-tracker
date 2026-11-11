import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TLS_QUERY_PARAMETERS = ["sslmode", "sslrootcert", "sslcert", "sslkey"];

function readCertificate(env) {
  const inlineCertificate = env.SUPABASE_DB_CA_CERT?.trim();
  const certificatePath = env.SUPABASE_DB_CA_CERT_PATH?.trim();

  if (inlineCertificate && certificatePath) {
    throw new Error(
      "Set only one of SUPABASE_DB_CA_CERT or SUPABASE_DB_CA_CERT_PATH."
    );
  }

  if (!inlineCertificate && !certificatePath) {
    throw new Error(
      "A Supabase database CA certificate is required for verified TLS."
    );
  }

  const certificate =
    inlineCertificate ?? readFileSync(resolve(certificatePath), "utf8");

  try {
    new X509Certificate(certificate);
  } catch {
    throw new Error(
      "The configured Supabase database CA certificate is not valid PEM."
    );
  }

  return certificate;
}

function parseConnectionString(connectionString, variableName) {
  if (!connectionString) throw new Error(`${variableName} is required.`);

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  const conflictingParameter = TLS_QUERY_PARAMETERS.find((name) =>
    url.searchParams.has(name)
  );
  if (conflictingParameter) {
    throw new Error(
      `${variableName} must not contain ${conflictingParameter}; TLS is configured separately.`
    );
  }

  return url;
}

export function verifiedPostgresConfig(
  connectionString,
  { env = process.env, variableName = "DATABASE_URL" } = {}
) {
  parseConnectionString(connectionString, variableName);

  return {
    connectionString,
    ssl: {
      ca: readCertificate(env),
      rejectUnauthorized: true,
    },
  };
}

export function verifiedPrismaConnectionString(
  connectionString,
  { env = process.env, variableName = "DIRECT_URL" } = {}
) {
  const url = parseConnectionString(connectionString, variableName);
  const certificatePath = env.SUPABASE_DB_CA_CERT_PATH?.trim();

  url.searchParams.set("sslmode", "verify-full");
  if (certificatePath) {
    // Read and validate the same certificate before giving its path to Prisma.
    readCertificate({ ...env, SUPABASE_DB_CA_CERT: undefined });
    url.searchParams.set("sslrootcert", resolve(certificatePath));
  }
  return url.toString();
}
