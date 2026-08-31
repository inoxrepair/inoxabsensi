import { describe, expect, it } from "vitest";
import { bolehKeluar, bolehMasuk, ringkas, type KondisiAbsen } from "./absensi";

const CABANG = { lat: 0.7333, lng: 124.3167, radiusMeter: 100 };
const DI_DALAM = { lat: 0.7333 + 0.0003, lng: 124.3167 }; // ~33 m
const DI_LUAR = { lat: 0.7333 + 0.005, lng: 124.3167 }; // ~550 m
const SHIFT = { mulaiMenit: 540, selesaiMenit: 1020, toleransiMenit: 10 };

function kondisi(ubah: Partial<KondisiAbsen> = {}): KondisiAbsen {
  return {
    shift: SHIFT,
    cabang: CABANG,
    posisi: DI_DALAM,
    masukMenit: null,
    keluarMenit: null,
    statusTercatat: null,
    ...ubah,
  };
}

describe("bolehMasuk", () => {
  it("hadir bila datang dalam toleransi", () => {
    const h = bolehMasuk(kondisi(), 545);
    expect(h).toMatchObject({ ok: true, status: "hadir", menitTelat: 0 });
  });

  it("tepat di batas toleransi masih hadir", () => {
    expect(bolehMasuk(kondisi(), 550)).toMatchObject({ status: "hadir" });
  });

  it("satu menit setelah toleransi jadi telat", () => {
    expect(bolehMasuk(kondisi(), 551)).toMatchObject({
      status: "telat",
      menitTelat: 1,
    });
  });

  it("mengembalikan jarak terbulat untuk disimpan", () => {
    const h = bolehMasuk(kondisi(), 540);
    expect(h).toMatchObject({ ok: true, jarakMeter: 33 });
  });

  it("menolak bila di luar radius dan menyebut jarak", () => {
    const h = bolehMasuk(kondisi({ posisi: DI_LUAR }), 540);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.alasan).toMatch(/di luar radius 100 m/);
  });

  it("menolak bila tidak ada jadwal shift", () => {
    const h = bolehMasuk(kondisi({ shift: null }), 540);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.alasan).toMatch(/Tidak ada jadwal/);
  });

  it("menolak absen ganda", () => {
    const h = bolehMasuk(kondisi({ masukMenit: 540 }), 600);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.alasan).toMatch(/sudah absen masuk/);
  });

  it("menolak bila lokasi tidak terdeteksi", () => {
    expect(bolehMasuk(kondisi({ posisi: null }), 540).ok).toBe(false);
  });

  it("menolak bila karyawan belum punya cabang", () => {
    expect(bolehMasuk(kondisi({ cabang: null }), 540).ok).toBe(false);
  });

  it("menolak bila sudah tercatat izin", () => {
    const h = bolehMasuk(kondisi({ statusTercatat: "izin" }), 540);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.alasan).toMatch(/tercatat izin/);
  });

  it("cek jadwal didahulukan sebelum cek lokasi", () => {
    // Tanpa shift dan di luar radius: pesan harus soal jadwal.
    const h = bolehMasuk(kondisi({ shift: null, posisi: DI_LUAR }), 540);
    if (!h.ok) expect(h.alasan).toMatch(/jadwal/);
  });
});

describe("bolehKeluar", () => {
  it("menghitung durasi kerja", () => {
    const h = bolehKeluar(kondisi({ masukMenit: 540 }), 1020);
    expect(h).toMatchObject({ ok: true, durasiMenit: 480 });
  });

  it("durasi benar untuk shift lewat tengah malam", () => {
    const h = bolehKeluar(kondisi({ masukMenit: 1320 }), 240);
    expect(h).toMatchObject({ durasiMenit: 360 });
  });

  it("menolak bila belum absen masuk", () => {
    const h = bolehKeluar(kondisi(), 1020);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.alasan).toMatch(/belum absen masuk/);
  });

  it("menolak absen keluar ganda", () => {
    const h = bolehKeluar(kondisi({ masukMenit: 540, keluarMenit: 1020 }), 1100);
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.alasan).toMatch(/sudah absen keluar/);
  });

  it("tetap memvalidasi radius saat check-out", () => {
    const h = bolehKeluar(kondisi({ masukMenit: 540, posisi: DI_LUAR }), 1020);
    expect(h.ok).toBe(false);
  });
});

describe("ringkas", () => {
  it("menghitung tiap status", () => {
    expect(ringkas(["hadir", "hadir", "telat", "izin"])).toEqual({
      hadir: 2,
      telat: 1,
      izin: 1,
      alpa: 0,
      libur: 0,
    });
  });

  it("array kosong menghasilkan nol semua", () => {
    expect(ringkas([])).toEqual({
      hadir: 0,
      telat: 0,
      izin: 0,
      alpa: 0,
      libur: 0,
    });
  });
});
