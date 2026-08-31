import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { AKSES_DEFAULT, ROLE } from "../src/lib/domain";
import { keMenit } from "../src/lib/waktu";

const db = new PrismaClient();

function wajib(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Environment ${name} wajib diisi.`);
  return value;
}

async function main() {
  const email = wajib("SEED_ADMIN_EMAIL").toLowerCase();
  const username = (process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase() || "owner")
    .replace(/[^a-z0-9._-]/g, "");
  const password = wajib("SEED_ADMIN_PASSWORD");
  if (password.length < 12) throw new Error("SEED_ADMIN_PASSWORD minimal 12 karakter.");
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Owner iNox";

  // Seed production tidak membuat cabang/demo user agar data production aman.
  await db.shift.upsert({
    where: { nama: "Pagi" },
    update: { mulaiMenit: keMenit("09.00")!, selesaiMenit: keMenit("17.00")!, toleransiMenit: 10 },
    create: { nama: "Pagi", mulaiMenit: keMenit("09.00")!, selesaiMenit: keMenit("17.00")!, toleransiMenit: 10 },
  });
  await db.shift.upsert({
    where: { nama: "Siang" },
    update: { mulaiMenit: keMenit("14.00")!, selesaiMenit: keMenit("22.00")!, toleransiMenit: 10 },
    create: { nama: "Siang", mulaiMenit: keMenit("14.00")!, selesaiMenit: keMenit("22.00")!, toleransiMenit: 10 },
  });

  const user = await db.user.upsert({
    where: { email },
    update: { name, username, role: "super_admin", aktif: true, passwordHash: await hash(password, 12) },
    create: {
      name,
      email,
      username,
      role: "super_admin",
      jabatan: "Owner",
      tanggalMasuk: new Date().toISOString().slice(0, 10),
      passwordHash: await hash(password, 12),
      aktif: true,
    },
  });

  await db.rolePermission.deleteMany();
  await db.rolePermission.createMany({
    data: ROLE.flatMap((role) => AKSES_DEFAULT[role].map((menu) => ({ role, menu }))),
  });

  console.log(`Production seed selesai untuk ${user.email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
