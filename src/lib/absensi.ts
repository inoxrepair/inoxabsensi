import { periksaRadius, type Koordinat } from "@/lib/geo";
import { durasiMenit, menitTelat } from "@/lib/waktu";
import type { StatusAbsensi } from "@/lib/domain";

/**
 * Aturan absensi murni (tanpa I/O) supaya bisa diuji langsung.
 * Server action di app/karyawan/actions.ts yang mengurus database.
 */

export type Shift = {
  mulaiMenit: number;
  selesaiMenit: number;
  toleransiMenit: number;
  mode?: string;
  minimumKerjaMenit?: number | null;
};

export type KondisiAbsen = {
  /** Shift terjadwal; null berarti hari libur. */
  shift: Shift | null;
  cabang: (Koordinat & { radiusMeter: number }) | null;
  posisi: Koordinat | null;
  /** Menit check-in yang sudah tercatat, null bila belum absen masuk. */
  masukMenit: number | null;
  keluarMenit: number | null;
  /**
   * Status baris absensi yang sudah ada. Baris bisa dibuat lebih dulu oleh
   * admin (izin) atau proses harian (alpa), jadi perlu diperiksa terpisah
   * dari masukMenit.
   */
  statusTercatat: StatusAbsensi | null;
  jumlahCycle: number;
  maksimalCycle: number;
};

export type Penolakan = { ok: false; alasan: string };
export type IzinMasuk = {
  ok: true;
  status: Extract<StatusAbsensi, "hadir" | "telat">;
  jarakMeter: number;
  menitTelat: number;
};
export type IzinKeluar = { ok: true; jarakMeter: number; durasiMenit: number };

/** Validasi bersama check-in dan check-out: lokasi wajib dan harus dalam radius. */
function periksaLokasi(k: KondisiAbsen): Penolakan | { ok: true; jarak: number } {
  if (!k.cabang) {
    return { ok: false, alasan: "Anda belum ditempatkan di cabang mana pun." };
  }
  if (!k.posisi) {
    return { ok: false, alasan: "Lokasi perangkat tidak terdeteksi." };
  }

  const { dalamRadius, jarakMeter } = periksaRadius(k.posisi, k.cabang);
  if (!dalamRadius) {
    return {
      ok: false,
      alasan: `Anda ${jarakMeter} m dari cabang, di luar radius ${k.cabang.radiusMeter} m.`,
    };
  }
  return { ok: true, jarak: jarakMeter };
}

export function bolehMasuk(
  k: KondisiAbsen,
  sekarangMenit: number,
): IzinMasuk | Penolakan {
  if (!k.shift) {
    return { ok: false, alasan: "Tidak ada jadwal shift hari ini." };
  }
  if (k.masukMenit !== null && k.keluarMenit === null) {
    return { ok: false, alasan: "Selesaikan cycle aktif sebelum absen masuk lagi." };
  }
  if (k.jumlahCycle >= k.maksimalCycle) {
    return { ok: false, alasan: `Batas ${k.maksimalCycle} cycle hari ini sudah tercapai.` };
  }
  if (k.statusTercatat === "izin") {
    return { ok: false, alasan: "Anda tercatat izin hari ini." };
  }

  const lokasi = periksaLokasi(k);
  if (!lokasi.ok) return lokasi;

  const fleksibel = k.shift.mode === "fleksibel";
  const telat = fleksibel ? 0 : menitTelat(sekarangMenit, k.shift);
  return {
    ok: true,
    status: telat > 0 ? "telat" : "hadir",
    jarakMeter: lokasi.jarak,
    menitTelat: telat,
  };
}

/** Kekurangan target fleksibel hanya indikator; tidak memblokir check-out. */
export function kekuranganKerja(
  durasi: number,
  minimumKerjaMenit: number | null | undefined,
): number {
  if (minimumKerjaMenit == null) return 0;
  return Math.max(0, minimumKerjaMenit - durasi);
}

export type WaktuCycle = { masukMenit: number; keluarMenit: number | null };

/** Total hanya memakai cycle lengkap; cycle aktif ditandai terpisah. */
export function ringkasCycle(cycles: WaktuCycle[]) {
  return cycles.reduce(
    (hasil, cycle) => {
      if (cycle.keluarMenit === null) {
        hasil.adaCycleAktif = true;
      } else {
        hasil.totalMenit += durasiMenit(cycle.masukMenit, cycle.keluarMenit);
      }
      return hasil;
    },
    { totalMenit: 0, adaCycleAktif: false },
  );
}

export function bolehKeluar(
  k: KondisiAbsen,
  sekarangMenit: number,
): IzinKeluar | Penolakan {
  if (k.masukMenit === null) {
    return { ok: false, alasan: "Anda belum absen masuk hari ini." };
  }
  if (k.keluarMenit !== null) {
    return { ok: false, alasan: "Anda sudah absen keluar hari ini." };
  }

  const lokasi = periksaLokasi(k);
  if (!lokasi.ok) return lokasi;

  return {
    ok: true,
    jarakMeter: lokasi.jarak,
    durasiMenit: durasiMenit(k.masukMenit, sekarangMenit),
  };
}

/** Hitung rekap per status untuk kartu ringkasan. */
export function ringkas(status: StatusAbsensi[]) {
  const awal = { hadir: 0, telat: 0, izin: 0, alpa: 0, libur: 0 };
  return status.reduce((acc, s) => {
    acc[s] += 1;
    return acc;
  }, awal);
}
