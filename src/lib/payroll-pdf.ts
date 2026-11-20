import { Buffer } from "node:buffer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatTanggal } from "@/lib/format";
import type { BarisLogSlip } from "@/lib/log-absensi-slip";
import {
  takeHomePay,
  TARIF_LEMBUR_PER_JAM,
  TARIF_PER_JAM,
  TARIF_POTONGAN_TELAT_PER_MENIT,
  TARIF_TUNJANGAN_MAKAN_PER_HARI,
  totalPayroll,
  type BarisPayroll,
} from "@/lib/payroll";
import { labelPeriode, type KeadaanHari } from "@/lib/rekap";
import { formatDurasi, keJam, namaHari } from "@/lib/waktu";

/**
 * Laporan payroll satu periode (semua karyawan) sebagai PDF.
 * A4 landscape supaya 10 kolom angka muat tanpa mengecilkan huruf
 * berlebihan. Satu sumber dengan halaman Payroll: data baris dihitung
 * oleh hitungPayroll (lib/payroll-data) dan dilewatkan ke sini.
 */

// A4 landscape: 841.89 × 595.28.
const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
// A4 portrait (untuk slip gaji): 595.28 × 841.89.
const A4: [number, number] = [595.28, 841.89];
const MARGIN = 36;
const LEBAR_CETAK = A4_LANDSCAPE[0] - MARGIN * 2; // 769.89
const LEBAR_SLIP = A4[0] - MARGIN * 2; // 523.28
const TINGGI_BARIS = 24;

export type DataPayrollPdf = {
  periode: string;
  rentang: { dari: string; sampai: string };
  jendelaKustom: boolean;
  jendela: { dari: string; sampai: string };
  /** Nama cabang yang difilter; null = semua cabang. */
  cabang: string | null;
  baris: BarisPayroll[];
  total: ReturnType<typeof totalPayroll>;
};

/** Rupiah tanpa awalan "Rp" (kolom sudah jelas rupiah). */
function rupiah(n: number): string {
  return n.toLocaleString("id-ID");
}

const kolom: { judul: string; lebar: number; rata: "kiri" | "tengah" | "kanan" }[] = [
  { judul: "No", lebar: 24, rata: "tengah" },
  { judul: "Karyawan", lebar: 140, rata: "kiri" },
  { judul: "Gaji Pokok", lebar: 76, rata: "kanan" },
  { judul: "Tunjangan", lebar: 72, rata: "kanan" },
  { judul: "Tunj. Makan", lebar: 76, rata: "kanan" },
  { judul: "Lembur", lebar: 76, rata: "kanan" },
  { judul: "Insentif", lebar: 76, rata: "kanan" },
  { judul: "Potongan", lebar: 72, rata: "kanan" },
  { judul: "Kasbon", lebar: 72, rata: "kanan" },
  { judul: "Diterima", lebar: 85, rata: "kanan" },
];

