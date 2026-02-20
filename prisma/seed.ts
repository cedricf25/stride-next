import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const garminUsername = process.env.GARMIN_USERNAME;
  if (!garminUsername) {
    throw new Error("GARMIN_USERNAME must be set");
  }

  const user = await prisma.user.upsert({
    where: { garminUsername },
    update: {},
    create: {
      garminUsername,
      displayName: garminUsername.split("@")[0],
    },
  });

  console.log(`User seeded: ${user.displayName} (${user.id})`);
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
