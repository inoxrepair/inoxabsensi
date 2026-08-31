import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const db = new PrismaClient();

function kode(nama: string) {
  return `LEGACY-${createHash("md5").update(nama).digest("hex").slice(0, 8).toUpperCase()}`;
}

async function main() {
  const jadwal = await db.jadwal.findMany({
    where: { seragam: { not: null }, seragamId: null },
    select: { id: true, seragam: true },
  });
  const cache = new Map<string, string>();

  for (const row of jadwal) {
    const nama = row.seragam?.trim();
    if (!nama) continue;
    let id = cache.get(nama);
    if (!id) {
      const master = await db.jenisSeragam.upsert({
        where: { nama },
        update: {},
        create: { kode: kode(nama), nama, aktif: true },
      });
      id = master.id;
      cache.set(nama, id);
    }
    await db.jadwal.update({ where: { id: row.id }, data: { seragamId: id } });
  }

  console.log(`${jadwal.length} jadwal lama dihubungkan ke master seragam.`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => db.$disconnect());
