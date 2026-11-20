import { db } from "@/lib/db";
import { ambilInsentifRentang } from "@/lib/insentif";
import { sisaKasbon } from "@/lib/kasbon";
import {
  dalamMasaPercobaan,
  dihitungHadir,
  jamDibulatkan,
  jamLembur,
  jamShiftBiasa,
  menitKerjaCycle,
  menitLembur,
  potonganTelat,
  totalPayroll,
  tunjanganMakanKaryawan,
  upahLembur,
  upahPerJam,
  type BarisPayroll,
} from "@/lib/payroll";
import { bacaRentangGajian, rentangPeriodeGajian } from "@/lib/rekap";
import { petaDapatTunjanganMakan } from "@/lib/karyawan";

/**
 * Hitung baris payroll untuk satu periode — SATU sumber kebenaran untuk
 * halaman Payroll dan ekspor PDF, supaya angka di layar dan di PDF tidak
 * pernah berbeda. Aturan yang sama dengan halaman: gaji pokok/tunjangan/
 * kasbon dibaca dari tabel Payroll periode itu; tunjangan makan dari hari
 * hadir dan potongan telat dari menit telat tercatat di jendela aktif;
 * insentif dari baris transaksi iNOX dalam jendela yang sama; lembur dari
 * definisi shift terjadwal di atas 8 jam (ikut shift, bukan jam absen
 * nyata), dibulatkan per hari, dalam jendela yang sama — kecuali 30 hari
 * pertama sejak tanggal masuk karyawan (masa percobaan, lembur 0); gaji pokok
 * fleksibel dari jam kerja nyata hari fleksibel (jumlah cycle absen hari
 * itu, dibulatkan per hari) × Rp 12.000, dalam jendela yang sama; gaji
 * pokok harian dari durasi shift hari terjadwal (maksimal 8 jam,
 * dibulatkan per hari) × Rp 12.000 — hanya untuk karyawan yang gaji
 * pokok manualnya 0, dalam jendela yang sama.
 * Pembulatan berlaku mulai 30 menit (sisa 30 menit atau lebih ke atas).
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

  const [karyawan, payroll, absensiPeriode, kasbonPeriode, insentifPeriode, jadwalPeriode, petaMakan] =
    await Promise.all([
      db.user.findMany({
        where: { aktif: true, role: { not: "super_admin" }, ...filterCabang },
        orderBy: [{ cabang: { nama: "asc" } }, { name: "asc" }],
        select: { id: true, name: true, tanggalMasuk: true, cabang: { select: { nama: true } } },
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
        select: {
          userId: true,
          tanggal: true,
          menitTelat: true,
          status: true,
          cycles: { select: { masukMenit: true, keluarMenit: true } },
        },
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
      // Definisi shift tiap hari di jendela aktif, untuk hitung lembur
      // (ikut definisi shift saja, bukan jam absen nyata).
      db.jadwal.findMany({
        where: {
          tanggal: { gte: jendela.dari, lte: jendela.sampai },
          user: { aktif: true, ...filterCabang },
        },
        select: {
          userId: true,
          tanggal: true,
          shift: { select: { mode: true, mulaiMenit: true, selesaiMenit: true } },
        },
      }),
      // Flag tunjangan makan per karyawan (kolom User baru, via SQL
      // mentah — lihat src/lib/karyawan.ts).
      petaDapatTunjanganMakan(),
    ]);

  const peta = new Map(payroll.map((p) => [p.userId, p]));
  const petaTanggalMasuk = new Map(karyawan.map((k) => [k.id, k.tanggalMasuk]));
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
  const petaInsentifTransaksi = new Map(
    insentifPeriode.map((i) => [i.userId, i.jumlahTransaksi]),
  );
  // Jam lembur & jam kerja fleksibel per karyawan — dihitung PER HARI,
  // ditentukan oleh shift hari itu: hari terjadwal dihitung lembur dari
  // definisi shiftnya (durasi di atas 8 jam, dibulatkan per hari, sisa
  // 30 menit atau lebih ke atas; kecuali masa percobaan — 30 hari pertama
  // sejak tanggal masuk, lembur hari itu 0); hari fleksibel dihitung dari jam kerja
  // nyata (jumlah cycle absen hari itu, 1–3 cycle diakumulasi, dibulatkan
  // per hari dengan aturan yang sama). Hari alpa/izin/off tidak dihitung
  // keduanya; shift fleksibel tidak dihitung lembur.
  // Hari terjadwal karyawan per-jam (gaji pokok manual 0) dihitung juga
  // gaji pokok hariannya: durasi shift hari itu (maksimal 8 jam,
  // dibulatkan per hari dengan aturan yang sama) — jam masuk-keluar
  // nyata tidak dilihat, jadi tidak check-out pun tetap dibayar penuh
  // 1 hari; kalau gaji pokok manual diisi, hitungan ini tidak jalan
  // (gaji bulanan sudah menutupi hari terjadwal).
  const petaJadwal = new Map(
    jadwalPeriode.map((j) => [`${j.userId}|${j.tanggal}`, j.shift]),
  );
  const petaJamLembur = new Map<string, number>();
  const petaJamFleksibel = new Map<string, number>();
  const petaJamShiftBiasa = new Map<string, number>();
  const petaHariShiftBiasa = new Map<string, number>();
  for (const a of absensiPeriode) {
    if (!dihitungHadir(a.status)) continue;
    const shift = petaJadwal.get(`${a.userId}|${a.tanggal}`);
    if (!shift) continue;
    if (shift.mode === "terjadwal") {
      // Masa percobaan: 30 hari pertama sejak tanggal masuk tidak
      // dihitung lembur, berapa pun durasi shiftnya.
      const jam = dalamMasaPercobaan(petaTanggalMasuk.get(a.userId) ?? "", a.tanggal)
        ? 0
        : jamLembur(menitLembur(shift.mulaiMenit, shift.selesaiMenit, shift.mode));
      if (jam > 0) petaJamLembur.set(a.userId, (petaJamLembur.get(a.userId) ?? 0) + jam);
      if ((peta.get(a.userId)?.gajiPokok ?? 0) === 0) {
        const jamHarian = jamShiftBiasa(shift.mulaiMenit, shift.selesaiMenit);
        if (jamHarian > 0) {
          petaJamShiftBiasa.set(a.userId, (petaJamShiftBiasa.get(a.userId) ?? 0) + jamHarian);
          petaHariShiftBiasa.set(a.userId, (petaHariShiftBiasa.get(a.userId) ?? 0) + 1);
        }
      }
    } else {
      // Fleksibel: akumulasi cycle hari itu dulu, baru dibulatkan.
      const jam = jamDibulatkan(menitKerjaCycle(a.cycles ?? []));
      if (jam > 0) petaJamFleksibel.set(a.userId, (petaJamFleksibel.get(a.userId) ?? 0) + jam);
    }
  }
  const baris: BarisPayroll[] = karyawan.map((k) => {
    const p = peta.get(k.id);
    return {
      userId: k.id,
      nama: k.name,
      cabang: k.cabang?.nama ?? "—",
      gajiPokok: p?.gajiPokok ?? 0,
      tunjangan: p?.tunjangan ?? 0,
      hariHadir: petaHadir.get(k.id) ?? 0,
      tunjanganMakan: tunjanganMakanKaryawan(
        petaMakan.get(k.id) ?? true,
        petaHadir.get(k.id) ?? 0,
      ),
      // Lembur dihitung otomatis dari shift terjadwal di atas 8 jam
      // (ikut definisi shift, bukan jam absen nyata) × Rp 12.000 —
      // jam sudah dibulatkan per hari.
      jamLembur: petaJamLembur.get(k.id) ?? 0,
      lembur: upahLembur(petaJamLembur.get(k.id) ?? 0),
      // Gaji pokok fleksibel dihitung otomatis dari jam kerja nyata hari
      // fleksibel (jumlah cycle, dibulatkan per hari) × Rp 12.000 —
      // ditambahkan ke gaji pokok manual di atas.
      jamFleksibel: petaJamFleksibel.get(k.id) ?? 0,
      gajiPokokFleksibel: upahPerJam(petaJamFleksibel.get(k.id) ?? 0),
      // Gaji pokok harian dihitung otomatis dari durasi shift hari
      // terjadwal (maksimal 8 jam, dibulatkan per hari) × Rp 12.000 —
      // hanya bila gaji pokok manual 0 (karyawan per-jam); kalau manual
      // diisi, komponen ini 0 supaya tidak dobel.
      hariShiftBiasa: petaHariShiftBiasa.get(k.id) ?? 0,
      jamShiftBiasa: petaJamShiftBiasa.get(k.id) ?? 0,
      gajiPokokHarian: upahPerJam(petaJamShiftBiasa.get(k.id) ?? 0),
      // Potongan telat dihitung otomatis dari menit telat tercatat
      // (sudah dikurangi toleransi shift) × Rp 1.000 — bukan dari nilai
      // lama yang tersimpan di tabel Payroll.
      potonganTelat: potonganTelat(petaTelat.get(k.id) ?? 0),
      kasbon: p?.kasbon ?? 0,
      insentif: petaInsentif.get(k.id) ?? 0,
      menitTelatRekap: petaTelat.get(k.id) ?? 0,
      kasbonDisetujuiSisa: petaKasbonSisa.get(k.id) ?? 0,
      insentifTransaksi: petaInsentifTransaksi.get(k.id) ?? 0,
    };
  });

  return { baris, total: totalPayroll(baris), jendela, rentang };
}
