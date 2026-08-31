import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function dasarUsername(email: string) {
  return (
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "") || "user"
  ).slice(0, 26);
}

async function main() {
  const users = await db.user.findMany({
    where: { username: null },
    select: { id: true, email: true },
  });

  const terpakai = new Set(
    (
      await db.user.findMany({
        where: { username: { not: null } },
        select: { username: true },
      })
    ).flatMap((u) => (u.username ? [u.username] : [])),
  );

  for (const user of users) {
    const dasar = dasarUsername(user.email);
    let username = dasar;
    let urutan = 2;
    while (terpakai.has(username)) {
      username = `${dasar}.${urutan++}`;
    }
    terpakai.add(username);
    await db.user.update({ where: { id: user.id }, data: { username } });
  }

  console.log(`${users.length} username akun lama dibuat.`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
