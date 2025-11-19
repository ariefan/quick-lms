/**
 * Database Connection
 *
 * Initializes libsql client and Drizzle ORM instance
 * Supports both local SQLite files and remote Turso databases
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:./local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
