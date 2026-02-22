import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const garminUsername = process.env.GARMIN_USERNAME;
  if (!garminUsername) {
    throw new Error("GARMIN_USERNAME must be set");
  }

  const email = garminUsername;
  const name = garminUsername.split("@")[0];

  const user = await prisma.user.upsert({
    where: { email },
    update: { garminUsername },
    create: {
      email,
      name,
      garminUsername,
      displayName: name,
    },
  });

  console.log(`User seeded: ${user.name ?? user.displayName} (${user.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
