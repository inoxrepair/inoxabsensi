"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { validasiKaryawan } from "@/lib/karyawan";
import { wajibAkses } from "@/lib/session";

export type HasilKaryawan = { ok: boolean; pesan: string };

function segarkan() {
  revalidatePath("/admin/karyawan");
  revalidatePath("/admin/jadwal");
}

export async function simpanKaryawan(
  id: string | null,
  formData: FormData,
): Promise<HasilKaryawan> {
  const admin = await wajibAkses("karyawan");
  const parsed = validasiKaryawan(Object.fromEntries(formData), id === null);
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const superAdmin = admin.role === "super_admin";

  // Admin cabang hanya boleh membuat karyawan biasa di cabangnya sendiri.
  if (!superAdmin) {
    if (data.role !== "karyawan") {
      return { ok: false, pesan: "Admin cabang hanya dapat mengelola role Karyawan." };
    }
    if (!admin.cabangId || data.cabangId !== admin.cabangId) {
      return { ok: false, pesan: "Karyawan harus berada di cabang Anda." };
    }
  }

  if (data.cabangId) {
    const cabang = await db.cabang.findUnique({
      where: { id: data.cabangId },
      select: { id: true },
    });
    if (!cabang) return { ok: false, pesan: "Cabang tidak ditemukan." };
  }

  if (id === admin.id && (!data.aktif || data.role !== admin.role)) {
    return {
      ok: false,
      pesan: "Anda tidak dapat menonaktifkan atau mengganti role akun sendiri.",
    };
  }

  if (id && !superAdmin) {
    const target = await db.user.findUnique({
      where: { id },
      select: { cabangId: true, role: true },
    });
    if (!target || target.cabangId !== admin.cabangId || target.role !== "karyawan") {
      return { ok: false, pesan: "Karyawan di luar lingkup cabang Anda." };
    }
  }

  const dasar = {
    username: data.username,
    name: data.name,
    email: data.email,
    jabatan: data.jabatan,
    tanggalMasuk: data.tanggalMasuk,
    role: data.role,
    cabangId: data.role === "super_admin" ? null : data.cabangId,
    aktif: data.aktif,
  };

  // Login lama dipakai untuk pesan: bila username/email berubah, karyawan
  // harus diberitahu karena login lamanya tidak berlaku lagi.
  const lama = id
    ? await db.user.findUnique({
        where: { id },
        select: { username: true, email: true },
      })
    : null;
  // Password hanya diganti bila reset dicentang eksplisit. Isi kolom
  // password tanpa centang (mis. terisi otomatis browser saat admin hanya
  // memindahkan cabang) diabaikan, supaya password lama tetap berlaku.
  const resetPassword = Boolean(id && data.resetPassword && data.password);

  try {
  if (id) {
      await db.user.update({
        where: { id },
        data: {
          ...dasar,
          ...(resetPassword
            ? { passwordHash: await hash(data.password, 10) }
            : {}),
        },
      });
    } else {
      await db.user.create({
        data: {
          ...dasar,
          passwordHash: await hash(data.password, 10),
        },
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return {
          ok: false,
          pesan: "Email atau username sudah digunakan akun lain.",
        };
      }
      if (e.code === "P2025") {
        return { ok: false, pesan: "Karyawan tidak ditemukan." };
      }
    }
    throw e;
  }

  segarkan();
  if (!id) {
    return { ok: true, pesan: `Akun ${data.name} dibuat.` };
  }
  const catatan: string[] = [];
  if (resetPassword) {
    catatan.push(
      "Password karyawan sudah direset — sampaikan password baru ke karyawan.",
    );
  }
  if (
    lama &&
    (lama.username !== data.username || lama.email !== data.email)
  ) {
    catatan.push(
      `Login karyawan kini memakai username ${data.username} / email ${data.email}.`,
    );
  }
  return {
    ok: true,
    pesan:
      "Data karyawan tersimpan." +
      (catatan.length ? ` ${catatan.join(" ")}` : ""),
  };
}

export async function ubahStatusKaryawan(
  id: string,
  aktif: boolean,
): Promise<HasilKaryawan> {
  const admin = await wajibAkses("karyawan");
  if (id === admin.id) {
    return { ok: false, pesan: "Anda tidak dapat menonaktifkan akun sendiri." };
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { name: true, cabangId: true, role: true },
  });
  if (!target) return { ok: false, pesan: "Karyawan tidak ditemukan." };

  if (
    admin.role !== "super_admin" &&
    (target.cabangId !== admin.cabangId || target.role !== "karyawan")
  ) {
    return { ok: false, pesan: "Karyawan di luar lingkup cabang Anda." };
  }

  await db.user.update({ where: { id }, data: { aktif } });
  segarkan();
  return {
    ok: true,
    pesan: aktif ? `${target.name} diaktifkan.` : `${target.name} dinonaktifkan.`,
  };
}
