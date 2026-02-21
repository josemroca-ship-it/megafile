import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      username: process.env.CAPTURADOR_USER ?? "capturador",
      password: process.env.CAPTURADOR_PASS ?? "capturador123",
      role: Role.CAPTURADOR
    },
    {
      username: process.env.ANALISTA_USER ?? "analista",
      password: process.env.ANALISTA_PASS ?? "analista123",
      role: Role.ANALISTA
    }
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: { passwordHash, role: user.role },
      create: { username: user.username, passwordHash, role: user.role }
    });
  }
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
