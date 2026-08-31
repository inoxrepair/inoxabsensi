import { wajibAkses } from "@/lib/session";
import { labelRentang } from "@/lib/rekap";
import { formatDurasi } from "@/lib/waktu";
import { ambilRekap, bacaLingkup } from "../data";

/**
 * Export CSV. Dipilih ketimbang XLSX supaya tidak menambah dependensi;
 * Excel membuka CSV langsung. Pemisah titik koma dipakai karena Excel
 * dengan locale Indonesia memakai koma sebagai desimal.
 */
const PEMISAH = ";";

/** Cegah CSV injection: sel yang dimulai formula diberi awalan kutip. */
function sel(nilai: string | number): string {
  const teks = String(nilai);
  const aman = /^[=+\-@\t\r]/.test(teks) ? `'${teks}` : teks;
  return /[";\r\n]/.test(aman) ? `"${aman.replace(/"/g, '""')}"` : aman;
}

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

  const judul = [
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

  const isi = baris.map((r) =>
    [
      r.nama,
      r.cabang,
      r.hadir,
      r.telat,
      r.menitTelat,
      r.izin,
      r.alpa,
      r.menitKerja ? formatDurasi(r.menitKerja) : "0j",
      r.belumKeluar,
    ]
      .map(sel)
      .join(PEMISAH),
  );

  // BOM UTF-8 agar Excel di Windows membaca huruf beraksen dengan benar.
  const csv =
    "\uFEFF" +
    [
      `Rentang${PEMISAH}${sel(`${lingkup.dari} s.d. ${lingkup.sampai}`)}`,
      "",
      judul.map(sel).join(PEMISAH),
      ...isi,
    ].join("\r\n");

  const namaFile = lingkup.kustom
    ? `rekap-absensi-${lingkup.dari}-sd-${lingkup.sampai}.csv`
    : `rekap-absensi-${lingkup.dari.slice(0, 7)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      // Rekap berubah setiap absen; jangan sampai proxy menyimpannya.
      "Cache-Control": "no-store",
      "X-Rentang": labelRentang(lingkup),
    },
  });
}
