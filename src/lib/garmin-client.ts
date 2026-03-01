import { GarminConnect } from "garmin-connect";

// Cache des clients par userId
const clientCache = new Map<string, { client: InstanceType<typeof GarminConnect>; loggedIn: boolean }>();

export interface GarminCredentials {
  username: string;
  password: string;
}

/**
 * Récupère un client Garmin Connect pour un utilisateur donné.
 * Le client est mis en cache par userId pour éviter les reconnexions multiples.
 */
export async function getGarminClientForUser(
  userId: string,
  credentials: GarminCredentials
): Promise<InstanceType<typeof GarminConnect>> {
  const cached = clientCache.get(userId);

  if (cached && cached.loggedIn) {
    return cached.client;
  }

  const client = new GarminConnect({
    username: credentials.username,
    password: credentials.password,
  });

  await client.login();

  clientCache.set(userId, { client, loggedIn: true });

  return client;
}

/**
 * Invalide le cache du client Garmin pour un utilisateur.
 * À appeler si les credentials changent.
 */
export function invalidateGarminClient(userId: string): void {
  clientCache.delete(userId);
}

/**
 * @deprecated Utiliser getGarminClientForUser avec les credentials de l'utilisateur.
 * Cette fonction est conservée pour la rétrocompatibilité temporaire.
 */
export async function getGarminClient(): Promise<InstanceType<typeof GarminConnect>> {
  const username = process.env.GARMIN_USERNAME;
  const password = process.env.GARMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "GARMIN_USERNAME and GARMIN_PASSWORD must be set in .env.local or configure Garmin credentials in Settings"
    );
  }

  // Utiliser un userId fixe pour l'ancien comportement
  return getGarminClientForUser("__env__", { username, password });
}
