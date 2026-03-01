"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGarminClientForUser } from "@/lib/garmin-client";

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Récupère un client Garmin Connect pour l'utilisateur authentifié.
 * Redirige vers les paramètres si les credentials ne sont pas configurés.
 */
export async function getAuthenticatedGarminClient() {
  const user = await getAuthenticatedUser();

  if (!user.garminUsername || !user.garminPassword) {
    throw new Error("GARMIN_NOT_CONFIGURED");
  }

  const client = await getGarminClientForUser(user.id, {
    username: user.garminUsername,
    password: user.garminPassword,
  });

  return { user, client };
}
