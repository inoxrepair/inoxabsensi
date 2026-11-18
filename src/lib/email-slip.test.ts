import { describe, expect, it, vi } from "vitest";
import {
  PRESET_SMTP,
  secureUntukPort,
} from "@/lib/email-smtp-preset";
import {
  buatPengirimSmtp,
  isiEmailSlip,
  kirimEmailSlipDibayar,
  opsiTransportSmtp,
  tujuanEmailTes,
} from "@/lib/email-slip";
import type { SetelanEmailSlip } from "@/lib/pengaturan";

describe("isiEmailSlip", () => {
  it("subjek dan isi memuat nama, periode, dan THP", () => {
    const isi = isiEmailSlip({
      nama: "Fajri Mokodompit",
      rentang: "28/10/2026–27/11/2026",
      diterima: 4982000,
      perusahaan: "iNOX Repair",
    });
    expect(isi.subjek).toContain("Fajri Mokodompit");
    expect(isi.subjek).toContain("28/10/2026–27/11/2026");
    // formatRupiah memakai spasi non-breaking (U+00A0) setelah "Rp",
    // jadi asersi angka dan "Rp" dipisah.
    expect(isi.teks).toContain("Rp");
    expect(isi.teks).toContain("4.982.000");
    expect(isi.teks).toContain("PDF slip gaji terlampir");
    expect(isi.teks).toContain("iNOX Repair");
  });
});

describe("preset SMTP", () => {
  it("Gmail dan Outlook memakai port 587 (STARTTLS)", () => {
    expect(PRESET_SMTP.gmail).toEqual({ host: "smtp.gmail.com", port: 587 });
    expect(PRESET_SMTP.outlook).toEqual({
      host: "smtp-mail.outlook.com",
      port: 587,
    });
    expect(PRESET_SMTP.microsoft365).toEqual({
      host: "smtp.office365.com",
      port: 587,
    });
  });

  it("port 465 = TLS langsung, port 587 = STARTTLS", () => {
    expect(secureUntukPort(465)).toBe(true);
    expect(secureUntukPort(587)).toBe(false);
    expect(secureUntukPort(25)).toBe(false);
  });
});

describe("opsiTransportSmtp", () => {
  const lengkap = {
    host: "smtp.gmail.com",
    port: 587,
    pengirim: "a@gmail.com",
    sandi: "abcd efgh ijkl mnop",
  };

  it("setelan lengkap menghasilkan opsi dengan secure false di port 587", () => {
    expect(opsiTransportSmtp(lengkap)).toEqual({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "a@gmail.com", pass: "abcd efgh ijkl mnop" },
      from: "a@gmail.com",
    });
  });

  it("login terisi: auth user = login, From tetap alamat pengirim", () => {
    const opsi = opsiTransportSmtp({
      ...lengkap,
      host: "smtp-relay.brevo.com",
      login: "c3f773001@smtp-brevo.com",
    });
    expect(opsi?.auth.user).toBe("c3f773001@smtp-brevo.com");
    expect(opsi?.from).toBe("a@gmail.com");
  });

  it("login kosong: auth user = alamat pengirim (perilaku lama Gmail/Outlook)", () => {
    expect(opsiTransportSmtp({ ...lengkap, login: "" })?.auth.user).toBe(
      "a@gmail.com",
    );
    expect(opsiTransportSmtp(lengkap)?.auth.user).toBe("a@gmail.com");
    expect(opsiTransportSmtp(lengkap)?.from).toBe("a@gmail.com");
  });

  it("login lebih dari 200 karakter: null", () => {
    expect(
      opsiTransportSmtp({ ...lengkap, login: "x".repeat(201) }),
    ).toBeNull();
  });

  it("port 465 menghasilkan secure true", () => {
    expect(opsiTransportSmtp({ ...lengkap, port: 465 })?.secure).toBe(true);
  });

  it("null bila ada field kosong atau port tidak valid", () => {
    expect(opsiTransportSmtp({ ...lengkap, host: "  " })).toBeNull();
    expect(opsiTransportSmtp({ ...lengkap, pengirim: "" })).toBeNull();
    expect(opsiTransportSmtp({ ...lengkap, sandi: "" })).toBeNull();
    expect(opsiTransportSmtp({ ...lengkap, port: 0 })).toBeNull();
    expect(opsiTransportSmtp({ ...lengkap, port: 70000 })).toBeNull();
    expect(opsiTransportSmtp({ ...lengkap, port: 587.5 })).toBeNull();
  });
});

describe("buatPengirimSmtp", () => {
  it("null bila setelan belum lengkap", () => {
    expect(
      buatPengirimSmtp({
        host: "",
        port: 587,
        pengirim: "a@gmail.com",
        sandi: "x",
      }),
    ).toBeNull();
  });

  it("mengembalikan fungsi kirim bila setelan lengkap", () => {
    expect(
      buatPengirimSmtp({
        host: "smtp-mail.outlook.com",
        port: 587,
        pengirim: "a@outlook.com",
        sandi: "x",
      }),
    ).toEqual(expect.any(Function));
  });
});

const SETELAN_AKTIF: SetelanEmailSlip = {
  aktif: true,
  preset: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  pengirim: "a@gmail.com",
  sandi: "x",
  login: "",
  emailTesKe: "",
};

describe("tujuanEmailTes", () => {
  it("tujuan tes terisi: tes dikirim ke alamat itu, bukan ke pengirim", () => {
    expect(tujuanEmailTes("a@gmail.com", "pribadi@gmail.com")).toBe(
      "pribadi@gmail.com",
    );
  });

  it("tujuan tes kosong: tes dikirim ke alamat pengirim (perilaku lama)", () => {
    expect(tujuanEmailTes("a@gmail.com", "")).toBe("a@gmail.com");
    expect(tujuanEmailTes("a@gmail.com", "   ")).toBe("a@gmail.com");
  });

  it("tujuan tes tidak valid: null — pemanggil menolak sebelum mengirim", () => {
    expect(tujuanEmailTes("a@gmail.com", "bukan-email")).toBeNull();
    expect(tujuanEmailTes("a@gmail.com", "a @gmail.com")).toBeNull();
    expect(tujuanEmailTes("a@gmail.com", `${"x".repeat(195)}@gmail.com`)).toBeNull();
  });
});

describe("kirimEmailSlipDibayar", () => {
  it("toggle nonaktif: dilewati tanpa upaya kirim dan tanpa menyentuh database", async () => {
    const pengirim = vi.fn(async () => {});
    const hasil = await kirimEmailSlipDibayar("id-apa-saja", {
      pengirim,
      setelan: { ...SETELAN_AKTIF, aktif: false },
    });
    expect(hasil).toEqual({ terkirim: false, alasan: "", dilewati: true });
    expect(pengirim).not.toHaveBeenCalled();
  });

  it("toggle aktif tapi transport tidak bisa dibuat: gagal dengan pesan yang mengarah ke Pengaturan", async () => {
    const hasil = await kirimEmailSlipDibayar("id-apa-saja", {
      pengirim: null,
      setelan: SETELAN_AKTIF,
    });
    expect(hasil).toEqual({
      terkirim: false,
      alasan:
        "Email slip belum dikonfigurasi — lengkapi di menu Pengaturan → Email Slip Gaji.",
    });
  });
});
