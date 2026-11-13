import { namaAman } from "@/lib/arsip";
import { db } from "@/lib/db";
import { buatPayrollPdf, buatSlipPayrollPdf } from "@/lib/payroll-pdf";
import { hitungPayroll } from "@/lib/payroll-data";
import { bacaNamaPerusahaan } from "@/lib/pengaturan";
import { periodeValid } from "@/lib/rekap";
import { wajibAkses } from "@/lib/session";
import { tanggalLokal } from "@/lib/waktu";

/** Pembuatan PDF cepat; beri ruang lebih daripada default. */
export const maxDuration = 60;

/**
 * Unduh laporan payroll sebagai PDF.
 *
 * Tanpa parameter karyawan: rekap seluruh karyawan periode ini (A4
 * landscape). Dengan `?karyawan=<userId>`: slip gaji satu karyawan
 * (A4 portrait).
 *
 * Keamanan: hanya super_admin yang boleh mengunduh — sama seperti
 * halaman Payroll (admin cabang tidak boleh membaca angka gaji).
 * Angka di PDF dihitung oleh hitungPayroll yang sama dengan halaman,
 * jadi tidak pernah berbeda dari yang tampil di layar.
 */
export async function GET(request: Request) {
  const admin = await wajibAkses("payroll");
  if (admin.role !== "super_admin") {
    return new Response(
      "Hanya super admin dapat mengunduh laporan payroll.",
      { status: 403 },
    );
  }

  const q = new URL(request.url).searchParams;
  const bulanIni = tanggalLokal().slice(0, 7);
  const periode =
    q.get("periode") && periodeValid(q.get("periode")!)
      ? q.get("periode")!
      : bulanIni;
  const cabangId = q.get("cabang") ?? "";

  const { baris, total, jendela, rentang } = await hitungPayroll({
    periode,
    cabangId,
    dari: q.get("dari") ?? undefined,
    sampai: q.get("sampai") ?? undefined,
    bulanIni,
  });

  // Slip gaji satu karyawan.
  const karyawanId = q.get("karyawan") ?? "";
  if (karyawanId) {
    const r = baris.find((b) => b.userId === karyawanId);
    if (!r) {
      return new Response("Karyawan tidak ditemukan pada lingkup ini.", {
        status: 404,
      });
    }
    const pdf = await buatSlipPayrollPdf({
      periode,
      rentang,
      jendelaKustom: jendela.kustom,
      jendela,
      perusahaan: await bacaNamaPerusahaan(),
      baris: r,
    });
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="slip-gaji-${namaAman(r.nama)}-${periode}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Rekap seluruh karyawan.

  const cabangNama = cabangId
    ? (
        await db.cabang.findUnique({
          where: { id: cabangId },
          select: { nama: true },
        })
      )?.nama ?? null
    : null;

  const pdf = await buatPayrollPdf({
    periode,
    rentang,
    jendelaKustom: jendela.kustom,
    jendela,
    cabang: cabangNama,
    baris,
    total,
  });

  const namaFile = jendela.kustom
    ? `payroll-${periode}-${jendela.dari}-sd-${jendela.sampai}.pdf`
    : `payroll-${periode}.pdf`;

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
      "Cache-Control": "no-store",
    },
  });
}
