import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { AKSES_DEFAULT, ROLE } from "../src/lib/domain";
import {
  awalMinggu,
  indeksHari,
  keMenit,
  tanggalGeser,
  tanggalLokal,
} from "../src/lib/waktu";

const db = new PrismaClient();

/** Helper: definisi shift ditulis dalam jam manusiawi, disimpan sebagai menit. */
function shift(nama: string, mulai: string, selesai: string, toleransi = 10) {
  return {
    nama,
    mulaiMenit: keMenit(mulai)!,
    selesaiMenit: keMenit(selesai)!,
    toleransiMenit: toleransi,
  };
}

const CABANG = [
  {
    nama: "iNox Kotamobagu",
    kota: "Kotamobagu",
    lat: 0.7333,
    lng: 124.3167,
    radiusMeter: 100,
    aktif: true,
  },
  {
    nama: "iNox Manado",
    kota: "Manado",
    lat: 1.4748,
    lng: 124.8421,
    radiusMeter: 150,
    aktif: true,
  },
  {
    nama: "iNox Bitung",
    kota: "Bitung",
    lat: 1.4406,
    lng: 125.1216,
    radiusMeter: 120,
    aktif: false,
  },
];

const SHIFT = [
  shift("Pagi", "09.00", "17.00"),
  shift("Siang", "14.00", "22.00"),
  shift("Full", "09.00", "22.00", 15),
];

const KARYAWAN = [
  {
    email: "owner@inox.co.id",
    name: "Owner iNox",
    role: "super_admin",
    jabatan: "Owner",
    cabang: null,
    tanggalMasuk: "2019-01-06",
    aktif: true,
  },
  {
    email: "dewi@inox.co.id",
    name: "Dewi Anggraini",
    role: "admin_cabang",
    jabatan: "Kasir",
    cabang: "iNox Kotamobagu",
    tanggalMasuk: "2021-08-02",
    aktif: true,
  },
  {
    email: "rizky@inox.co.id",
    name: "Rizky Pratama",
    role: "karyawan",
    jabatan: "Teknisi",
    cabang: "iNox Kotamobagu",
    tanggalMasuk: "2022-03-14",
    aktif: true,
  },
  {
    email: "bagus@inox.co.id",
    name: "Bagus Setiawan",
    role: "karyawan",
    jabatan: "Teknisi Senior",
    cabang: "iNox Manado",
    tanggalMasuk: "2020-11-23",
    aktif: true,
  },
  {
    email: "siti@inox.co.id",
    name: "Siti Nurhaliza",
    role: "karyawan",
    jabatan: "Sales",
    cabang: "iNox Manado",
    tanggalMasuk: "2023-05-08",
    aktif: true,
  },
  {
    email: "andi@inox.co.id",
    name: "Andi Wijaya",
    role: "karyawan",
    jabatan: "Teknisi",
    cabang: "iNox Bitung",
    tanggalMasuk: "2024-02-19",
    aktif: false,
  },
];

/** Password seragam untuk semua akun demo; hanya untuk development. */
const PASSWORD_DEMO = "inox12345";

/**
 * Pola shift mingguan per email (Senin..Minggu); null = libur.
 * Dipakai untuk membuat Jadwal dua minggu di sekitar hari ini.
 */
const POLA_JADWAL: Record<string, (string | null)[]> = {
  "rizky@inox.co.id": ["Pagi", "Pagi", null, "Pagi", "Pagi", "Siang", "Siang"],
  "dewi@inox.co.id": ["Siang", "Siang", "Siang", null, "Siang", "Pagi", "Pagi"],
  "bagus@inox.co.id": ["Pagi", "Pagi", "Pagi", "Pagi", null, null, "Full"],
  "siti@inox.co.id": [null, "Siang", "Siang", "Siang", "Siang", "Siang", null],
};

const SERAGAM = ["Seragam A", "Seragam B"];

async function main() {
  const passwordHash = await hash(PASSWORD_DEMO, 10);

  // upsert dipakai di semua entitas supaya seed aman dijalankan berulang.
  const cabang = new Map<string, string>();
  for (const c of CABANG) {
    const row = await db.cabang.upsert({
      where: { nama: c.nama },
      update: c,
      create: c,
    });
    cabang.set(row.nama, row.id);
  }

  const shiftId = new Map<string, string>();
  for (const s of SHIFT) {
    const row = await db.shift.upsert({
      where: { nama: s.nama },
      update: s,
      create: s,
    });
    shiftId.set(row.nama, row.id);
  }

  for (const k of KARYAWAN) {
    const data = {
      name: k.name,
      role: k.role,
      jabatan: k.jabatan,
      tanggalMasuk: k.tanggalMasuk,
      aktif: k.aktif,
      cabangId: k.cabang ? cabang.get(k.cabang)! : null,
    };
    await db.user.upsert({
      where: { email: k.email },
      update: data,
      create: { ...data, email: k.email, passwordHash },
    });
  }

  // Hak akses awal; setelahnya bisa diubah lewat tabel ini tanpa deploy.
  await db.rolePermission.deleteMany();
  await db.rolePermission.createMany({
    data: ROLE.flatMap((role) =>
      AKSES_DEFAULT[role].map((menu) => ({ role, menu })),
    ),
  });

  // Jadwal minggu lalu + minggu ini supaya halaman jadwal & absen ada isinya.
  const senin = awalMinggu(tanggalLokal());
  const tanggalJadwal = Array.from({ length: 14 }, (_, i) =>
    tanggalGeser(senin, i - 7),
  );

  let jumlahJadwal = 0;
  for (const [email, pola] of Object.entries(POLA_JADWAL)) {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) continue;

    for (const tanggal of tanggalJadwal) {
      const namaShift = pola[indeksHari(tanggal)];
      const data = {
        shiftId: namaShift ? shiftId.get(namaShift)! : null,
        seragam: namaShift ? SERAGAM[indeksHari(tanggal) % SERAGAM.length] : null,
      };
      await db.jadwal.upsert({
        where: { userId_tanggal: { userId: user.id, tanggal } },
        update: data,
        create: { userId: user.id, tanggal, ...data },
      });
      jumlahJadwal++;
    }
  }

  const jumlahAkses = ROLE.reduce((a, r) => a + AKSES_DEFAULT[r].length, 0);
  console.log(
    `Seed selesai: ${CABANG.length} cabang, ${SHIFT.length} shift, ` +
      `${KARYAWAN.length} user, ${jumlahAkses} baris hak akses, ` +
      `${jumlahJadwal} baris jadwal.`,
  );
  console.log(`Login demo: owner@inox.co.id / ${PASSWORD_DEMO}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
