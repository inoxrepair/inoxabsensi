import { describe, expect, it } from "vitest";
import {
  akhirInformasi,
  apakahInformasiAktif,
  bacaAksiCta,
  informasiAktifHariIni,
  informasiSkema,
  type InformasiItem,
} from "./informasi";

function pesan(
  ubah: Partial<InformasiItem> = {},
): InformasiItem {
  return {
    id: "p1",
    judul: "Libur Hari Raya",
    isi: "Toko tutup.",
    ctaLabel: "Mengerti",
    ctaAksi: "tutup",
    ctaTautan: null,
    ctaHalaman: null,
    mulaiTanggal: "2026-11-14",
    durasiHari: 3,
    aktif: true,
    dibuatPada: "2026-11-14",
    ...ubah,
  };
}

describe("akhirInformasi", () => {
  it("durasi 1 hari = tanggal mulai itu sendiri", () => {
    expect(akhirInformasi("2026-11-14", 1)).toBe("2026-11-14");
  });
  it("durasi 3 hari dari 14/11 = 16/11", () => {
    expect(akhirInformasi("2026-11-14", 3)).toBe("2026-11-16");
  });
  it("melewati batas bulan", () => {
    expect(akhirInformasi("2026-11-30", 3)).toBe("2026-12-02");
  });
});

describe("apakahInformasiAktif", () => {
  it("aktif dalam masa tampil", () => {
    expect(apakahInformasiAktif(pesan(), "2026-11-14")).toBe(true);
    expect(apakahInformasiAktif(pesan(), "2026-11-16")).toBe(true);
  });
  it("tidak tampil sebelum mulai atau sesudah berakhir", () => {
    expect(apakahInformasiAktif(pesan(), "2026-11-13")).toBe(false);
    expect(apakahInformasiAktif(pesan(), "2026-11-17")).toBe(false);
  });
  it("toggle nonaktif mematikan walau dalam masa tampil", () => {
    expect(apakahInformasiAktif(pesan({ aktif: false }), "2026-11-14")).toBe(
      false,
    );
  });
});

describe("informasiAktifHariIni", () => {
  it("menyaring yang aktif hari ini, terbaru dulu", () => {
    const daftar = [
      pesan({ id: "lama", dibuatPada: "2026-11-12" }),
      pesan({ id: "baru", dibuatPada: "2026-11-14" }),
      pesan({ id: "mati", aktif: false, dibuatPada: "2026-11-15" }),
      pesan({ id: "nanti", mulaiTanggal: "2026-11-20", dibuatPada: "2026-11-15" }),
    ];
    const hasil = informasiAktifHariIni(daftar, "2026-11-14");
    expect(hasil.map((p) => p.id)).toEqual(["baru", "lama"]);
  });
});

describe("bacaAksiCta", () => {
  it("mengenal tiga aksi, fallback tutup", () => {
    expect(bacaAksiCta("tautan")).toBe("tautan");
    expect(bacaAksiCta("halaman")).toBe("halaman");
    expect(bacaAksiCta("aneh")).toBe("tutup");
  });
});

describe("informasiSkema", () => {
  const dasar = {
    judul: "Libur",
    isi: "Toko tutup.",
    ctaLabel: "Mengerti",
    ctaAksi: "tutup",
    ctaTautan: "",
    ctaHalaman: "",
    mulaiTanggal: "2026-11-14",
    durasiHari: "3",
    aktif: true,
  };

  it("menerima pesan tutup tanpa tautan/halaman", () => {
    expect(informasiSkema.safeParse(dasar).success).toBe(true);
  });
  it("menolak judul/isi kosong dan durasi di luar 1–365", () => {
    expect(informasiSkema.safeParse({ ...dasar, judul: "" }).success).toBe(
      false,
    );
    expect(informasiSkema.safeParse({ ...dasar, isi: "  " }).success).toBe(
      false,
    );
    expect(informasiSkema.safeParse({ ...dasar, durasiHari: "0" }).success).toBe(
      false,
    );
    expect(
      informasiSkema.safeParse({ ...dasar, durasiHari: "366" }).success,
    ).toBe(false);
  });
  it("aksi tautan wajib isi URL http(s)", () => {
    expect(
      informasiSkema.safeParse({ ...dasar, ctaAksi: "tautan" }).success,
    ).toBe(false);
    expect(
      informasiSkema.safeParse({
        ...dasar,
        ctaAksi: "tautan",
        ctaTautan: "ftp://contoh.id",
      }).success,
    ).toBe(false);
    expect(
      informasiSkema.safeParse({
        ...dasar,
        ctaAksi: "tautan",
        ctaTautan: "https://contoh.id/form",
      }).success,
    ).toBe(true);
  });
  it("aksi halaman wajib pilih halaman yang dikenal", () => {
    expect(
      informasiSkema.safeParse({ ...dasar, ctaAksi: "halaman" }).success,
    ).toBe(false);
    expect(
      informasiSkema.safeParse({
        ...dasar,
        ctaAksi: "halaman",
        ctaHalaman: "/karyawan/izin",
      }).success,
    ).toBe(true);
  });
});
