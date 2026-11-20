"use server";

import { Buffer } from "node:buffer";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  kekuranganKerjaDenganIzin,
  ringkasCycle,
  snapshotKeterlambatanTelat,
} from "@/lib/absensi";
import { roleTerbatasCabang } from "@/lib/domain";
import { formatTanggal } from "@/lib/format";
import {
  ajukanIzinSkema,
  bisaDiprosesIzin,
  buatIzinAdminSkema,
  catatanIzin,
  catatanIzinTelat,
  catatanPulangCepat,
  daftarTanggalIzin,
  hariDalamTahun,
  LABEL_JENIS_IZIN,
  prosesIzinSkema,
  rencanaPersetujuanIzin,
  sisaCuti,
  statusBarisDisetujui,
  tambahCatatan,
  tahunRentang,
  bacaJenisIzin,
  type JenisIzin,
} from "@/lib/izin";
import {
  ambilKolomTambahanIzin,
  simpanKolomTambahanIzin,
} from "@/lib/izin-data";
import { wajibLogin, wajibAkses, type Pengguna } from "@/lib/session";
import { durasiMenit, keJam } from "@/lib/waktu";

export type HasilIzin = { ok: boolean; pesan: string };

function segarkan() {
  revalidatePath("/karyawan");
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

/** Shift hari itu dalam bentuk ringkas untuk validasi jam & perbaikan retroaktif. */
type ShiftRingkas = {
  mulaiMenit: number;
  selesaiMenit: number;
  toleransiMenit: number;
  mode: string;
  minimumKerjaMenit: number | null;
};

async function muatShiftHari(
  userId: string,
  tanggal: string,
): Promise<ShiftRingkas | null> {
  const jadwal = await db.jadwal.findUnique({
    where: { userId_tanggal: { userId, tanggal } },
    select: {
      shift: {
        select: {
          mulaiMenit: true,
          selesaiMenit: true,
          toleransiMenit: true,
          mode: true,
          minimumKerjaMenit: true,
        },
      },
    },
  });
  return jadwal?.shift ?? null;
}

/** Pesan penolakan bila batas jam tidak masuk akal dibanding shift hari itu. */
function cekJamVsShift(
  shift: ShiftRingkas | null,
  jenis: "telat" | "pulang-cepat",
  jam: number,
): string | null {
  if (!shift) return null; // belum ada jadwal: admin menilai saat persetujuan
  if (jenis === "telat") {
    if (jam <= shift.mulaiMenit)
      return `Batas masuk harus setelah jam mulai shift (${keJam(shift.mulaiMenit)}).`;
    if (jam > shift.selesaiMenit)
      return `Batas masuk tidak boleh lewat jam selesai shift (${keJam(shift.selesaiMenit)}).`;
  } else {
    if (jam <= shift.mulaiMenit)
      return `Batas pulang harus setelah jam mulai shift (${keJam(shift.mulaiMenit)}).`;
    if (jam >= shift.selesaiMenit)
      return `Batas pulang harus sebelum jam selesai shift (${keJam(shift.selesaiMenit)}).`;
  }
  return null;
}

/** Ada pengajuan telat/pulang-cepat lain untuk tanggal itu? */
async function adaPengajuanTanpaBarisLain(
  userId: string,
  tanggal: string,
  jenis: "telat" | "pulang-cepat",
  kecualikanId?: string,
  hanyaDisetujui = false,
): Promise<boolean> {
  const ada = await db.pengajuanIzin.findFirst({
    where: {
      userId,
      jenis,
      dari: tanggal,
      status: hanyaDisetujui ? "disetujui" : { in: ["pending", "disetujui"] },
      ...(kecualikanId ? { id: { not: kecualikanId } } : {}),
    },
    select: { id: true },
  });
  return ada !== null;
}

/** Pesan penolakan bila saldo cuti tidak cukup untuk rentang, null bila cukup. */
async function cekSaldoCuti(
  userId: string,
  dari: string,
  sampai: string,
): Promise<string | null> {
  const disetujui = await db.pengajuanIzin.findMany({
    where: { userId, jenis: "cuti", status: "disetujui" },
    select: { dari: true, sampai: true },
  });
  for (const tahun of tahunRentang(dari, sampai)) {
    const butuh = hariDalamTahun(dari, sampai, tahun);
    const sisa = sisaCuti(tahun, disetujui);
    if (butuh > sisa) {
      return `Sisa cuti ${tahun} tinggal ${sisa} hari, pengajuan ini butuh ${butuh} hari.`;
    }
  }
  return null;
}

/** Foto bukti dari form -> data URL, atau pesan penolakan bila tidak valid. */
const MAKS_UKURAN_BUKTI_FOTO = 2_000_000; // 2 MB; hasil kompresi HP biasanya < 300 KB

async function bacaFotoBukti(
  file: File,
): Promise<{ ok: true; dataUrl: string } | { ok: false; pesan: string }> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, pesan: "Foto bukti harus berupa gambar." };
  }
  if (file.size > MAKS_UKURAN_BUKTI_FOTO) {
    return { ok: false, pesan: "Foto bukti terlalu besar (maks. 2 MB)." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return { ok: true, dataUrl: `data:${file.type};base64,${buf.toString("base64")}` };
}

/**
 * Hitung perbaikan baris absensi yang sudah tercatat saat izin telat
 * disetujui belakangan (retroaktif): keterlambatan dihitung ulang dengan
 * batas yang diizinkan. Null bila tidak ada check-in pada hari itu.
 * Murni — pemanggil yang menulis hasilnya ke database.
 */
function hitungPerbaikanTelat(
  row: {
    id: string;
    masukMenit: number | null;
    catatan: string | null;
  },
  shift: ShiftRingkas,
  jamDiizinkan: number,
): {
  status: "hadir" | "telat";
  menitTelat: number;
  menitToleransi: number;
  menitKotor: number;
  catatan: string;
} | null {
  if (row.masukMenit == null) return null;
  const snapshot = snapshotKeterlambatanTelat(
    row.masukMenit,
    shift,
    jamDiizinkan,
  );
  return {
    status: snapshot.menitTelat > 0 ? "telat" : "hadir",
    menitTelat: snapshot.menitTelat,
    menitToleransi: snapshot.menitToleransi,
    menitKotor: snapshot.menitKotor,
    catatan: tambahCatatan(row.catatan, catatanIzinTelat(jamDiizinkan)),
  };
}

/**
 * Hitung perbaikan baris absensi yang sudah tercatat saat izin pulang
 * cepat disetujui belakangan: kekurangan kerja dihitung ulang dengan
 * target yang dipangkas. Null bila belum check-out pada hari itu.
 * Murni — pemanggil yang menulis hasilnya ke database.
 */
function hitungPerbaikanPulangCepat(
  row: {
    id: string;
    keluarMenit: number | null;
    minimumKerjaMenit: number | null;
    catatan: string | null;
  },
  masukPertama: number | null,
  totalMenit: number,
  shift: ShiftRingkas,
  jamDiizinkan: number,
): { kekuranganMenit: number; catatan: string } | null {
  if (masukPertama == null || row.keluarMenit == null) return null;
  const kekurangan = kekuranganKerjaDenganIzin(
    totalMenit,
    row.minimumKerjaMenit ?? shift.minimumKerjaMenit,
    masukPertama,
    jamDiizinkan,
    row.keluarMenit,
  );
  return {
    kekuranganMenit: kekurangan,
    catatan: tambahCatatan(row.catatan, catatanPulangCepat(jamDiizinkan)),
  };
}

/** Total menit kerja + jam masuk pertama hari itu (dari cycle tercatat). */
async function muatTotalKerja(
  absensiId: string,
  row: { masukMenit: number | null; keluarMenit: number | null },
): Promise<{ masukPertama: number | null; totalMenit: number }> {
  const cycles = await db.absensiCycle.findMany({
    where: { absensiId },
    orderBy: { urutan: "asc" },
    select: { masukMenit: true, keluarMenit: true },
  });
  if (cycles.length === 0) {
    // Baris legacy tanpa cycle: satu cycle dari masuk/keluar baris.
    return {
      masukPertama: row.masukMenit,
      totalMenit:
        row.masukMenit != null && row.keluarMenit != null
          ? durasiMenit(row.masukMenit, row.keluarMenit)
          : 0,
    };
  }
  return {
    masukPertama: cycles[0].masukMenit,
    totalMenit: ringkasCycle(
      cycles.map((c) => ({
        masukMenit: c.masukMenit,
        keluarMenit: c.keluarMenit,
      })),
    ).totalMenit,
  };
}

/**
 * Terapkan pengajuan yang disetujui untuk satu tanggal ke dalam transaksi
 * Prisma yang sedang berjalan. Dipakai persetujuan pengajuan dan
 * buat-izin-langsung admin. Keputusan dibuat/dilewati/bentrok dihitung dulu
 * oleh pemanggil lewat rencanaPersetujuanIzin, jadi fungsi ini tidak pernah
 * menimpa hadir/telat. Dinas luar membuat baris "hadir", jenis lain "izin".
 */
function operasiBarisDariPengajuan(
  userId: string,
  cabangId: string,
  tanggal: string,
  jenis: JenisIzin,
  alasan: string,
  jadwal: { shiftId: string | null; modeShift: string | null; maksimalCycle: number | null } | undefined,
  statusLama: string | undefined,
) {
  const catatan = catatanIzin(jenis, alasan);
  const dataDasar = {
    status: statusBarisDisetujui(jenis),
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

/** Karyawan mengajukan izin/sakit/cuti/dinas/telat/pulang-cepat. */
export async function ajukanIzin(
  _sebelumnya: HasilIzin | undefined,
  formData: FormData,
): Promise<HasilIzin> {
  const user = await wajibLogin();
  const parsed = ajukanIzinSkema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  // Foto bukti (opsional): berkas terkompresi dari form, bukan teks.
  let buktiFoto: string | null = null;
  const berkas = formData.get("buktiFoto");
  if (berkas instanceof File && berkas.size > 0) {
    const foto = await bacaFotoBukti(berkas);
    if (!foto.ok) return { ok: false, pesan: foto.pesan };
    buktiFoto = foto.dataUrl;
  }

  // Cek per jenis sebelum membuat pengajuan.
  if (data.jenis === "cuti") {
    const tolak = await cekSaldoCuti(user.id, data.dari, data.sampai);
    if (tolak) return { ok: false, pesan: tolak };
  }
  if (data.jenis === "telat" || data.jenis === "pulang-cepat") {
    const duplikat = await adaPengajuanTanpaBarisLain(
      user.id,
      data.dari,
      data.jenis,
    );
    if (duplikat) {
      return {
        ok: false,
        pesan: `Sudah ada pengajuan ${data.jenis === "telat" ? "izin telat" : "izin pulang cepat"} untuk tanggal itu yang masih menunggu atau sudah disetujui.`,
      };
    }
    const jam =
      data.jenis === "telat"
        ? data.jamMasukDiizinkan
        : data.jamPulangDiizinkan;
    const shift = await muatShiftHari(user.id, data.dari);
    const tolakJam = cekJamVsShift(shift, data.jenis, jam!);
    if (tolakJam) return { ok: false, pesan: tolakJam };
  }

  const dibuat = await db.pengajuanIzin.create({
    data: {
      userId: user.id,
      dari: data.dari,
      sampai: data.sampai,
      jenis: data.jenis,
      alasan: data.alasan,
      buktiKeterangan: data.buktiKeterangan,
      status: "pending",
    },
  });
  if (
    data.jamMasukDiizinkan != null ||
    data.jamPulangDiizinkan != null ||
    buktiFoto
  ) {
    const tersimpan = await simpanKolomTambahanIzin(dibuat.id, {
      jamMasukDiizinkan: data.jamMasukDiizinkan,
      jamPulangDiizinkan: data.jamPulangDiizinkan,
      buktiFoto,
    });
    if (!tersimpan) {
      // Jam/foto tidak tersimpan (mis. migrasi belum jalan): batalkan
      // pengajuan daripada membiarkan pengajuan telat tanpa batas jam.
      await db.pengajuanIzin.delete({ where: { id: dibuat.id } });
      return {
        ok: false,
        pesan: "Pengajuan gagal disimpan. Coba lagi sebentar lagi.",
      };
    }
  }
  segarkan();
  const pesan =
    data.jenis === "cuti"
      ? `Pengajuan cuti terkirim, menunggu persetujuan admin. Bila disetujui, saldo cuti berkurang ${daftarTanggalIzin(data.dari, data.sampai).length} hari.`
      : "Pengajuan terkirim, menunggu persetujuan admin.";
  return { ok: true, pesan };
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
 * Persetujuan izin telat / pulang cepat: tidak membuat baris Absensi.
 * Yang disimpan adalah batas jam yang disetujui; bila karyawan sudah
 * absen pada hari itu, barisnya diperbaiki retroaktif dalam transaksi
 * yang sama.
 */
async function prosesPengajuanTanpaBaris(
  pengajuan: { id: string; userId: string; dari: string },
  admin: Pengguna,
  jenis: "telat" | "pulang-cepat",
  catatanAdmin: string | null,
): Promise<HasilIzin> {
  const tambahan = await ambilKolomTambahanIzin([pengajuan.id]);
  const jam =
    jenis === "telat"
      ? tambahan.get(pengajuan.id)?.jamMasukDiizinkan
      : tambahan.get(pengajuan.id)?.jamPulangDiizinkan;
  if (jam == null) {
    return { ok: false, pesan: "Pengajuan ini tidak punya batas jam." };
  }
  const shift = await muatShiftHari(pengajuan.userId, pengajuan.dari);
  if (!shift) {
    return {
      ok: false,
      pesan: `Tidak ada jadwal shift pada ${formatTanggal(pengajuan.dari)}, pengajuan tidak bisa disetujui.`,
    };
  }
  const tolakJam = cekJamVsShift(shift, jenis, jam);
  if (tolakJam) return { ok: false, pesan: tolakJam };
  const duplikat = await adaPengajuanTanpaBarisLain(
    pengajuan.userId,
    pengajuan.dari,
    jenis,
    pengajuan.id,
    true,
  );
  if (duplikat) {
    return {
      ok: false,
      pesan: `Sudah ada ${jenis === "telat" ? "izin telat" : "izin pulang cepat"} yang disetujui untuk tanggal itu.`,
    };
  }
  const row = await db.absensi.findUnique({
    where: {
      userId_tanggal: { userId: pengajuan.userId, tanggal: pengajuan.dari },
    },
    select: {
      id: true,
      masukMenit: true,
      keluarMenit: true,
      minimumKerjaMenit: true,
      catatan: true,
    },
  });
  // Total menit kerja + jam masuk pertama untuk perbaikan pulang cepat.
  let masukPertama: number | null = null;
  let totalMenit = 0;
  if (jenis === "pulang-cepat" && row) {
    const total = await muatTotalKerja(row.id, row);
    masukPertama = total.masukPertama;
    totalMenit = total.totalMenit;
  }
  const label = jenis === "telat" ? "Izin telat" : "Izin pulang cepat";
  const sudahAbsen = row?.masukMenit != null;
  await db.$transaction(async (tx) => {
    await tx.pengajuanIzin.update({
      where: { id: pengajuan.id },
      data: {
        status: "disetujui",
        catatanAdmin,
        diprosesOleh: admin.id,
      },
    });
    if (row) {
      if (jenis === "telat") {
        const perbaikan = hitungPerbaikanTelat(row, shift, jam);
        if (perbaikan) {
          await tx.absensi.update({ where: { id: row.id }, data: perbaikan });
        }
      } else {
        const perbaikan = hitungPerbaikanPulangCepat(
          row,
          masukPertama,
          totalMenit,
          shift,
          jam,
        );
        if (perbaikan) {
          await tx.absensi.update({ where: { id: row.id }, data: perbaikan });
        }
      }
    }
  });
  segarkan();
  return {
    ok: true,
    pesan:
      `${label} disetujui: ` +
      (jenis === "telat"
        ? `boleh masuk sampai ${keJam(jam)}.`
        : `boleh pulang mulai ${keJam(jam)}.`) +
      (sudahAbsen
        ? " Catatan absensi hari itu sudah diperbaiki."
        : " Berlaku saat absen hari itu."),
  };
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

  // Disetujui: izin telat / pulang cepat tidak membuat baris Absensi.
  const jenis = bacaJenisIzin(pengajuan.jenis);
  if (jenis === "telat" || jenis === "pulang-cepat") {
    return prosesPengajuanTanpaBaris(
      { id: pengajuan.id, userId: pengajuan.userId, dari: pengajuan.dari },
      admin,
      jenis,
      parsed.data.catatanAdmin,
    );
  }

  // Cuti: saldo dicek lagi saat persetujuan (bisa berubah sejak pengajuan).
  if (jenis === "cuti") {
    const tolak = await cekSaldoCuti(
      pengajuan.userId,
      pengajuan.dari,
      pengajuan.sampai,
    );
    if (tolak) return { ok: false, pesan: tolak };
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
      operasiBarisDariPengajuan(
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
      operasiBarisDariPengajuan(
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
  const statusTeks = jenis === "dinas" ? "hadir (dinas luar)" : "izin";
  return {
    ok: true,
    pesan:
      `Pengajuan disetujui: ${dibuat} hari ditandai ${statusTeks}.` +
      (jenis === "cuti"
        ? ` Saldo cuti berkurang ${daftarTanggalIzin(pengajuan.dari, pengajuan.sampai).length} hari.`
        : "") +
      (lewat > 0 ? ` ${lewat} hari dilewati karena tidak ada jadwal shift.` : "") +
      (jenis === "dinas"
        ? ""
        : " Karyawan tidak bisa absen masuk pada hari izin itu."),
  };
}

/**
 * Perbaikan cepat: admin membuat izin langsung untuk satu tanggal.
 * Syarat: tanggal itu ada Jadwal dengan shift, belum ada baris Absensi
 * atau barisnya berstatus alpa/izin/libur; hadir/telat tidak ditimpa.
 * Izin telat / pulang cepat tidak membuat baris Absensi — yang dibuat
 * adalah pengajuan yang langsung disetujui beserta batas jamnya.
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
  const jenis = bacaJenisIzin(parsed.data.jenis);
  const tanggalTeks = formatTanggal(parsed.data.tanggal);

  // Izin telat / pulang cepat: buat pengajuan yang langsung disetujui.
  if (jenis === "telat" || jenis === "pulang-cepat") {
    const jam =
      jenis === "telat"
        ? parsed.data.jamMasukDiizinkan
        : parsed.data.jamPulangDiizinkan;
    const shift = await muatShiftHari(parsed.data.userId, parsed.data.tanggal);
    if (!shift) {
      return {
        ok: false,
        pesan: `Tidak ada jadwal shift pada ${tanggalTeks}.`,
      };
    }
    const tolakJam = cekJamVsShift(shift, jenis, jam!);
    if (tolakJam) return { ok: false, pesan: tolakJam };
    const duplikat = await adaPengajuanTanpaBarisLain(
      parsed.data.userId,
      parsed.data.tanggal,
      jenis,
      undefined,
      true,
    );
    if (duplikat) {
      return {
        ok: false,
        pesan: `Sudah ada ${jenis === "telat" ? "izin telat" : "izin pulang cepat"} yang disetujui untuk tanggal itu.`,
      };
    }
    const row = await db.absensi.findUnique({
      where: {
        userId_tanggal: {
          userId: parsed.data.userId,
          tanggal: parsed.data.tanggal,
        },
      },
      select: {
        id: true,
        masukMenit: true,
        keluarMenit: true,
        minimumKerjaMenit: true,
        catatan: true,
      },
    });
    let masukPertama: number | null = null;
    let totalMenit = 0;
    if (jenis === "pulang-cepat" && row) {
      const total = await muatTotalKerja(row.id, row);
      masukPertama = total.masukPertama;
      totalMenit = total.totalMenit;
    }
    await db.$transaction(async (tx) => {
      const dibuat = await tx.pengajuanIzin.create({
        data: {
          userId: parsed.data.userId,
          dari: parsed.data.tanggal,
          sampai: parsed.data.tanggal,
          jenis,
          alasan: parsed.data.alasan,
          buktiKeterangan: null,
          status: "disetujui",
          diprosesOleh: admin.id,
        },
      });
      await tx.$executeRaw`
        UPDATE "PengajuanIzin"
        SET "jamMasukDiizinkan" = ${jenis === "telat" ? jam : null},
            "jamPulangDiizinkan" = ${jenis === "pulang-cepat" ? jam : null}
        WHERE "id" = ${dibuat.id}
      `;
      if (row) {
        if (jenis === "telat") {
          const perbaikan = hitungPerbaikanTelat(row, shift, jam!);
          if (perbaikan) {
            await tx.absensi.update({
              where: { id: row.id },
              data: perbaikan,
            });
          }
        } else {
          const perbaikan = hitungPerbaikanPulangCepat(
            row,
            masukPertama,
            totalMenit,
            shift,
            jam!,
          );
          if (perbaikan) {
            await tx.absensi.update({
              where: { id: row.id },
              data: perbaikan,
            });
          }
        }
      }
    });
    segarkan();
    return {
      ok: true,
      pesan:
        jenis === "telat"
          ? `Izin telat dibuat untuk ${tanggalTeks}: boleh masuk sampai ${keJam(jam!)}.`
          : `Izin pulang cepat dibuat untuk ${tanggalTeks}: boleh pulang mulai ${keJam(jam!)}.`,
    };
  }

  // Cuti langsung: saldo dicek seperti pada persetujuan pengajuan.
  if (jenis === "cuti") {
    const tolak = await cekSaldoCuti(
      parsed.data.userId,
      parsed.data.tanggal,
      parsed.data.tanggal,
    );
    if (tolak) return { ok: false, pesan: tolak };
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
      pesan: `Tidak ada jadwal shift pada ${tanggalTeks}, jadi tidak dibuat izin.`,
    };
  }
  if (rencana.bentrok.length > 0) {
    return {
      ok: false,
      pesan: `Karyawan sudah hadir/telat pada ${tanggalTeks}, izin tidak dibuat.`,
    };
  }
  const dibuat = rencana.dibuat.length > 0;
  await operasiBarisDariPengajuan(
    parsed.data.userId,
    pemilik.cabangId,
    parsed.data.tanggal,
    jenis,
    parsed.data.alasan,
    {
      shiftId: jadwal?.shiftId ?? null,
      modeShift: jadwal?.shift?.mode ?? null,
      maksimalCycle: jadwal?.shift?.maksimalCycle ?? null,
    },
    dibuat ? undefined : absensi?.status,
  );
  segarkan();
  const label = LABEL_JENIS_IZIN[jenis];
  return {
    ok: true,
    pesan:
      (dibuat
        ? `${label} dibuat untuk ${tanggalTeks}.`
        : `${label} diperbarui untuk ${tanggalTeks}.`) +
      (jenis === "cuti" ? " Saldo cuti berkurang 1 hari." : "") +
      (jenis === "dinas" ? " Hari itu ditandai hadir." : ""),
  };
}
