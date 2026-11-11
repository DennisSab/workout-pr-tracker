const PROJECT_REF_PATTERN = /^[a-z0-9]{8,40}$/;

function projectRefFromUrl(value, variableName) {
  if (!value) throw new Error(`${variableName} is required.`);

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} is not a valid PostgreSQL URL.`);
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  const direct = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1];
  const pooled = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]+)$/)?.[1];
  const projectRef = direct ?? pooled;
  if (!projectRef) {
    throw new Error(`${variableName} must identify a Supabase project in its host or pooler username.`);
  }
  return projectRef;
}

export function inspectDatabaseTarget(env = process.env) {
  const environment = env.DATABASE_ENV;
  if (!environment) throw new Error("DATABASE_ENV is required.");
  if (!PROJECT_REF_PATTERN.test(env.SUPABASE_PROJECT_REF ?? "")) {
    throw new Error("SUPABASE_PROJECT_REF is required and must be a project reference, not a URL.");
  }

  const runtimeProjectRef = projectRefFromUrl(env.DATABASE_URL, "DATABASE_URL");
  const directProjectRef = env.DIRECT_URL
    ? projectRefFromUrl(env.DIRECT_URL, "DIRECT_URL")
    : null;
  if (runtimeProjectRef !== env.SUPABASE_PROJECT_REF ||
      (directProjectRef && directProjectRef !== env.SUPABASE_PROJECT_REF)) {
    throw new Error("Database URL project identity does not match SUPABASE_PROJECT_REF.");
  }

  return {
    environment,
    projectRef: env.SUPABASE_PROJECT_REF,
    runtimeAndDirectTargetsMatch: directProjectRef === null || directProjectRef === runtimeProjectRef,
  };
}

export function assertDevelopmentDatabaseTarget(env = process.env) {
  const identity = inspectDatabaseTarget(env);
  if (identity.environment !== "development") {
    throw new Error("Refusing database write: DATABASE_ENV must be exactly 'development'.");
  }
  return identity;
}
