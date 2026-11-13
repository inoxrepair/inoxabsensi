import { db } from "@/lib/db";
import { ambilInsentifRentang } from "@/lib/insentif";
import { sisaKasbon } from "@/lib/kasbon";
import {
  dihitungHadir,
  potonganTelat,
  totalPayroll,
  tunjanganMakan,
  type BarisPayroll,
} from "@/lib/payroll";
import { bacaRentangGajian, rentangPeriodeGajian } from "@/lib/rekap";

/**
 * Hitung baris payroll untuk satu periode — SATU sumber kebenaran untuk
 * halaman Payroll dan ekspor PDF, supaya angka di layar dan di PDF tidak
 * pernah berbeda. Aturan yang sama dengan halaman: gaji pokok/tunjangan/
 * kasbon dibaca dari tabel Payroll periode itu; tunjangan makan dari hari
 * hadir dan potongan telat dari menit telat tercatat di jendela aktif;
 * insentif dari baris transaksi iNOX dalam jendela yang sama.
 */
export async function hitungPayroll({
  periode,
  cabangId,
  dari,
  sampai,
  bulanIni,
}: {
  periode: string;
  cabangId: string;
  dari?: string;
  sampai?: string;
  bulanIni: string;
}): Promise<{
  baris: BarisPayroll[];
  total: ReturnType<typeof totalPayroll>;
  jendela: { dari: string; sampai: string; kustom: boolean };
  rentang: { dari: string; sampai: string };
}> {
  const filterCabang = cabangId ? { cabangId } : {};

  const rentang = rentangPeriodeGajian(periode);
  // Jendela hitung hadir/telat: periode penuh, atau rentang tanggal kustom
  // yang dijepit ke dalam periode gajian (filter bulan tetap berlaku).
  const jendela = bacaRentangGajian({ dari, sampai, periode }, bulanIni);

  const [karyawan, payroll, absensiPeriode, kasbonPeriode, insentifPeriode] =
    await Promise.all([
      db.user.findMany({
        where: { aktif: true, role: { not: "super_admin" }, ...filterCabang },
        orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
        select: { id: true, name: true, cabang: { select: { nama: true } } },
      }),
      db.payroll.findMany({
        where: { periode, user: { aktif: true, ...filterCabang } },
      }),
      // Menit telat & hari hadir dihitung dari jendela aktif (periode
      // penuh atau rentang tanggal kustom di dalamnya).
      db.absensi.findMany({
        where: {
          tanggal: { gte: jendela.dari, lte: jendela.sampai },
          user: { aktif: true, ...filterCabang },
        },
        select: { userId: true, menitTelat: true, status: true },
      }),
      // Kasbon yang disetujui periode ini, dihitung sisanya saja.
      db.kasbon.findMany({
        where: {
          periode,
          status: "disetujui",
          user: { aktif: true, ...filterCabang },
        },
        select: { userId: true, jumlah: true, jumlahTerbayar: true },
      }),
      // Insentif dari inox.my.id, mengikuti jendela aktif — sama seperti
      // tunjangan makan dan potongan telat.
      ambilInsentifRentang(jendela.dari, jendela.sampai),
    ]);

  const peta = new Map(payroll.map((p) => [p.userId, p]));
  const petaTelat = new Map<string, number>();
  const petaHadir = new Map<string, number>();
  for (const a of absensiPeriode) {
    petaTelat.set(a.userId, (petaTelat.get(a.userId) ?? 0) + a.menitTelat);
    if (dihitungHadir(a.status)) {
      petaHadir.set(a.userId, (petaHadir.get(a.userId) ?? 0) + 1);
    }
  }
  const petaKasbonSisa = new Map<string, number>();
  for (const k of kasbonPeriode) {
    petaKasbonSisa.set(
      k.userId,
      (petaKasbonSisa.get(k.userId) ?? 0) + sisaKasbon(k),
    );
  }
  const petaInsentif = new Map(insentifPeriode.map((i) => [i.userId, i.jumlah]));
  const baris: BarisPayroll[] = karyawan.map((k) => {
    const p = peta.get(k.id);
    return {
      userId: k.id,
      nama: k.name,
      cabang: k.cabang?.nama ?? "—",
      gajiPokok: p?.gajiPokok ?? 0,
      tunjangan: p?.tunjangan ?? 0,
      hariHadir: petaHadir.get(k.id) ?? 0,
      tunjanganMakan: tunjanganMakan(petaHadir.get(k.id) ?? 0),
      // Potongan telat dihitung otomatis dari menit telat tercatat
      // (sudah dikurangi toleransi shift) × Rp 1.000 — bukan dari nilai
      // lama yang tersimpan di tabel Payroll.
      potonganTelat: potonganTelat(petaTelat.get(k.id) ?? 0),
      kasbon: p?.kasbon ?? 0,
      insentif: petaInsentif.get(k.id) ?? 0,
      menitTelatRekap: petaTelat.get(k.id) ?? 0,
      kasbonDisetujuiSisa: petaKasbonSisa.get(k.id) ?? 0,
    };
  });

  return { baris, total: totalPayroll(baris), jendela, rentang };
}
