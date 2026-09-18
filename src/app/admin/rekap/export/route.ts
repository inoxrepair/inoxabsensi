import ExcelJS from "exceljs";
import { wajibAkses } from "@/lib/session";
import {
  daftarTanggal,
  labelRentang,
  LABEL_STATUS,
  SIMBOL_STATUS,
} from "@/lib/rekap";
import type { StatusAbsensi } from "@/lib/domain";
import { formatDurasi, namaHari } from "@/lib/waktu";
import { ambilRekap, bacaLingkup } from "../data";

/**
 * Export Excel (.xlsx) asli, bukan CSV. Dipilih karena CSV bergantung pada
 * setting regional Excel pengguna: pemisah kolom dan encoding sering salah
 * baca, sedangkan xlsx membawa struktur kolom, tipe, dan lebarnya sendiri.
 */

/** Warna latar ARGB lembut per status agar mudah dibaca sekilas. */
const WARNA_STATUS: Record<StatusAbsensi, string> = {
  hadir: "FFDCFCE7",
  telat: "FFFEF9C3",
  izin: "FFFEF3C7",
  alpa: "FFFEE2E2",
  libur: "FFF1F5F9",
};

const KEPALA_AGREGAT = [
  "Nama",
  "Cabang",
  "Hadir",
  "Telat (hari)",
  "Akumulasi telat (menit)",
  "Izin",
  "Alpa",
  "Jam kerja",
  "Belum absen keluar",
];

export async function GET(request: Request) {
  const admin = await wajibAkses("rekap");

  const p = new URL(request.url).searchParams;
  const lingkup = bacaLingkup(admin, {
    periode: p.get("periode") ?? undefined,
    cabang: p.get("cabang") ?? undefined,
    dari: p.get("dari") ?? undefined,
    sampai: p.get("sampai") ?? undefined,
  });

  const baris = await ambilRekap(lingkup);
  const tanggal = daftarTanggal(lingkup);

  const buku = new ExcelJS.Workbook();
  buku.creator = "iNox Absensi";
  buku.created = new Date();

  const lembar = buku.addWorksheet("Rekap Absensi", {
    views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
  });

  const judulRentang = `Rentang: ${lingkup.dari} s.d. ${lingkup.sampai}`;
  lembar.addRow([judulRentang]);
  lembar.addRow([`Total karyawan: ${baris.length} · ${tanggal.length} hari`]);
  lembar.addRow([]);

  // Kolom agregat lalu kolom tanggal; header tanggal memuat nama hari.
  const kepala = [
    ...KEPALA_AGREGAT,
    ...tanggal.map((iso) => `${iso.slice(8)} ${namaHari(iso, true)}`),
  ];
  lembar.addRow(kepala);

  for (const r of baris) {
    lembar.addRow([
      r.nama,
      r.cabang,
      r.hadir,
      r.telat,
      r.menitTelat,
      r.izin,
      r.alpa,
      r.menitKerja ? formatDurasi(r.menitKerja) : "0j",
      r.belumKeluar,
      ...tanggal.map((iso) => {
        const status = r.statusHarian.get(iso);
        return status ? SIMBOL_STATUS[status] : "";
      }),
    ]);
  }

  const barisHeader = 4;
  const kolomNama = 1;
  const kolomPertamaTanggal = KEPALA_AGREGAT.length + 1;

  const header = lembar.getRow(barisHeader);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 20;
  header.eachCell((sel) => {
    sel.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    sel.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } };
  });

  // Nama karyawan sebagai kolom beku sebelah kiri.
  lembar.getColumn(kolomNama).width = 24;
  lembar.getColumn(2).width = 16;

  // Warnai sel tanggal sesuai status dan beri tooltip label panjang.
  for (let i = 0; i < baris.length; i++) {
    const r = baris[i];
    const nomorBaris = barisHeader + 1 + i;
    lembar.getCell(nomorBaris, kolomNama).font = { bold: true };

    for (let j = 0; j < tanggal.length; j++) {
      const status = r.statusHarian.get(tanggal[j]);
      if (!status) continue;
      const sel = lembar.getCell(nomorBaris, kolomPertamaTanggal + j);
      sel.alignment = { horizontal: "center" };
      sel.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: WARNA_STATUS[status] },
      };
      sel.note = LABEL_STATUS[status];
    }
  }

  for (let j = 0; j < tanggal.length; j++) {
    lembar.getColumn(kolomPertamaTanggal + j).width = 5.5;
  }

  const isi = await buku.xlsx.writeBuffer();

  const namaFile = lingkup.kustom
    ? `rekap-absensi-${lingkup.dari}-sd-${lingkup.sampai}.xlsx`
    : `rekap-absensi-${lingkup.dari.slice(0, 7)}.xlsx`;

  return new Response(isi, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      // Rekap berubah setiap absen; jangan sampai proxy menyimpannya.
      "Cache-Control": "no-store",
      "X-Rentang": labelRentang(lingkup),
    },
  });
}