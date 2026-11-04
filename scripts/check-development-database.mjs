import nextEnv from "@next/env";
import { assertDevelopmentDatabaseTarget } from "./database-safety.mjs";

nextEnv.loadEnvConfig(process.cwd(), true);
const identity = assertDevelopmentDatabaseTarget();
console.log(`Development database guard passed for project ${identity.projectRef}.`);
