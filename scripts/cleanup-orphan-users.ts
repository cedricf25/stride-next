import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Charger .env.local
config({ path: ".env.local" });

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Trouver les utilisateurs sans Account
  const orphanUsers = await prisma.user.findMany({
    where: {
      accounts: {
        none: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (orphanUsers.length === 0) {
    console.log("Aucun utilisateur orphelin trouvé.");
    return;
  }

  console.log("Utilisateurs orphelins (sans Account) :");
  orphanUsers.forEach((u) => {
    console.log(`  - ${u.email} (${u.name ?? "sans nom"}) [${u.id}]`);
  });

  // Supprimer les données liées puis les utilisateurs orphelins
  for (const user of orphanUsers) {
    console.log(`\nSuppression des données de ${user.email}...`);

    // Supprimer dans l'ordre des dépendances
    await prisma.activityAnalysis.deleteMany({
      where: { activity: { userId: user.id } },
    });
    await prisma.activitySplit.deleteMany({
      where: { activity: { userId: user.id } },
    });
    await prisma.activity.deleteMany({ where: { userId: user.id } });
    await prisma.sleepRecord.deleteMany({ where: { userId: user.id } });
    await prisma.healthMetric.deleteMany({ where: { userId: user.id } });
    await prisma.trainingSession.deleteMany({
      where: { week: { plan: { userId: user.id } } },
    });
    await prisma.trainingWeek.deleteMany({
      where: { plan: { userId: user.id } },
    });
    await prisma.trainingPlan.deleteMany({ where: { userId: user.id } });
    await prisma.racePredictionBatch.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });

    console.log(`  ✓ Utilisateur ${user.email} supprimé`);
  }

  console.log(`\n${orphanUsers.length} utilisateur(s) orphelin(s) supprimé(s).`);
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
