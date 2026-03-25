import { env } from "@github_fin/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema/index.js";

const client = createClient({
  url: env.DATABASE_URL,
});

export const db = drizzle({ client, schema });
