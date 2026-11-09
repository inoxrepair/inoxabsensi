/**
 * Fungsi untuk sinkronisasi data insentif dari inox.my.id ke iNox Absensi.
 * Semua I/O (Prisma + HTTP) ada di sini; halaman hanya memanggil fungsi-fungsi ini.
 */

import { db } from "@/lib/db";
import { periodeValid } from "@/lib/rekap";

/** Ambil data insentif dari endpoint AJAX inox.my.id untuk rentang tanggal. */
export async function ambilDataInsentifInox({
  cookieJar,
  csrfToken,
  startDate,
  endDate,
}: {
  cookieJar: string;
  csrfToken: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}): Promise<
  Array<{
    transactionId: number;
    invoiceNo: string;
    tanggal: string; // dd-mm-yyyy
    serviceStaff: string;
    productName: string;
    quantity: number;
    unitPriceBeforeDiscount: number;
    technicianCommissionValue: number;
    totalUnitPrice: number;
    businessLocation: string;
  }>
> {
  const url = new URL("https://inox.my.id/reports/incentive-line-orders");
  url.searchParams.set("draw", "1");
  url.searchParams.set("start", "0");
  url.searchParams.set("length", "10000"); // ambil banyak data sekaligus
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);
  url.searchParams.set("location_id", "");
  url.searchParams.set("service_staff_id", "");

  const res = await fetch(url.toString(), {
    headers: {
      "X-CSRF-TOKEN": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://inox.my.id/reports/incentive-report",
      Cookie: cookieJar,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Gagal ambil data insentif: HTTP ${res.status}`);
  }

  const json = await res.json();
  const rows: any[] = json.data ?? [];

  return rows.map((r) => {
    // Angka dikemas dalam <span data-orig-value="40000">40000</span>
    const ambilAngka = (nilai: any): number => {
      if (typeof nilai === "number") return nilai;
      if (typeof nilai === "string") {
        const m = nilai.match(/data-orig-value="([\d.]+)"/);
        if (m) return Number(m[1]);
        return Number(nilai.replace(/[^0-9.-]/g, "") || 0);
      }
      return 0;
    };

    const tanggalRaw = r.transaction_date ?? ""; // dd-mm-yyyy
    return {
      transactionId: r.transaction_id ?? 0,
      invoiceNo: r.invoice_no ?? "",
      tanggal: tanggalRaw,
      serviceStaff: r.service_staff ?? "",
      productName: r.product_name ?? "",
      quantity: ambilAngka(r.quantity),
      unitPriceBeforeDiscount: ambilAngka(r.unit_price_before_discount),
      technicianCommissionValue: ambilAngka(r.technician_commission_value),
      totalUnitPrice: ambilAngka(r.total_unit_price),
      businessLocation: r.business_location ?? "",
    };
  });
}

/** Cocokkan nama service_staff di inox.my.id ke User di iNox Absensi. */
export function cocokkanUser(
  serviceStaff: string,
  users: Array<{ id: string; name: string }>,
): string | null {
  const target = serviceStaff.trim().toLowerCase();
  // Coba exact match dulu (case-insensitive)
  const exact = users.find((u) => u.name.trim().toLowerCase() === target);
  if (exact) return exact.id;
  // Fallback: contains match
  const contains = users.find((u) =>
    u.name.trim().toLowerCase().includes(target),
  );
  return contains ? contains.id : null;
}

/** Simpan/perbarui insentif per user per periode ke database. */
export async function simpanInsentifPeriode({
  userId,
  periode,
  jumlah,
  jumlahTransaksi,
  tanggalAwal,
  tanggalAkhir,
}: {
  userId: string;
  periode: string; // yyyy-mm
  jumlah: number;
  jumlahTransaksi: number;
  tanggalAwal?: string | null;
  tanggalAkhir?: string | null;
}) {
  if (!periodeValid(periode)) {
    throw new Error("Periode tidak valid.");
  }

  return db.insentif.upsert({
    where: { userId_periode: { userId, periode } },
    update: {
      jumlah,
      jumlahTransaksi,
      tanggalAwal,
      tanggalAkhir,
      sinkronPada: new Date(),
    },
    create: {
      userId,
      periode,
      jumlah,
      jumlahTransaksi,
      tanggalAwal,
      tanggalAkhir,
    },
  });
}

/** Ambil insentif satu user untuk periode tertentu. */
export async function ambilInsentifUserPeriode(
  userId: string,
  periode: string,
) {
  return db.insentif.findUnique({
    where: { userId_periode: { userId, periode } },
  });
}

/** Ambil semua insentif untuk periode (admin/super_admin lihat semua). */
export async function ambilSemuaInsentifPeriode(periode: string) {
  return db.insentif.findMany({
    where: { periode },
    include: { user: { select: { id: true, name: true, username: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

/** Hitung THP dengan menambahkan insentif dari payroll. */
export function takeHomePayDenganInsentif(k: {
  gajiPokok: number;
  tunjangan: number;
  potonganTelat: number;
  kasbon: number;
  insentif: number;
}): number {
  return k.gajiPokok + k.tunjangan + k.insentif - k.potonganTelat - k.kasbon;
}
