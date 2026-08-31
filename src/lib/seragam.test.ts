import { describe, expect, it } from "vitest";
import { seragamSkema } from "./seragam";

function form(ubah: Record<string, string | undefined> = {}) {
  return {
    kode: "srg-a",
    nama: "Seragam Kerja A",
    deskripsi: "Kemeja kerja",
    aktif: "on",
    ...ubah,
  };
}

describe("seragamSkema", () => {
  it("menormalkan kode ke uppercase", () => {
    const h = seragamSkema.safeParse(form());
    expect(h.success).toBe(true);
    if (h.success) expect(h.data.kode).toBe("SRG-A");
  });

  it("checkbox kosong berarti nonaktif", () => {
    const h = seragamSkema.safeParse(form({ aktif: undefined }));
    if (h.success) expect(h.data.aktif).toBe(false);
  });

  it("deskripsi kosong menjadi null", () => {
    const h = seragamSkema.safeParse(form({ deskripsi: "" }));
    if (h.success) expect(h.data.deskripsi).toBeNull();
  });

  it("menolak kode dengan spasi", () => {
    expect(seragamSkema.safeParse(form({ kode: "SRG A" })).success).toBe(false);
  });

  it("menolak nama terlalu pendek", () => {
    expect(seragamSkema.safeParse(form({ nama: "AB" })).success).toBe(false);
  });
});
