"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/user";
import { invalidateGarminClient, getGarminClientForUser } from "@/lib/garmin-client";

export async function saveGarminCredentials(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();

    // Valider que les credentials ne sont pas vides
    if (!username.trim() || !password.trim()) {
      return { success: false, error: "Nom d'utilisateur et mot de passe requis" };
    }

    // Tester la connexion avant de sauvegarder
    try {
      await getGarminClientForUser(`test_${user.id}`, {
        username: username.trim(),
        password,
      });
    } catch (e) {
      console.error("Garmin login test failed:", e);
      return { success: false, error: "Identifiants Garmin invalides" };
    }

    // Invalider l'ancien cache si les credentials changent
    invalidateGarminClient(user.id);

    // Sauvegarder les credentials
    await prisma.user.update({
      where: { id: user.id },
      data: {
        garminUsername: username.trim(),
        garminPassword: password,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save Garmin credentials:", error);
    return { success: false, error: "Erreur lors de la sauvegarde" };
  }
}

export async function removeGarminCredentials(): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser();

    // Invalider le cache
    invalidateGarminClient(user.id);

    // Supprimer les credentials
    await prisma.user.update({
      where: { id: user.id },
      data: {
        garminUsername: null,
        garminPassword: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to remove Garmin credentials:", error);
    return { success: false, error: "Erreur lors de la suppression" };
  }
}

export async function getGarminConnectionStatus(): Promise<{
  isConfigured: boolean;
  username: string | null;
}> {
  const user = await getAuthenticatedUser();

  return {
    isConfigured: !!user.garminUsername && !!user.garminPassword,
    username: user.garminUsername,
  };
}
