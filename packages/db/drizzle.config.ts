import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local dev: apps/server/.env. Docker: DATABASE_URL from container env (.env.docker).
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: "../../apps/server/.env" });
}

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema",
});
