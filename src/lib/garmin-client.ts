import { GarminConnect } from "garmin-connect";

let client: InstanceType<typeof GarminConnect> | null = null;
let isLoggedIn = false;

export async function getGarminClient(): Promise<
  InstanceType<typeof GarminConnect>
> {
  const username = process.env.GARMIN_USERNAME;
  const password = process.env.GARMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "GARMIN_USERNAME and GARMIN_PASSWORD must be set in .env.local"
    );
  }

  if (client && isLoggedIn) {
    return client;
  }

  client = new GarminConnect({ username, password });
  await client.login();
  isLoggedIn = true;

  return client;
}
