import { describe, expect, it } from "vitest";
import { kirimPesanSkema, BATAS_CHAT_MS, BATAS_CHAT_JAM, BATAS_MENGETIK_MS, INTERVAL_MENGETIK_MS } from "@/lib/chat";

describe("kirimPesanSkema", () => {
  it("teks saja lolos", () => {
    expect(kirimPesanSkema.safeParse({ isi: "Halo semua", adaFoto: false }).success).toBe(true);
  });

  it("foto saja lolos (isi kosong)", () => {
    expect(kirimPesanSkema.safeParse({ isi: "  ", adaFoto: true }).success).toBe(true);
  });

  it("voice note saja lolos (isi kosong)", () => {
    expect(kirimPesanSkema.safeParse({ isi: "  ", adaSuara: true }).success).toBe(true);
  });

  it("teks + foto lolos", () => {
    expect(kirimPesanSkema.safeParse({ isi: "Lihat ini", adaFoto: true }).success).toBe(true);
  });

  it("kosong tanpa foto/suara ditolak", () => {
    const hasil = kirimPesanSkema.safeParse({ isi: "   " });
    expect(hasil.success).toBe(false);
    if (!hasil.success) {
      expect(hasil.error.issues[0].message).toBe("Tulis pesan, pilih foto, atau rekam suara dulu.");
    }
  });

  it("isi lebih dari 1000 karakter ditolak", () => {
    const hasil = kirimPesanSkema.safeParse({ isi: "x".repeat(1001), adaFoto: false });
    expect(hasil.success).toBe(false);
  });
});

describe("batas chat", () => {
  it("24 jam dalam milidetik", () => {
    expect(BATAS_CHAT_JAM).toBe(24);
    expect(BATAS_CHAT_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("indikator mengetik kedaluwarsa 8 detik, ping tiap 3 detik", () => {
    expect(BATAS_MENGETIK_MS).toBe(8000);
    expect(INTERVAL_MENGETIK_MS).toBe(3000);
    expect(BATAS_MENGETIK_MS).toBeGreaterThan(INTERVAL_MENGETIK_MS);
  });
});
