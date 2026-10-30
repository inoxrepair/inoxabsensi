import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { LABEL_HARI, labelPeriode, type KeadaanHari } from "@/lib/rekap";
import { formatDurasi, keJam, namaHari } from "@/lib/waktu";
import { formatTanggal } from "@/lib/format";
import { LABEL_STATUS_WAJAH, type StatusWajah } from "@/lib/wajah";

/**
 * PDF arsip absensi satu karyawan untuk satu bulan. Satu halaman per bulan
 * supaya ringan dan mudah dicetak.
 */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 40;
const ROW_HEIGHT = 16;

export type BarisArsipPdf = {
  tanggal: string;
  keadaan: KeadaanHari | null;
  shiftNama: string | null;
  masukMenit: number | null;
  keluarMenit: number | null;
  menitKerja: number | null;
  menitTelat: number;
  faceStatus: StatusWajah | null;
};

export type DataArsipPdf = {
  nama: string;
  username: string | null;
  cabang: string;
  jabatan: string;
  periode: string;
  baris: BarisArsipPdf[];
};

/** Warna teks per keadaan pada kolom status. */
const WARNA_KEADAAN: Record<string, [number, number, number]> = {
  hadir: [0.09, 0.64, 0.29],
  telat: [0.79, 0.54, 0.02],
  izin: [0.79, 0.54, 0.02],
  alpa: [0.86, 0.15, 0.15],
  libur: [0.42, 0.45, 0.5],
  off: [0.42, 0.45, 0.5],
};

export async function buatArsipPdf(data: DataArsipPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage(A4);
  const { width, height } = page.getSize();

  page.drawText("Arsip Absensi", {
    x: MARGIN,
    y: height - MARGIN,
    size: 16,
    font: bold,
    color: rgb(0.07, 0.07, 0.07),
  });

  // Identitas karyawan dan periode arsip.
  const info = [
    `Nama: ${data.nama}${data.username ? ` (@${data.username})` : ""}`,
    `Cabang: ${data.cabang} · Jabatan: ${data.jabatan}`,
    `Periode: ${labelPeriode(data.periode)}`,
  ];
  info.forEach((teks, i) => {
    page.drawText(teks, {
      x: MARGIN,
      y: height - MARGIN - 22 - i * 13,
      size: 9,
      font: regular,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  // Ringkasan kehadiran bulan tersebut.
  const hitung = (k: KeadaanHari) =>
    data.baris.filter((b) => b.keadaan === k).length;
  const totalKerja = data.baris.reduce((a, b) => a + (b.menitKerja ?? 0), 0);
  const totalTelat = data.baris.reduce((a, b) => a + b.menitTelat, 0);
  const ringkas = [
    `Hadir: ${hitung("hadir")}`,
    `Telat: ${hitung("telat")}`,
    `Izin: ${hitung("izin")}`,
    `Alpa: ${hitung("alpa")}`,
    `Off: ${hitung("off")}`,
    `Jam kerja: ${formatDurasi(totalKerja)}`,
    `Akumulasi telat: ${totalTelat} menit`,
  ];
  page.drawText(ringkas.join("   ·   "), {
    x: MARGIN,
    y: height - MARGIN - 68,
    size: 8,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });

  // Kolom tabel; lebar disesuaikan agar seluruh rentang muat di A4.
  const kolom: { judul: string; lebar: number; rata: "kiri" | "tengah" }[] = [
    { judul: "Tanggal", lebar: 68, rata: "kiri" },
    { judul: "Hari", lebar: 44, rata: "kiri" },
    { judul: "Shift", lebar: 62, rata: "kiri" },
    { judul: "Masuk", lebar: 52, rata: "tengah" },
    { judul: "Keluar", lebar: 52, rata: "tengah" },
    { judul: "Jam kerja", lebar: 60, rata: "tengah" },
    { judul: "Telat", lebar: 40, rata: "tengah" },
    { judul: "Status", lebar: 62, rata: "kiri" },
    { judul: "Wajah", lebar: 75, rata: "kiri" },
  ];

  let y = height - MARGIN - 90;
  const gambarBaris = (
    sel: string[],
    tebal: boolean,
    warna?: [number, number, number],
  ) => {
    let x = MARGIN;
    sel.forEach((teks, i) => {
      const { lebar, rata } = kolom[i];
      const font = tebal ? bold : regular;
      const size = 7.5;
      const lebarTeks = font.widthOfTextAtSize(teks, size);
      const posisiX =
        rata === "tengah"
          ? x + Math.max(2, (lebar - lebarTeks) / 2)
          : x + 2;
      page.drawText(teks, {
        x: posisiX,
        y,
        size,
        font,
        color: warna ? rgb(...warna) : rgb(0.12, 0.12, 0.12),
      });
      x += lebar;
    });
    y -= ROW_HEIGHT;
  };

  // Header tabel dengan latar abu.
  page.drawRectangle({
    x: MARGIN,
    y: y - 4,
    width: kolom.reduce((a, k) => a + k.lebar, 0),
    height: ROW_HEIGHT,
    color: rgb(0.95, 0.95, 0.96),
  });
  gambarBaris(kolom.map((k) => k.judul), true);

  for (const b of data.baris) {
    // Halaman baru bila sudah mencapai batas bawah A4.
    if (y < MARGIN + 30) {
      page.drawText("...", { x: MARGIN, y, size: 8, font: regular });
      break;
    }
    const status = b.keadaan ? LABEL_HARI[b.keadaan] : "—";
    const wajah = b.faceStatus ? LABEL_STATUS_WAJAH[b.faceStatus] : "—";
    gambarBaris(
      [
        formatTanggal(b.tanggal),
        namaHari(b.tanggal, true),
        b.shiftNama ?? "—",
        b.masukMenit != null ? keJam(b.masukMenit) : "—",
        b.keluarMenit != null ? keJam(b.keluarMenit) : "—",
        b.menitKerja != null ? formatDurasi(b.menitKerja) : "—",
        b.menitTelat > 0 ? `${b.menitTelat}m` : "0",
        status,
        wajah,
      ],
      false,
      b.keadaan ? WARNA_KEADAAN[b.keadaan] : undefined,
    );
  }

  page.drawText(
    `Dibuat otomatis oleh iNox Absensi · ${data.baris.length} hari`,
    { x: MARGIN, y: 22, size: 7, font: regular, color: rgb(0.5, 0.5, 0.5) },
  );

  return pdf.save();
}