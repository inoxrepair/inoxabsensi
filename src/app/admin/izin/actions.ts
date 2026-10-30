"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { roleTerbatasCabang } from "@/lib/domain";
import { formatTanggal } from "@/lib/format";
import {
  ajukanIzinSkema,
  bisaDiprosesIzin,
  buatIzinAdminSkema,
  catatanIzin,
  daftarTanggalIzin,
  prosesIzinSkema,
  rencanaPersetujuanIzin,
} from "@/lib/izin";
import { wajibLogin, wajibAkses, type Pengguna } from "@/lib/session";

export type HasilIzin = { ok: boolean; pesan: string };

function segarkan() {
  revalidatePath("/karyawan/izin");
  revalidatePath("/admin/izin");
  revalidatePath("/admin/log-absensi");
  revalidatePath("/admin/rekap");
  revalidatePath("/admin");
  revalidatePath("/karyawan/riwayat");
}

/** Admin (non-super) hanya boleh memproses karyawan cabangnya sendiri. */
function dalamLingkup(admin: Pengguna, cabangIdPemilik: string | null): boolean {
  if (admin.role === "super_admin") return true;
  if (!roleTerbatasCabang(admin.role)) return true;
  return cabangIdPemilik !== null && cabangIdPemilik === admin.cabangId;
}

/**
 * Terapkan izin untuk satu tanggal ke dalam transaksi Prisma yang sedang
 * berjalan. Dipakai persetujuan pengajuan dan buat-izin-langsung admin.
 * Keputusan dibuat/dilewati/bentrok dihitung dulu oleh pemanggil lewat
 * rencanaPersetujuanIzin, jadi fungsi ini tidak pernah menimpa hadir/telat.
 */
function operasiIzinUntukTanggal(
  userId: string,
  cabangId: string,
  tanggal: string,
  jenis: "izin" | "sakit",
  alasan: string,
  jadwal: { shiftId: string | null; modeShift: string | null; maksimalCycle: number | null } | undefined,
  statusLama: string | undefined,
) {
  const catatan = catatanIzin(jenis, alasan);
  const dataDasar = {
    status: "izin",
    masukMenit: null,
    keluarMenit: null,
    menitTelat: 0,
    menitToleransi: 0,
    menitKotor: 0,
    kekuranganMenit: 0,
    modeShift: jadwal?.modeShift ?? "terjadwal",
    maksimalCycle: jadwal?.maksimalCycle ?? 1,
    catatan,
  };
  if (statusLama === undefined) {
    return db.absensi.create({
      data: { userId, cabangId, tanggal, ...dataDasar },
    });
  }
  return db.absensi.update({
    where: { userId_tanggal: { userId, tanggal } },
    data: dataDasar,
  });
}

/** Karyawan mengajukan izin/sakit untuk rentang tanggal. */
export async function ajukanIzin(
  _sebelumnya: HasilIzin | undefined,
  formData: FormData,
): Promise<HasilIzin> {
  const user = await wajibLogin();
  const parsed = ajukanIzinSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  await db.pengajuanIzin.create({
    data: {
      userId: user.id,
      dari: parsed.data.dari,
      sampai: parsed.data.sampai,
      jenis: parsed.data.jenis,
      alasan: parsed.data.alasan,
      buktiKeterangan: parsed.data.buktiKeterangan,
      status: "pending",
    },
  });
  segarkan();
  return { ok: true, pesan: "Pengajuan izin terkirim, menunggu persetujuan admin." };
}

/** Karyawan membatalkan pengajuannya sendiri yang masih pending. */
export async function batalkanPengajuanIzin(formData: FormData): Promise<HasilIzin> {
  const user = await wajibLogin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, pesan: "Pengajuan tidak ditemukan." };
  const pengajuan = await db.pengajuanIzin.findUnique({ where: { id } });
  if (!pengajuan || pengajuan.userId !== user.id) {
    return { ok: false, pesan: "Pengajuan tidak ditemukan." };
  }
  if (!bisaDiprosesIzin(pengajuan.status)) {
    return { ok: false, pesan: "Hanya pengajuan pending yang bisa dibatalkan." };
  }
  await db.pengajuanIzin.update({
    where: { id },
    data: { status: "dibatalkan" },
  });
  segarkan();
  return { ok: true, pesan: "Pengajuan dibatalkan." };
}

