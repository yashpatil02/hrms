const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Admin@1912", 10);

  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@hrms.com",
      password: hash,
      role: "ADMIN",
    },
  });

  console.log("Super Admin created");
}

main();
