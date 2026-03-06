import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companies = ["Banco", "Aseguradora", "Gestora"];
  for (const name of companies) {
    await prisma.company.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  const users = [
    {
      username: process.env.CAPTURADOR_USER ?? "capturador",
      password: process.env.CAPTURADOR_PASS ?? "capturador123",
      role: Role.CAPTURADOR,
      companyName: "Banco"
    },
    {
      username: process.env.ANALISTA_USER ?? "analista",
      password: process.env.ANALISTA_PASS ?? "analista123",
      role: Role.ANALISTA,
      companyName: "Gestora"
    }
  ];

  for (const user of users) {
    const company = await prisma.company.findUnique({ where: { name: user.companyName } });
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { username: user.username },
      update: { passwordHash, role: user.role, companyId: company?.id ?? null },
      create: { username: user.username, passwordHash, role: user.role, companyId: company?.id ?? null }
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
