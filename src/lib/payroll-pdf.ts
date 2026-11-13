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
      `Hitungan hadir/telat, insentif, lembur, dan gaji pokok fleksibel dibatasi ${formatTanggal(data.jendela.dari)}–${formatTanggal(data.jendela.sampai)} (rentang kustom)`,
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
      gambarBaris(
        [
          String(i + 1),
          r.nama,
          rupiah(r.gajiPokok + r.gajiPokokFleksibel),
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
        rupiah(data.total.gajiPokok + data.total.gajiPokokFleksibel),
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
    "Gaji diterima = gaji pokok (manual + fleksibel) + tunjangan + tunjangan makan + lembur + insentif - potongan - kasbon.",
    `Tunjangan makan = ${rupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} × hari hadir (hadir/telat); potongan telat = ${rupiah(TARIF_POTONGAN_TELAT_PER_MENIT)} × menit telat tercatat (sudah dikurangi toleransi shift).`,
    `Lembur = ${rupiah(TARIF_LEMBUR_PER_JAM)} × jam lembur (shift terjadwal di atas 8 jam, ikut definisi shift; sisa 30 menit atau lebih dibulatkan ke atas, per hari).`,
    `Gaji pokok fleksibel = ${rupiah(TARIF_PER_JAM)} × jam kerja hari fleksibel (jumlah cycle absen hari itu, dibulatkan per hari dengan aturan yang sama).`,
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

/** Slip gaji satu karyawan (A4 portrait, dua halaman: rincian + log absensi). */
export type DataSlipPayrollPdf = {
  periode: string;
  rentang: { dari: string; sampai: string };
  jendelaKustom: boolean;
  jendela: { dari: string; sampai: string };
  /** Nama perusahaan — tampil di kanan atas slip (diatur di Pengaturan). */
  perusahaan: string;
  baris: BarisPayroll;
  /** Log absensi karyawan dalam jendela hitung — tampil di halaman 2. */
  log: BarisLogSlip[];
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

  page.drawText("Slip Gaji", {
    x: MARGIN,
    y,
    size: 18,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });
  const merek = data.perusahaan;
  page.drawText(merek, {
    x: width - MARGIN - regular.widthOfTextAtSize(merek, 10),
    y: y + 3,
    size: 10,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.86),
  });
  y -= 24;

  const info: Array<[string, string]> = [
    ["Nama", r.nama],
    ["Cabang", r.cabang],
    [
      "Periode",
      `${labelPeriode(data.periode)} (${formatTanggal(data.rentang.dari)}–${formatTanggal(data.rentang.sampai)})`,
    ],
  ];
  if (data.jendelaKustom) {
    info.push([
      "Hitungan hadir/telat",
      `${formatTanggal(data.jendela.dari)}–${formatTanggal(data.jendela.sampai)} (rentang kustom)`,
    ]);
  }
  info.forEach(([label, nilai]) => {
    page.drawText(label, {
      x: MARGIN,
      y,
      size: 9.5,
      font: bold,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(nilai, {
      x: MARGIN + 130,
      y,
      size: 9.5,
      font: regular,
      color: rgb(0.12, 0.12, 0.12),
    });
    y -= 16;
  });
  y -= 10;

  // Tabel rincian: Komponen | Detail | Jumlah (tanda "-" = potongan).
  const kolomSlip: { judul: string; lebar: number; rata: "kiri" | "kanan" }[] = [
    { judul: "Komponen", lebar: 180, rata: "kiri" },
    { judul: "Detail", lebar: 195, rata: "kiri" },
    { judul: "Jumlah (Rp)", lebar: 140, rata: "kanan" },
  ];
  const gambarHeaderSlip = () => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: LEBAR_CETAK,
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
  const gambarBarisSlip = (
    sel: [string, string, string],
    tebal: boolean,
    arsir: boolean,
  ) => {
    if (arsir) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 4,
        width: LEBAR_CETAK,
        height: 22,
        color: rgb(0.95, 0.95, 0.96),
      });
    }
    let x = MARGIN;
    const font = tebal ? bold : regular;
    sel.forEach((teks, i) => {
      const { lebar, rata } = kolomSlip[i];
      const lebarTeks = font.widthOfTextAtSize(teks, 9);
      const posisiX =
        rata === "kanan" ? x + lebar - lebarTeks - 2 : x + 2;
      page.drawText(teks, {
        x: posisiX,
        y,
        size: 9,
        font,
        color: rgb(0.12, 0.12, 0.12),
      });
      x += lebar;
    });
    y -= 22;
  };

  gambarHeaderSlip();
  gambarBarisSlip(["Gaji Pokok", "-", rupiah(r.gajiPokok)], false, false);
  if (r.gajiPokokFleksibel > 0) {
    gambarBarisSlip(
      [
        "Gaji Pokok Fleksibel",
        `${r.jamFleksibel} jam × ${rupiah(TARIF_PER_JAM)}`,
        rupiah(r.gajiPokokFleksibel),
      ],
      false,
      false,
    );
  }
  gambarBarisSlip(["Tunjangan", "-", rupiah(r.tunjangan)], false, false);
  gambarBarisSlip(
    [
      "Tunjangan Makan",
      `${r.hariHadir} hari × ${rupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)}`,
      rupiah(r.tunjanganMakan),
    ],
    false,
    false,
  );
  gambarBarisSlip(
    [
      "Lembur",
      `${r.jamLembur} jam × ${rupiah(TARIF_LEMBUR_PER_JAM)}`,
      rupiah(r.lembur),
    ],
    false,
    false,
  );
  gambarBarisSlip(
    ["Insentif", `${r.insentifTransaksi} transaksi`, rupiah(r.insentif)],
    false,
    false,
  );
  gambarBarisSlip(
    [
      "Potongan Telat",
      `${r.menitTelatRekap} menit × ${rupiah(TARIF_POTONGAN_TELAT_PER_MENIT)}`,
      r.potonganTelat > 0 ? `-${rupiah(r.potonganTelat)}` : "0",
    ],
    false,
    false,
  );
  gambarBarisSlip(
    [
      "Kasbon",
      `sisa disetujui ${rupiah(r.kasbonDisetujuiSisa)}`,
      r.kasbon > 0 ? `-${rupiah(r.kasbon)}` : "0",
    ],
    false,
    false,
  );
  gambarBarisSlip(
    ["TOTAL DITERIMA", "", rupiah(takeHomePay(r))],
    true,
    true,
  );

  y -= 8;
  const catatan = [
    "Gaji diterima = gaji pokok (manual + fleksibel) + tunjangan + tunjangan makan + lembur + insentif - potongan - kasbon.",
    `Tunjangan makan = ${rupiah(TARIF_TUNJANGAN_MAKAN_PER_HARI)} × hari hadir (hadir/telat); potongan telat = ${rupiah(TARIF_POTONGAN_TELAT_PER_MENIT)} × menit telat tercatat (sudah dikurangi toleransi shift).`,
    `Lembur = ${rupiah(TARIF_LEMBUR_PER_JAM)} × jam lembur (shift terjadwal di atas 8 jam; sisa 30 menit atau lebih dibulatkan ke atas, per hari).`,
    `Gaji pokok fleksibel = ${rupiah(TARIF_PER_JAM)} × jam kerja hari fleksibel (jumlah cycle absen hari itu, dibulatkan per hari dengan aturan yang sama).`,
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