/**
 * Admin menyetujui/menolak pengajuan. Kunci menu "karyawan" dipakai supaya
 * admin_cabang dan super_admin yang sudah punya izin itu langsung bisa
 * memakai halaman ini tanpa reset seed; headstore tidak punya kunci ini.
 *
 * Persetujuan: bentrok hadir/telat menggagalkan SELURUH persetujuan
 * (tidak ada penulisan sebagian); hari tanpa jadwal shift dilewati dan
 * dilaporkan jumlahnya, off tidak diubah jadi izin.
 */
export async function prosesPengajuanIzin(formData: FormData): Promise<HasilIzin> {
  const admin = await wajibAkses("karyawan");
  const parsed = prosesIzinSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  const pengajuan = await db.pengajuanIzin.findUnique({
    where: { id: parsed.data.id },
    include: { user: { select: { cabangId: true, name: true } } },
  });
  if (!pengajuan) return { ok: false, pesan: "Pengajuan tidak ditemukan." };
  if (!dalamLingkup(admin, pengajuan.user.cabangId)) {
    return { ok: false, pesan: "Pengajuan di luar lingkup cabang Anda." };
  }
  if (!bisaDiprosesIzin(pengajuan.status)) {
    return { ok: false, pesan: "Pengajuan ini sudah diproses." };
  }

  if (parsed.data.status === "ditolak") {
    await db.pengajuanIzin.update({
      where: { id: pengajuan.id },
      data: {
        status: "ditolak",
        catatanAdmin: parsed.data.catatanAdmin,
        diprosesOleh: admin.id,
      },
    });
    segarkan();
    return { ok: true, pesan: "Pengajuan ditolak." };
  }

  // Disetujui: hitung rencana dulu, baru tulis dalam satu transaksi.
  const tanggal = daftarTanggalIzin(pengajuan.dari, pengajuan.sampai);
  const [jadwal, absensi] = await Promise.all([
    db.jadwal.findMany({
      where: { userId: pengajuan.userId, tanggal: { in: tanggal } },
      select: {
        tanggal: true,
        shiftId: true,
        shift: { select: { mode: true, maksimalCycle: true } },
      },
    }),
    db.absensi.findMany({
      where: { userId: pengajuan.userId, tanggal: { in: tanggal } },
      select: { tanggal: true, status: true },
    }),
  ]);
  const rencana = rencanaPersetujuanIzin(
    tanggal,
    jadwal.map((j) => ({
      tanggal: j.tanggal,
      shiftId: j.shiftId,
      modeShift: j.shift?.mode ?? null,
      maksimalCycle: j.shift?.maksimalCycle ?? null,
    })),
    absensi.map((a) => ({ tanggal: a.tanggal, status: a.status })),
  );
  if (rencana.bentrok.length > 0) {
    const daftar = rencana.bentrok.map((t) => formatTanggal(t)).join(", ");
    return {
      ok: false,
      pesan: `Persetujuan dibatalkan: karyawan sudah hadir/telat pada ${daftar}. Tidak ada tanggal yang diubah; urus tanggal itu lewat edit log absensi bila perlu.`,
    };
  }
  const cabangId = pengajuan.user.cabangId;
  if (!cabangId) {
    return {
      ok: false,
      pesan: "Karyawan belum ditempatkan di cabang, baris izin tidak bisa dibuat.",
    };
  }
  const petaJadwal = new Map(jadwal.map((j) => [j.tanggal, j]));
  const petaAbsensi = new Map(absensi.map((a) => [a.tanggal, a.status]));
  const jenis = pengajuan.jenis === "sakit" ? "sakit" : "izin";
  const operasi = [
    db.pengajuanIzin.update({
      where: { id: pengajuan.id },
      data: {
        status: "disetujui",
        catatanAdmin: parsed.data.catatanAdmin,
        diprosesOleh: admin.id,
      },
    }),
    ...rencana.dibuat.map((tgl) =>
      operasiIzinUntukTanggal(
        pengajuan.userId,
        cabangId,
        tgl,
        jenis,
        pengajuan.alasan,
        {
          shiftId: petaJadwal.get(tgl)?.shiftId ?? null,
          modeShift: petaJadwal.get(tgl)?.shift?.mode ?? null,
          maksimalCycle: petaJadwal.get(tgl)?.shift?.maksimalCycle ?? null,
        },
        undefined,
      ),
    ),
    ...rencana.diubah.map((tgl) =>
      operasiIzinUntukTanggal(
        pengajuan.userId,
        cabangId,
        tgl,
        jenis,
        pengajuan.alasan,
        {
          shiftId: petaJadwal.get(tgl)?.shiftId ?? null,
          modeShift: petaJadwal.get(tgl)?.shift?.mode ?? null,
          maksimalCycle: petaJadwal.get(tgl)?.shift?.maksimalCycle ?? null,
        },
        petaAbsensi.get(tgl),
      ),
    ),
  ];
  await db.$transaction(operasi);
  segarkan();
  const dibuat = rencana.dibuat.length + rencana.diubah.length;
  const lewat = rencana.dilewatiOff.length;
  return {
    ok: true,
    pesan:
      `Pengajuan disetujui: ${dibuat} hari ditandai izin.` +
      (lewat > 0 ? ` ${lewat} hari dilewati karena tidak ada jadwal shift.` : "") +
      " Karyawan tidak bisa absen masuk pada hari izin itu.",
  };
}

