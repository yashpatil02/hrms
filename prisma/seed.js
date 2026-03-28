import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Check karo admin already exist toh nahi karta
  const existing = await prisma.user.findUnique({
    where: { email: "admin@hrms.com" },
  });

  if (existing) {
    console.log("✅ Admin already exists — skipping seed");
    return;
  }

  const hash = await bcrypt.hash("Admin@1912", 10);

  await prisma.user.create({
    data: {
      name:     "Super Admin",
      email:    "admin@hrms.com",
      password: hash,
      role:     "ADMIN",
    },
  });

  console.log("✅ Super Admin created");
  console.log("   Email:    admin@hrms.com");
  console.log("   Password: Admin@1912");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });