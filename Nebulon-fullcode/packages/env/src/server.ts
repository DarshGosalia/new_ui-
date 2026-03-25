import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Support running server from monorepo root or from apps/server directly.
const envPaths = [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "apps/server/.env")];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  }
}

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    GROQ_API_KEY: z.string().min(1).optional(),
    GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
