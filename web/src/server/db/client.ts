import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

if (!env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Drizzle client will not be initialized.");
}

const queryClient = env.DATABASE_URL
  ? postgres(env.DATABASE_URL, {
      max: 1,
      ssl: env.DATABASE_URL.includes("sslmode=") ? undefined : "require",
    })
  : null;

export const db = queryClient ? drizzle(queryClient, { schema }) : null;
