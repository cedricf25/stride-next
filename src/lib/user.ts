"use server";

import { prisma } from "@/lib/prisma";

export async function getOrCreateUser() {
  const garminUsername = process.env.GARMIN_USERNAME;
  if (!garminUsername) {
    throw new Error("GARMIN_USERNAME must be set");
  }

  return prisma.user.upsert({
    where: { garminUsername },
    update: {},
    create: {
      garminUsername,
      displayName: garminUsername.split("@")[0],
    },
  });
}