export async function buatPayrollPdf(data: DataPayrollPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  let page = pdf.addPage(A4_LANDSCAPE);
  const { width, height } = page.getSize();
  let y = height - MARGIN;

  const tutupHalaman = (p: typeof page) => {
    p.drawText(`Dibuat otomatis oleh iNox Absensi · ${tanggalCetak}`, {
      x: MARGIN,
      y: 22,
      size: 7,
      font: regular,
      color: rgb(0.5, 0.5, 0.5),
    });
  };

  // Judul + keterangan periode.
  page.drawText("Laporan Payroll", {
    x: MARGIN,
    y,
    size: 16,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  y -= 22;
  const info = [
    `Periode: ${labelPeriode(data.periode)} (${formatTanggal(data.rentang.dari)}–${formatTanggal(data.rentang.sampai)})`,
    `Cabang: ${data.cabang ?? "Semua cabang"}`,
  ];
  if (data.jendelaKustom) {
    info.push(
      `Hitungan hadir/telat, insentif, lembur, gaji pokok fleksibel, dan gaji pokok harian dibatasi ${formatTanggal(data.jendela.dari)}–${formatTanggal(data.jendela.sampai)} (rentang kustom)`,
    );
  }
  info.push("Semua nilai dalam rupiah.");
  info.forEach((teks) => {
    page.drawText(teks, {
      x: MARGIN,
      y,
      size: 9,
      font: regular,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 13;
  });
  y -= 6;
  page.drawText(
    `${data.baris.length} karyawan · Total dibayarkan: Rp ${rupiah(data.total.diterima)}`,
    { x: MARGIN, y, size: 9, font: bold, color: rgb(0.1, 0.1, 0.1) },
  );
  y -= 18;

  const gambarHeader = () => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: LEBAR_CETAK,
      height: 18,
      color: rgb(0.95, 0.95, 0.96),
    });
    let x = MARGIN;
    kolom.forEach((k) => {
      const lebarTeks = bold.widthOfTextAtSize(k.judul, 8);
      const posisiX =
        k.rata === "kanan"
          ? x + k.lebar - lebarTeks - 2
          : k.rata === "tengah"
            ? x + Math.max(2, (k.lebar - lebarTeks) / 2)
            : x + 2;
      page.drawText(k.judul, {
        x: posisiX,
        y,
        size: 8,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += k.lebar;
    });
    y -= 18;
  };

  const gambarBaris = (sel: string[], sub: string | null, tebal: boolean) => {
    let x = MARGIN;
    const font = tebal ? bold : regular;
    sel.forEach((teks, i) => {
      const { lebar, rata } = kolom[i];
      const size = 8.5;
      const lebarTeks = font.widthOfTextAtSize(teks, size);
      const posisiX =
        rata === "kanan"
          ? x + lebar - lebarTeks - 2
          : rata === "tengah"
            ? x + Math.max(2, (lebar - lebarTeks) / 2)
            : x + 2;
      page.drawText(teks, {
        x: posisiX,
        y,
        size,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += lebar;
    });
    // Baris kedua kolom Karyawan: cabang + hari hadir + menit telat.
    if (sub) {
      page.drawText(sub, {
        x: MARGIN + kolom[0].lebar + 2,
        y: y - 10,
        size: 7,
        font: regular,
        color: rgb(0.45, 0.45, 0.45),
      });
    }
    y -= TINGGI_BARIS;
  };

  const halamanBaru = () => {
    tutupHalaman(page);
    page = pdf.addPage(A4_LANDSCAPE);
    y = height - MARGIN;
    gambarHeader();
  };

  if (data.baris.length === 0) {
    page.drawText("Belum ada karyawan aktif pada lingkup ini.", {
      x: MARGIN,
      y,
      size: 9,
      font: regular,
      color: rgb(0.3, 0.3, 0.3),
    });
  } else {
    gambarHeader();
    data.baris.forEach((r, i) => {
      if (y - TINGGI_BARIS < MARGIN + 44) halamanBaru();
      // Sub-baris karyawan: cabang + hari hadir + menit telat; jam
      // lembur/fleksibel hanya bila ada (supaya baris tetap pendek).
      const subBagian = [
        `${r.cabang}`,
        `${r.hariHadir} hari hadir`,
        `${r.menitTelatRekap} mnt telat`,
      ];
      if (r.jamLembur > 0) subBagian.push(`${r.jamLembur} jam lembur`);
      if (r.jamFleksibel > 0) subBagian.push(`${r.jamFleksibel} jam fleksibel`);
      if (r.jamShiftBiasa > 0)
        subBagian.push(`${r.jamShiftBiasa} jam shift biasa (${r.hariShiftBiasa} hari)`);
      gambarBaris(
        [
          String(i + 1),
          r.nama,
          rupiah(r.gajiPokok + r.gajiPokokFleksibel + r.gajiPokokHarian),
          rupiah(r.tunjangan),
          rupiah(r.tunjanganMakan),
          rupiah(r.lembur),
          rupiah(r.insentif),
          rupiah(r.potonganTelat),
          rupiah(r.kasbon),
          rupiah(takeHomePay(r)),
        ],
        subBagian.join(" · "),
        false,
      );
    });

    // Baris total (pindah halaman bila tidak muat). Arsiran hanya 16
    // tinggi, bukan TINGGI_BARIS penuh, supaya tidak menutupi sub-baris
    // (cabang/hari hadir/jam) pada baris karyawan terakhir di atasnya.
    if (y - TINGGI_BARIS < MARGIN + 44) halamanBaru();
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: LEBAR_CETAK,
      height: 16,
      color: rgb(0.95, 0.95, 0.96),
    });
    gambarBaris(
      [
        "",
        `TOTAL (${data.baris.length} karyawan)`,
        rupiah(data.total.gajiPokok + data.total.gajiPokokFleksibel + data.total.gajiPokokHarian),
        rupiah(data.total.tunjangan),
        rupiah(data.total.tunjanganMakan),
        rupiah(data.total.lembur),
        rupiah(data.total.insentif),
        rupiah(data.total.potonganTelat),
        rupiah(data.total.kasbon),
        rupiah(data.total.diterima),
      ],
      null,
      true,
    );
  }

  // Catatan rumus di bawah tabel.
  y -= 4;
  const catatan = [
    "Gaji diterima = gaji pokok (manual + fleksibel + harian) + tunjangan + tunjangan makan + lembur + insentif - potongan - kasbon.",
    `Tunjangan makan = ${rupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} × hari hadir (hadir/telat); potongan telat = ${rupiah(TARIF_POTONGAN_TELAT_PER_MENIT)} × menit telat tercatat (sudah dikurangi toleransi shift).`,
    `Lembur = ${rupiah(TARIF_LEMBUR_PER_JAM)} × jam lembur (shift terjadwal di atas 8 jam, ikut definisi shift; sisa 30 menit atau lebih dibulatkan ke atas, per hari).`,
    `Gaji pokok fleksibel = ${rupiah(TARIF_PER_JAM)} × jam kerja hari fleksibel (jumlah cycle absen hari itu, dibulatkan per hari dengan aturan yang sama).`,
    `Gaji pokok harian = ${rupiah(TARIF_PER_JAM)} × jam shift biasa (karyawan yang gaji pokok manualnya 0: hari shift terjadwal yang hadir/telat dibayar penuh sesuai durasi shift, maksimal 8 jam, dibulatkan per hari dengan aturan yang sama).`,
    "Kasbon = potongan kasbon periode ini. Insentif dari sinkron inox.my.id (menu Insentif).",
  ];
  catatan.forEach((teks) => {
    page.drawText(teks, {
      x: MARGIN,
      y,
      size: 7.5,
      font: regular,
      color: rgb(0.45, 0.45, 0.45),
    });
    y -= 11;
  });

  tutupHalaman(page);
  return pdf.save();
}

/** Status slip untuk PDF (dari snapshot; "belum" bila belum dibuat). */
export type StatusSlipPdf = "belum" | "dibuat" | "dibayar";

export const LABEL_STATUS_SLIP: Record<StatusSlipPdf, string> = {
  belum: "Belum dibuat",
  dibuat: "Sudah dibuat",
  dibayar: "Sudah dibayar",
};

/**
 * Data URL logo -> bytes + jenisnya, bila PNG/JPEG (yang didukung pdf-lib).
 * null bila tidak ada logo atau formatnya tidak didukung (mis. WebP/SVG).
 */
export function parseLogoDataUrl(
  dataUrl: string | null | undefined,
): { bytes: Uint8Array; png: boolean } | null {
  if (!dataUrl) return null;
  const cocok = /^data:(image\/(png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(
    dataUrl.trim(),
  );
  if (!cocok) return null;
  try {
    return {
      bytes: Uint8Array.from(Buffer.from(cocok[3], "base64")),
      png: cocok[2] === "png",
    };
  } catch {
    return null;
  }
}

/** Slip gaji satu karyawan (A4 portrait, dua halaman: rincian + log absensi). */
export type DataSlipPayrollPdf = {
  periode: string;
  rentang: { dari: string; sampai: string };
  jendelaKustom: boolean;
  jendela: { dari: string; sampai: string };
  /** Nama perusahaan — tampil di kop slip (diatur di Pengaturan). */
  perusahaan: string;
  baris: BarisPayroll;
  /** Log absensi karyawan dalam jendela hitung — tampil di halaman 2. */
  log: BarisLogSlip[];
  /** Data URL logo (PNG/JPEG) dari Pengaturan — tampil kiri atas bila ada. */
  logoDataUrl?: string | null;
  /** Status slip dari snapshot; "belum" bila belum dibuat (unduh live). */
  status?: StatusSlipPdf;
  /** Tanggal slip dibuat, sudah dd/mm/yyyy — null bila belum dibuat. */
  dibuatPada?: string | null;
  /** Tanggal dibayar, sudah dd/mm/yyyy — null bila belum dibayar. */
  dibayarPada?: string | null;
  /** Nama pembuat / pembayar (tabel Riwayat) — null bila tak diketahui. */
  dibuatOleh?: string | null;
  dibayarOleh?: string | null;
};

export async function buatSlipPayrollPdf(
  data: DataSlipPayrollPdf,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // `page` bisa berpindah ke halaman 2 (log absensi) di akhir fungsi.
  let page = pdf.addPage(A4);
  const { width, height } = page.getSize();
  const r = data.baris;
  let y = height - MARGIN;

  const status = data.status ?? "belum";
  const thp = takeHomePay(r);
  const penghasilan =
    r.gajiPokok +
    r.gajiPokokFleksibel +
    r.gajiPokokHarian +
    r.tunjangan +
    r.tunjanganMakan +
    r.lembur +
    r.insentif;
  const potongan = r.potonganTelat + r.kasbon;
  const sisa = status === "dibayar" ? 0 : thp;

  /** Satu baris rata kanan: label tebal + nilai biasa, berdempetan. */
  const kanan = (
    label: string,
    nilai: string,
    yy: number,
    size: number,
    tebalNilai = false,
  ) => {
    const wLabel = bold.widthOfTextAtSize(label, size);
    const wNilai = (tebalNilai ? bold : regular).widthOfTextAtSize(
      nilai,
      size,
    );
    const xAkhir = width - MARGIN;
    page.drawText(label, {
      x: xAkhir - wLabel - wNilai,
      y: yy,
      size,
      font: bold,
      color: rgb(0.12, 0.12, 0.12),
    });
    page.drawText(nilai, {
      x: xAkhir - wNilai,
      y: yy,
      size,
      font: tebalNilai ? bold : regular,
      color: rgb(0.12, 0.12, 0.12),
    });
  };

  /** Baris total rata kanan: label di kolom sendiri, angka di tepi kanan. */
  const kananKolom = (
    label: string,
    nilai: string,
    yy: number,
    size: number,
    tebal = false,
  ) => {
    const font = tebal ? bold : regular;
    const wLabel = font.widthOfTextAtSize(label, size);
    const wNilai = font.widthOfTextAtSize(nilai, size);
    const xAkhir = width - MARGIN;
    page.drawText(label, {
      x: xAkhir - 130 - wLabel,
      y: yy,
      size,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
    page.drawText(nilai, {
      x: xAkhir - wNilai,
      y: yy,
      size,
      font,
      color: rgb(0.12, 0.12, 0.12),
    });
  };

  /** Satu paragraf kecil yang dibungkus otomatis selebar halaman slip. */
  const gambarParagraf = (teks: string, size: number) => {
    const abu = rgb(0.45, 0.45, 0.45);
    let baris = "";
    for (const kata of teks.split(" ")) {
      const coba = baris ? `${baris} ${kata}` : kata;
      if (baris && regular.widthOfTextAtSize(coba, size) > LEBAR_SLIP) {
        page.drawText(baris, {
          x: MARGIN,
          y,
          size,
          font: regular,
          color: abu,
        });
        y -= 11;
        baris = kata;
      } else {
        baris = coba;
      }
    }
    if (baris) {
      page.drawText(baris, {
        x: MARGIN,
        y,
        size,
        font: regular,
        color: abu,
      });
      y -= 11;
    }
  };

  // ---- Kop (gaya invoice): logo kiri, blok tanggal kanan. ----
  const yKop = y;
  let logoTampil = false;
  try {
    const logo = parseLogoDataUrl(data.logoDataUrl);
    if (logo) {
      const img = logo.png
        ? await pdf.embedPng(logo.bytes)
        : await pdf.embedJpg(logo.bytes);
      const skala = Math.min(150 / img.width, 44 / img.height);
      const lw = img.width * skala;
      const lh = img.height * skala;
      page.drawImage(img, { x: MARGIN, y: yKop - lh, width: lw, height: lh });
      logoTampil = true;
    }
  } catch {
    logoTampil = false;
  }
  if (!logoTampil) {
    page.drawText(data.perusahaan, {
      x: MARGIN,
      y: yKop - 12,
      size: 14,
      font: bold,
      color: rgb(0.07, 0.07, 0.07),
    });
  }
  const judulKanan = `Slip Gaji ${labelPeriode(data.periode)}`;
  const wJudul = bold.widthOfTextAtSize(judulKanan, 11);
  page.drawText(judulKanan, {
    x: width - MARGIN - wJudul,
    y: yKop - 2,
    size: 11,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  kanan("Tanggal Dibuat ", data.dibuatPada ?? "—", yKop - 16, 10);
  kanan(
    "Tanggal Dibayar ",
    data.dibayarPada ?? "Belum dibayar",
    yKop - 30,
    10,
  );
  y = yKop - 52;

  // Judul besar abu-abu (gaya "Invoice 747541" di invoice).
  page.drawText(`Slip Gaji — ${r.nama}`, {
    x: MARGIN,
    y,
    size: 17,
    font: bold,
    color: rgb(0.55, 0.55, 0.55),
  });
  y -= 26;

  // ---- Kepada / Dari / Status (tiga kolom, gaya invoice). ----
  const yKolom = y;
  const xDari = MARGIN + 235;
  page.drawText("Kepada:", {
    x: MARGIN,
    y: yKolom,
    size: 9.5,
    font: bold,
    color: rgb(0.12, 0.12, 0.12),
  });
  page.drawText("Dari:", {
    x: xDari,
    y: yKolom,
    size: 9.5,
    font: bold,
    color: rgb(0.12, 0.12, 0.12),
  });
  kanan("Status: ", LABEL_STATUS_SLIP[status], yKolom, 10, true);
  kanan("Sisa: ", `Rp ${rupiah(sisa)}`, yKolom - 14, 10, true);
  const barisKepada = [
    r.nama,
    `Cabang ${r.cabang}`,
    `${labelPeriode(data.periode)} (${formatTanggal(data.rentang.dari)}–${formatTanggal(data.rentang.sampai)})`,
  ];
  barisKepada.forEach((teks, i) => {
    page.drawText(teks, {
      x: MARGIN,
      y: yKolom - 14 - i * 13,
      size: 9.5,
      font: regular,
      color: rgb(0.12, 0.12, 0.12),
    });
  });
  page.drawText(data.perusahaan, {
    x: xDari,
    y: yKolom - 14,
    size: 9.5,
    font: regular,
    color: rgb(0.12, 0.12, 0.12),
  });
  y = yKolom - 14 - 2 * 13 - 12;
  if (data.jendelaKustom) {
    page.drawText(
      `Hitungan hadir/telat dibatasi ${formatTanggal(data.jendela.dari)}–${formatTanggal(data.jendela.sampai)} (rentang kustom)`,
      {
        x: MARGIN,
        y,
        size: 8.5,
        font: regular,
        color: rgb(0.45, 0.45, 0.45),
      },
    );
    y -= 14;
  }
  y -= 6;

  // ---- Tabel rincian (gaya invoice): header abu-abu, garis tipis antar baris. ----
  const kolomSlip: { judul: string; lebar: number; rata: "kiri" | "kanan" }[] = [
    { judul: "Komponen", lebar: 175, rata: "kiri" },
    { judul: "Detail", lebar: 208, rata: "kiri" },
    { judul: "Jumlah (Rp)", lebar: 140, rata: "kanan" },
  ];
  const gambarHeaderSlip = () => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: LEBAR_SLIP,
      height: 18,
      color: rgb(0.95, 0.95, 0.96),
    });
    let x = MARGIN;
    kolomSlip.forEach((k) => {
      const lebarTeks = bold.widthOfTextAtSize(k.judul, 8);
      const posisiX =
        k.rata === "kanan" ? x + k.lebar - lebarTeks - 2 : x + 2;
      page.drawText(k.judul, {
        x: posisiX,
        y,
        size: 8,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += k.lebar;
    });
    y -= 18;
  };
  const gambarBarisSlip = (sel: [string, string, string]) => {
    let x = MARGIN;
    sel.forEach((teks, i) => {
      const { lebar, rata } = kolomSlip[i];
      const lebarTeks = regular.widthOfTextAtSize(teks, 9);
      const posisiX = rata === "kanan" ? x + lebar - lebarTeks - 2 : x + 2;
      page.drawText(teks, {
        x: posisiX,
        y,
        size: 9,
        font: regular,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += lebar;
    });
    page.drawLine({
      start: { x: MARGIN, y: y - 7 },
      end: { x: width - MARGIN, y: y - 7 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.91),
    });
    y -= 22;
  };

  gambarHeaderSlip();
  gambarBarisSlip(["Gaji Pokok", "-", rupiah(r.gajiPokok)]);
  if (r.gajiPokokFleksibel > 0) {
    gambarBarisSlip([
      "Gaji Pokok Fleksibel",
      `${r.jamFleksibel} jam × ${rupiah(TARIF_PER_JAM)}`,
      rupiah(r.gajiPokokFleksibel),
    ]);
  }
  if (r.gajiPokokHarian > 0) {
    gambarBarisSlip([
      "Gaji Pokok Harian",
      `${r.hariShiftBiasa} hari · ${r.jamShiftBiasa} jam × ${rupiah(TARIF_PER_JAM)}`,
      rupiah(r.gajiPokokHarian),
    ]);
  }
  gambarBarisSlip(["Tunjangan", "-", rupiah(r.tunjangan)]);
  gambarBarisSlip([
    "Tunjangan Makan",
    `${r.hariHadir} hari × ${rupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)}`,
    rupiah(r.tunjanganMakan),
  ]);
  gambarBarisSlip([
    "Lembur",
    `${r.jamLembur} jam × ${rupiah(TARIF_LEMBUR_PER_JAM)}`,
    rupiah(r.lembur),
  ]);
  gambarBarisSlip([
    "Insentif",
    `${r.insentifTransaksi} transaksi`,
    rupiah(r.insentif),
  ]);
  gambarBarisSlip([
    "Potongan Telat",
    `${r.menitTelatRekap} menit × ${rupiah(TARIF_POTONGAN_TELAT_PER_MENIT)}`,
    r.potonganTelat > 0 ? `-${rupiah(r.potonganTelat)}` : "0",
  ]);
  gambarBarisSlip([
    "Kasbon",
    `sisa disetujui ${rupiah(r.kasbonDisetujuiSisa)}`,
    r.kasbon > 0 ? `-${rupiah(r.kasbon)}` : "0",
  ]);

  // ---- Blok total rata kanan (gaya Subtotal/VAT/Total di invoice). ----
  y -= 2;
  kananKolom("Subtotal:", `Rp ${rupiah(penghasilan)}`, y, 9.5);
  y -= 16;
  kananKolom(
    "Potongan:",
    potongan > 0 ? `-Rp ${rupiah(potongan)}` : "Rp 0",
    y,
    9.5,
  );
  y -= 18;
  kananKolom("TOTAL DITERIMA", `Rp ${rupiah(thp)}`, y, 12, true);
  y -= 24;

  // ---- Riwayat Slip (gaya "Related transactions" di invoice). ----
  if (data.dibuatPada) {
    page.drawText("Riwayat Slip:", {
      x: MARGIN,
      y,
      size: 10,
      font: bold,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 16;
    const kolomRiwayat = [
      { judul: "Tanggal", lebar: 120 },
      { judul: "Aksi", lebar: 140 },
      { judul: "Oleh", lebar: 263 },
    ];
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: LEBAR_SLIP,
      height: 16,
      color: rgb(0.95, 0.95, 0.96),
    });
    let xr = MARGIN;
    kolomRiwayat.forEach((k) => {
      page.drawText(k.judul, {
        x: xr + 2,
        y,
        size: 8,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });
      xr += k.lebar;
    });
    y -= 16;
    const barisRiwayat: Array<[string, string, string]> = [
      [data.dibuatPada, "Dibuat", data.dibuatOleh ?? "—"],
    ];
    if (data.dibayarPada) {
      barisRiwayat.push([
        data.dibayarPada,
        "Dibayar",
        data.dibayarOleh ?? "—",
      ]);
    }
    barisRiwayat.forEach(([tgl, aksi, oleh]) => {
      let x2 = MARGIN;
      [tgl, aksi, oleh].forEach((teks, i) => {
        page.drawText(teks, {
          x: x2 + 2,
          y,
          size: 8.5,
          font: regular,
          color: rgb(0.12, 0.12, 0.12),
        });
        x2 += kolomRiwayat[i].lebar;
      });
      page.drawLine({
        start: { x: MARGIN, y: y - 5 },
        end: { x: width - MARGIN, y: y - 5 },
        thickness: 0.5,
        color: rgb(0.9, 0.9, 0.91),
      });
      y -= 18;
    });
    y -= 6;
  }

  // Catatan rumus di bawah tabel.
  const catatan = [
    "Gaji diterima = gaji pokok (manual + fleksibel + harian) + tunjangan + tunjangan makan + lembur + insentif - potongan - kasbon.",
    `Tunjangan makan = ${rupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} × hari hadir (hadir/telat); potongan telat = ${rupiah(TARIF_POTONGAN_TELAT_PER_MENIT)} × menit telat tercatat (sudah dikurangi toleransi shift).`,
    `Lembur = ${rupiah(TARIF_LEMBUR_PER_JAM)} × jam lembur (shift terjadwal di atas 8 jam; sisa 30 menit atau lebih dibulatkan ke atas, per hari).`,
    `Gaji pokok fleksibel = ${rupiah(TARIF_PER_JAM)} × jam kerja hari fleksibel (jumlah cycle absen hari itu, dibulatkan per hari dengan aturan yang sama).`,
    `Gaji pokok harian = ${rupiah(TARIF_PER_JAM)} × jam shift biasa (gaji manual 0: hari shift terjadwal hadir/telat dibayar penuh, maksimal 8 jam).`,
  ];
  catatan.forEach((teks) => gambarParagraf(teks, 7.5));

  // Footer halaman 1 — digambar sekarang karena `page` berpindah ke
  // halaman 2 (log absensi) setelah ini.
  page.drawText(`Dibuat otomatis oleh iNox Absensi · ${tanggalCetak}`, {
    x: MARGIN,
    y: 22,
    size: 7,
    font: regular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // ---- Halaman 2: log absensi karyawan dalam jendela hitung. ----
  page = pdf.addPage(A4);
  y = height - MARGIN;

  const tutupHalamanLog = (p: typeof page) => {
    p.drawText(`Dibuat otomatis oleh iNox Absensi · ${tanggalCetak}`, {
      x: MARGIN,
      y: 22,
      size: 7,
      font: regular,
      color: rgb(0.5, 0.5, 0.5),
    });
  };

  page.drawText("Log Absensi", {
    x: MARGIN,
    y,
    size: 16,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  y -= 22;
  page.drawText(
    `Log absensi ${r.nama} · ${labelPeriode(data.periode)} (${formatTanggal(data.jendela.dari)}–${formatTanggal(data.jendela.sampai)})`,
    {
      x: MARGIN,
      y,
      size: 9,
      font: regular,
      color: rgb(0.3, 0.3, 0.3),
    },
  );
  y -= 16;

  // Ringkasan log (dua baris supaya muat lebar cetak).
  const hitungLog = (k: KeadaanHari) => data.log.filter((b) => b.keadaan === k).length;
  const totalKerjaLog = data.log.reduce((a, b) => a + (b.menitKerja ?? 0), 0);
  const totalTelatLog = data.log.reduce((a, b) => a + b.menitTelat, 0);
  [
    [
      `Hadir: ${hitungLog("hadir")}`,
      `Telat: ${hitungLog("telat")}`,
      `Izin: ${hitungLog("izin")}`,
      `Alpa: ${hitungLog("alpa")}`,
      `Libur: ${hitungLog("libur")}`,
      `Off: ${hitungLog("off")}`,
    ].join("   ·   "),
    `Jam kerja: ${formatDurasi(totalKerjaLog)}   ·   Akumulasi telat: ${totalTelatLog} menit`,
  ].forEach((teks) => {
    page.drawText(teks, {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 13;
  });
  y -= 8;

  // Kolom log (total 515, sama dengan lebar area cetak). Tanpa kolom
  // Wajah (verifikasi wajah sudah tidak dipakai) — lebarnya untuk Shift.
  const kolomLog: { judul: string; lebar: number; rata: "kiri" | "tengah" }[] = [
    { judul: "Tanggal", lebar: 62, rata: "kiri" },
    { judul: "Hari", lebar: 40, rata: "kiri" },
    { judul: "Shift", lebar: 109, rata: "kiri" },
    { judul: "Masuk", lebar: 48, rata: "tengah" },
    { judul: "Keluar", lebar: 48, rata: "tengah" },
    { judul: "Jam kerja", lebar: 54, rata: "tengah" },
    { judul: "Telat", lebar: 36, rata: "tengah" },
    { judul: "Status", lebar: 58, rata: "kiri" },
    { judul: "Cabang", lebar: 60, rata: "kiri" },
  ];
  const LEBAR_LOG = kolomLog.reduce((a, k) => a + k.lebar, 0);

  const gambarHeaderLog = () => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: LEBAR_LOG,
      height: 16,
      color: rgb(0.95, 0.95, 0.96),
    });
    let x = MARGIN;
    kolomLog.forEach((k) => {
      const lebarTeks = bold.widthOfTextAtSize(k.judul, 7.5);
      const posisiX =
        k.rata === "tengah"
          ? x + Math.max(2, (k.lebar - lebarTeks) / 2)
          : x + 2;
      page.drawText(k.judul, {
        x: posisiX,
        y,
        size: 7.5,
        font: bold,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += k.lebar;
    });
    y -= 16;
  };

  /** Label pendek status (kolom Status sempit — bukan LABEL_HARI yang panjang). */
  const LABEL_STATUS_LOG: Record<KeadaanHari, string> = {
    hadir: "Hadir",
    telat: "Telat",
    izin: "Izin",
    alpa: "Alpa",
    libur: "Libur",
    off: "Off",
  };
  /** Warna teks per status (sama dengan arsip absensi). */
  const WARNA_KEADAAN_LOG: Record<KeadaanHari, [number, number, number]> = {
    hadir: [0.09, 0.64, 0.29],
    telat: [0.79, 0.54, 0.02],
    izin: [0.79, 0.54, 0.02],
    alpa: [0.86, 0.15, 0.15],
    libur: [0.42, 0.45, 0.5],
    off: [0.42, 0.45, 0.5],
  };

  const gambarBarisLog = (b: BarisLogSlip) => {
    const sel = [
      formatTanggal(b.tanggal),
      namaHari(b.tanggal, true),
      b.shiftNama ? (b.shiftJam ? `${b.shiftNama} ${b.shiftJam}` : b.shiftNama) : "—",
      b.masukMenit != null ? keJam(b.masukMenit) : "—",
      b.keluarMenit != null ? keJam(b.keluarMenit) : "—",
      b.menitKerja != null ? formatDurasi(b.menitKerja) : "—",
      b.menitTelat > 0 ? `${b.menitTelat}m` : "0",
      LABEL_STATUS_LOG[b.keadaan],
      b.cabang ?? "—",
    ];
    const warna = WARNA_KEADAAN_LOG[b.keadaan];
    let x = MARGIN;
    sel.forEach((teks, i) => {
      const { lebar, rata } = kolomLog[i];
      const lebarTeks = regular.widthOfTextAtSize(teks, 7.5);
      const posisiX =
        rata === "tengah"
          ? x + Math.max(2, (lebar - lebarTeks) / 2)
          : x + 2;
      page.drawText(teks, {
        x: posisiX,
        y,
        size: 7.5,
        font: regular,
        color: rgb(...warna),
      });
      x += lebar;
    });
    y -= 16;
  };

  gambarHeaderLog();
  for (const b of data.log) {
    // Lanjut halaman baru bila tidak muat; header kolom diulang.
    if (y < MARGIN + 30) {
      tutupHalamanLog(page);
      page = pdf.addPage(A4);
      y = height - MARGIN;
      gambarHeaderLog();
    }
    gambarBarisLog(b);
  }
  tutupHalamanLog(page);

  return pdf.save();
}
