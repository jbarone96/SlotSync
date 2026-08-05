import bcrypt from "bcrypt";
import "dotenv/config";
import { prisma } from "./db";

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const host = await prisma.host.upsert({
    where: { username: "jordan" },
    update: {},
    create: {
      username: "jordan",
      email: "jordan@example.com",
      passwordHash,
      slotDurationMins: 30,
      timezone: "America/New_York",
      availability: {
        mon: [["09:00", "17:00"]],
        tue: [["09:00", "17:00"]],
        wed: [["09:00", "17:00"]],
        thu: [["09:00", "17:00"]],
        fri: [["09:00", "13:00"]],
      },
    },
  });

  console.log(`Seeded host: ${host.username} (login: jordan@example.com / demo1234)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());