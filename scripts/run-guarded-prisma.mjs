import { spawnSync } from "node:child_process";
import nextEnv from "@next/env";
import { assertDevelopmentDatabaseTarget } from "./database-safety.mjs";

const commands = {
  "migrate-dev": ["prisma", "migrate", "dev"],
  "migrate-deploy": ["prisma", "migrate", "deploy"],
  "db-push": ["prisma", "db", "push"],
  "db-reset": ["prisma", "migrate", "reset"],
  seed: ["prisma", "db", "seed"],
};

const [name, ...extraArgs] = process.argv.slice(2);
if (!Object.hasOwn(commands, name)) {
  throw new Error(`Unknown guarded Prisma command: ${name ?? "(missing)"}.`);
}

nextEnv.loadEnvConfig(process.cwd(), true);
const identity = assertDevelopmentDatabaseTarget();
console.log(`Guard passed for ${identity.environment} project ${identity.projectRef}.`);
const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", [...commands[name], ...extraArgs], {
  stdio: "inherit",
  env: process.env,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
