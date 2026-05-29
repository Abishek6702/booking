import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const email = "admin@travelmate.com";
  const password = "Admin@1234";
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Upgrade to ADMIN if already exists
    await prisma.user.update({
      where: { email },
      data: { role: UserRole.ADMIN, isVerified: true },
    });
    console.log("✅ Existing user upgraded to ADMIN:", email);
  } else {
    await prisma.user.create({
      data: {
        email,
        name: "Platform Admin",
        passwordHash,
        role: UserRole.ADMIN,
        isVerified: true,
      },
    });
    console.log("✅ Admin user created:", email);
  }

  console.log("📧 Email   :", email);
  console.log("🔑 Password:", password);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
