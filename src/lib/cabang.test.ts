import { describe, expect, it } from "vitest";
import { cabangSkema, RADIUS_MAKS, RADIUS_MIN } from "./cabang";

/** Bentuk FormData yang valid, semua nilai string seperti dari browser. */
function form(ubah: Record<string, string | undefined> = {}) {
  return {
    nama: "iNox Kotamobagu",
    kota: "Kotamobagu",
    lat: "0.7333",
    lng: "124.3167",
    radiusMeter: "100",
    aktif: "on",
    ...ubah,
  };
}

function galat(ubah: Record<string, string | undefined>) {
  const h = cabangSkema.safeParse(form(ubah));
  return h.success ? null : h.error.issues[0].message;
}

describe("cabangSkema", () => {
  it("menerima data valid dan mengubah string ke angka", () => {
    const h = cabangSkema.safeParse(form());
    expect(h.success).toBe(true);
    if (h.success) {
      expect(h.data).toEqual({
        nama: "iNox Kotamobagu",
        kota: "Kotamobagu",
        lat: 0.7333,
        lng: 124.3167,
        radiusMeter: 100,
        aktif: true,
      });
    }
  });

  it("memangkas spasi pada teks", () => {
    const h = cabangSkema.safeParse(form({ nama: "  iNox Manado  " }));
    if (h.success) expect(h.data.nama).toBe("iNox Manado");
  });

  it("checkbox tidak dicentang berarti nonaktif", () => {
    const h = cabangSkema.safeParse(form({ aktif: undefined }));
    if (h.success) expect(h.data.aktif).toBe(false);
  });

  it("menerima koordinat negatif", () => {
    const h = cabangSkema.safeParse(form({ lat: "-6.2", lng: "-106.8" }));
    expect(h.success).toBe(true);
  });

  it("menolak nama terlalu pendek", () => {
    expect(galat({ nama: "iN" })).toMatch(/minimal 3 karakter/);
  });

  it("menolak latitude di luar rentang", () => {
    expect(galat({ lat: "91" })).toMatch(/-90 dan 90/);
    expect(galat({ lat: "-91" })).toMatch(/-90 dan 90/);
  });

  it("menolak longitude di luar rentang", () => {
    expect(galat({ lng: "181" })).toMatch(/-180 dan 180/);
  });

  it("menerima batas koordinat yang sah", () => {
    expect(cabangSkema.safeParse(form({ lat: "90", lng: "180" })).success).toBe(
      true,
    );
  });

  it("menolak koordinat kosong dan bukan angka", () => {
    expect(galat({ lat: "" })).toMatch(/wajib diisi/);
    expect(galat({ lat: "abc" })).toBeTruthy();
  });

  it("menolak radius di luar batas aman", () => {
    expect(galat({ radiusMeter: String(RADIUS_MIN - 1) })).toMatch(
      /minimal 10 meter/,
    );
    expect(galat({ radiusMeter: String(RADIUS_MAKS + 1) })).toMatch(
      /maksimal 5000 meter/,
    );
  });

  it("menerima radius di batas", () => {
    expect(
      cabangSkema.safeParse(form({ radiusMeter: String(RADIUS_MIN) })).success,
    ).toBe(true);
    expect(
      cabangSkema.safeParse(form({ radiusMeter: String(RADIUS_MAKS) })).success,
    ).toBe(true);
  });

  it("menolak radius desimal", () => {
    expect(galat({ radiusMeter: "100.5" })).toMatch(/bilangan bulat/);
  });
});