/**
 * Perbaikan cepat: admin membuat izin langsung untuk satu tanggal.
 * Syarat: tanggal itu ada Jadwal dengan shift, belum ada baris Absensi
 * atau barisnya berstatus alpa/izin/libur; hadir/telat tidak ditimpa.
 */
export async function buatIzinAdmin(
  _sebelumnya: HasilIzin | undefined,
  formData: FormData,
): Promise<HasilIzin> {
  const admin = await wajibAkses("karyawan");
  const parsed = buatIzinAdminSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  const pemilik = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { cabangId: true, aktif: true, role: true },
  });
  if (!pemilik || !pemilik.aktif || pemilik.role === "super_admin") {
    return { ok: false, pesan: "Karyawan tidak ditemukan." };
  }
  if (!dalamLingkup(admin, pemilik.cabangId)) {
    return { ok: false, pesan: "Karyawan di luar lingkup cabang Anda." };
  }
  if (!pemilik.cabangId) {
    return { ok: false, pesan: "Karyawan belum ditempatkan di cabang." };
  }
  const [jadwal, absensi] = await Promise.all([
    db.jadwal.findUnique({
      where: {
        userId_tanggal: { userId: parsed.data.userId, tanggal: parsed.data.tanggal },
      },
      select: {
        shiftId: true,
        shift: { select: { mode: true, maksimalCycle: true } },
      },
    }),
    db.absensi.findUnique({
      where: {
        userId_tanggal: { userId: parsed.data.userId, tanggal: parsed.data.tanggal },
      },
      select: { status: true },
    }),
  ]);
  const rencana = rencanaPersetujuanIzin(
    [parsed.data.tanggal],
    [
      {
        tanggal: parsed.data.tanggal,
        shiftId: jadwal?.shiftId ?? null,
        modeShift: jadwal?.shift?.mode ?? null,
        maksimalCycle: jadwal?.shift?.maksimalCycle ?? null,
      },
    ],
    absensi ? [{ tanggal: parsed.data.tanggal, status: absensi.status }] : [],
  );
  if (rencana.dilewatiOff.length > 0) {
    return {
      ok: false,
      pesan: `Tidak ada jadwal shift pada ${formatTanggal(parsed.data.tanggal)}, jadi tidak dibuat izin.`,
    };
  }
  if (rencana.bentrok.length > 0) {
    return {
      ok: false,
      pesan: `Karyawan sudah hadir/telat pada ${formatTanggal(parsed.data.tanggal)}, izin tidak dibuat.`,
    };
  }
  const dibuat = rencana.dibuat.length > 0;
  await operasiIzinUntukTanggal(
    parsed.data.userId,
    pemilik.cabangId,
    parsed.data.tanggal,
    parsed.data.jenis,
    parsed.data.alasan,
    {
      shiftId: jadwal?.shiftId ?? null,
      modeShift: jadwal?.shift?.mode ?? null,
      maksimalCycle: jadwal?.shift?.maksimalCycle ?? null,
    },
    dibuat ? undefined : absensi?.status,
  );
  segarkan();
  return {
    ok: true,
    pesan: dibuat
      ? `Izin dibuat untuk ${formatTanggal(parsed.data.tanggal)}.`
      : `Izin diperbarui untuk ${formatTanggal(parsed.data.tanggal)}.`,
  };
}
