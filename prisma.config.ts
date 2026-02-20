import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Charge .env.local en priorité pour Next.js, puis .env en fallback
config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
