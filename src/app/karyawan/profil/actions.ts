"use server";

import { compare, hash } from "bcryptjs";
import { db } from "@/lib/db";
import { wajibLogin } from "@/lib/session";
import { gantiPasswordSkema } from "@/lib/akun";

export type HasilPassword = { ok: boolean; pesan: string } | undefined;

export async function gantiPassword(
  _sebelumnya: HasilPassword,
  formData: FormData,
): Promise<HasilPassword> {
  const sesi = await wajibLogin();
  const parsed = gantiPasswordSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { id: sesi.id },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return {
      ok: false,
      pesan: "Akun ini belum memiliki password lokal. Hubungi administrator.",
    };
  }

  if (!(await compare(parsed.data.passwordLama, user.passwordHash))) {
    return { ok: false, pesan: "Password lama salah." };
  }

  await db.user.update({
    where: { id: sesi.id },
    data: { passwordHash: await hash(parsed.data.passwordBaru, 10) },
  });

  return { ok: true, pesan: "Password berhasil diubah." };
}
