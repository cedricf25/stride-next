import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "mysql" }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "dev-secret-change-in-production",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: process.env.GOOGLE_CLIENT_ID
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},
  user: {
    additionalFields: {
      garminUsername: { type: "string", required: false, input: false },
      displayName: { type: "string", required: false, input: false },
      vo2max: { type: "number", required: false, input: false },
      weight: { type: "number", required: false, input: false },
      height: { type: "number", required: false, input: false },
      restingHR: { type: "number", required: false, input: false },
      maxHR: { type: "number", required: false, input: false },
      lastSyncAt: { type: "date", required: false, input: false },
    },
  },
});

export type Auth = typeof auth;
