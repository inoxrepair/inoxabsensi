import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocksInsentif = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  queryRaw: vi.fn(),
  txExecuteRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: { findMany: mocksInsentif.userFindMany },
    $queryRaw: mocksInsentif.queryRaw,
    $transaction: mocksInsentif.transaction,
  },
}));

import {
  bacaCookieDariHeaders,
  cocokkanUser,
  gabungkanCookie,
  harusBatalkanSinkronKosong,
  jalankanSinkronInsentif,
  kelompokkanInsentifPerUser,
  normalisasiNama,
  pecahSetCookie,
  petakanBarisInsentif,
  ringkasInsentifPerUser,
  ubahTanggalKeIso,
} from "./insentif";

const USERS = [
  { id: "u1", name: "Fajri Mokodompit" },
  { id: "u2", name: "Ano" },
  { id: "u3", name: "Doni Djuuna" },
  { id: "u4", name: "nizam" },
];

describe("normalisasiNama", () => {
  it("membuang spasi dan mengubah ke huruf kecil", () => {
    expect(normalisasiNama("Fajri Mokodompit")).toBe("fajrimokodompit");
    expect(normalisasiNama("  FajriMokodompit ")).toBe("fajrimokodompit");
  });

  it("membuang simbol dan tanda baca", () => {
    expect(normalisasiNama("Fajri-Mokodompit.")).toBe("fajrimokodompit");
  });
});

describe("cocokkanUser", () => {
  it("cocok walau nama iNOX tanpa spasi", () => {
    expect(cocokkanUser("FajriMokodompit", USERS)).toBe("u1");
    expect(cocokkanUser("DoniDjuuna", USERS)).toBe("u3");
  });

  it("cocok walau beda huruf besar-kecil", () => {
    expect(cocokkanUser("fajri mokodompit", USERS)).toBe("u1");
    expect(cocokkanUser("NIZAM", USERS)).toBe("u4");
    expect(cocokkanUser("ANO", USERS)).toBe("u2");
  });

  it("tidak cocok bila hanya sebagian nama (tanpa contains)", () => {
    // "Fajri" saja bukan karyawan yang sama; harus masuk daftar
    // tidakDicocokkan untuk ditinjau manual, bukan ditebak.
    expect(cocokkanUser("Fajri", USERS)).toBeNull();
    expect(cocokkanUser("Doni", USERS)).toBeNull();
  });

  it("tidak salah cocok nama pendek ke nama lain", () => {
    // "Ano" tidak boleh cocok ke "Fajri Mokodompit" atau siapa pun.
    expect(cocokkanUser("Ano", USERS)).toBe("u2");
    expect(cocokkanUser("Zano", USERS)).toBeNull();
  });

  it("nama kosong tidak cocok", () => {
    expect(cocokkanUser("", USERS)).toBeNull();
    expect(cocokkanUser("   ", USERS)).toBeNull();
  });

  it("pemetaan manual menang atas pencocokan nama", () => {
    // "FajriMokodompit" persis cocok ke u1 lewat nama, tapi pemetaan
    // untuk kunci itu harus menang — admin sudah memastikan orangnya.
    expect(
      cocokkanUser("FajriMokodompit", USERS, [
        { namaKunci: "fajrimokodompit", userId: "u2" },
      ]),
    ).toBe("u2");
  });

  it("pemetaan cocok walau nama tidak cocok ke siapa pun", () => {
    const pemetaan = [
      { namaKunci: "fajri", userId: "u2" },
      { namaKunci: "doni", userId: "u3" },
    ];
    expect(cocokkanUser("Fajri", USERS, pemetaan)).toBe("u2");
    expect(cocokkanUser("Doni", USERS, pemetaan)).toBe("u3");
  });

  it("pemetaan dicocokkan setelah normalisasi nama", () => {
    const pemetaan = [{ namaKunci: "fajri", userId: "u2" }];
    expect(cocokkanUser("FAJRI", USERS, pemetaan)).toBe("u2");
    expect(cocokkanUser("Fajri ", USERS, pemetaan)).toBe("u2");
  });

  it("tanpa pemetaan, nama yang tidak cocok tetap null", () => {
    expect(cocokkanUser("Fajri", USERS, [])).toBeNull();
    expect(cocokkanUser("Fajri", USERS)).toBeNull();
  });
});

describe("petakanBarisInsentif", () => {
  // Baris asli dari feed incentive-line-orders (28/10–27/11/2026),
  // disingkat ke field yang dibaca mapper.
  const span = (nilai: number) =>
    `<span class="display_currency" data-orig-value="${nilai}">${nilai}</span>`;

  it("komisi tetap memakai TOTAL, bukan per satuan (kwantitas 3)", () => {
    // INV2026-1563, Service Fee, Raffa: Komisi Tetap 25.000 x 3.
    // Kode lama menjumlah technician_commission_value = 25.000 (kurang).
    const baris = petakanBarisInsentif({
      transaction_id: 4522,
      invoice_no: "INV2026-1563",
      transaction_date: "03-11-2026",
      service_staff: "Raffa",
      product_name: "Service Fee",
      quantity: span(3),
      unit_price_before_discount: span(250000),
      technician_commission_value: span(25000),
      total_technician_commission_value: span(75000),
      total_technician_commission_percent_value: span(0),
      total_unit_price: span(450000),
      business_location: "KWSN",
    });
    expect(baris.totalKomisi).toBe(75000);
    expect(baris.quantity).toBe(3);
  });

  it("komisi persentase memakai total persentasenya", () => {
    // INV0693, nizam 15%: total persentase 52.500.
    const baris = petakanBarisInsentif({
      transaction_id: 4611,
      invoice_no: "INV0693",
      transaction_date: "05-11-2026",
      service_staff: "nizam",
      product_name: "Service Fee",
      quantity: span(1),
      unit_price_before_discount: span(350000),
      technician_commission_value: span(0),
      total_technician_commission_value: span(0),
      total_technician_commission_percent_value: span(52500),
      total_unit_price: span(350000),
      business_location: "LLF",
    });
    expect(baris.totalKomisi).toBe(52500);
  });

  it("baris tanpa komisi bernilai 0", () => {
    const baris = petakanBarisInsentif({
      transaction_id: 4317,
      invoice_no: "GDG2026-0143",
      transaction_date: "28-10-2026",
      service_staff: "Raffa",
      product_name: "Battery iPhone 12/12 Pro - BATT - BR PP",
      quantity: span(1),
      unit_price_before_discount: span(650000),
      technician_commission_value: span(0),
      total_technician_commission_value: span(0),
      total_technician_commission_percent_value: span(0),
      total_unit_price: span(650000),
      business_location: "KWSN",
    });
    expect(baris.totalKomisi).toBe(0);
  });
});

describe("ubahTanggalKeIso", () => {
  it("mengubah dd-mm-yyyy menjadi yyyy-mm-dd", () => {
    expect(ubahTanggalKeIso("05-11-2026")).toBe("2026-11-05");
    expect(ubahTanggalKeIso("31-01-2026")).toBe("2026-01-31");
  });

  it("mengembalikan string kosong bila tidak cocok pola", () => {
    expect(ubahTanggalKeIso("2026-11-05")).toBe("");
    expect(ubahTanggalKeIso("5-11-2026")).toBe("");
    expect(ubahTanggalKeIso("")).toBe("");
  });
});

describe("pecahSetCookie dan gabungkanCookie", () => {
  it("tidak memotong cookie pada koma di dalam Expires", () => {
    const header =
      "session=abc123; Path=/; HttpOnly, XSRF-TOKEN=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT; Path=/";
    const pecah = pecahSetCookie(header);
    expect(pecah).toHaveLength(2);
    expect(pecah[0]).toContain("session=abc123");
    expect(pecah[1]).toContain("XSRF-TOKEN=xyz");
    expect(gabungkanCookie(pecah)).toBe("session=abc123; XSRF-TOKEN=xyz");
  });

  it("header kosong menghasilkan string kosong", () => {
    expect(pecahSetCookie("")).toEqual([]);
    expect(gabungkanCookie([])).toBe("");
  });
});

describe("bacaCookieDariHeaders", () => {
  it("memakai getSetCookie bila tersedia", () => {
    const headers = new Headers();
    const palsu = headers as unknown as {
      getSetCookie: () => string[];
    };
    palsu.getSetCookie = () => [
      "session=abc; Path=/; HttpOnly",
      "XSRF-TOKEN=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT; Path=/",
    ];
    expect(bacaCookieDariHeaders(headers)).toBe("session=abc; XSRF-TOKEN=xyz");
  });

  it("fallback ke header set-cookie gabungan bila getSetCookie tidak ada", () => {
    // Objek header tiruan tanpa getSetCookie (mis. implementasi fetch lama):
    // get("set-cookie") mengembalikan satu string gabungan.
    const tiruan = {
      get: (nama: string) =>
        nama === "set-cookie"
          ? "session=abc123; Path=/; HttpOnly, XSRF-TOKEN=xyz; Expires=Thu, 01 Jan 2026 00:00:00 GMT; Path=/"
          : null,
    } as unknown as Headers;
    expect(bacaCookieDariHeaders(tiruan)).toBe("session=abc123; XSRF-TOKEN=xyz");
  });
});

describe("kelompokkanInsentifPerUser", () => {
  const span = (nilai: number) =>
    `<span class="display_currency" data-orig-value="${nilai}">${nilai}</span>`;
  // Baris feed yang sudah dipetakan (tanggal dd-mm-yyyy seperti di iNOX).
  const barisFeed = (tanggal: string, staf: string, komisiTetap: number) =>
    petakanBarisInsentif({
      transaction_id: 1,
      invoice_no: "INV-1",
      transaction_date: tanggal,
      service_staff: staf,
      product_name: "Service Fee",
      quantity: span(1),
      unit_price_before_discount: span(100000),
      technician_commission_value: span(0),
      total_technician_commission_value: span(komisiTetap),
      total_technician_commission_percent_value: span(0),
      total_unit_price: span(100000),
      business_location: "KWSN",
    });

  it("mengelompokkan per karyawan dengan jumlah dan rentang tanggal", () => {
    const { perUser, tidakDicocokkan, tanpaTanggal } =
      kelompokkanInsentifPerUser(
        [
          barisFeed("03-11-2026", "FajriMokodompit", 75000),
          barisFeed("05-11-2026", "FajriMokodompit", 25000),
          barisFeed("05-11-2026", "nizam", 52500),
          barisFeed("06-11-2026", "Siapa", 10000),
        ],
        USERS,
      );
    expect(tanpaTanggal).toBe(0);
    expect(tidakDicocokkan).toEqual(["Siapa"]);
    expect(perUser).toHaveLength(2);
    const fajri = perUser.find((p) => p.userId === "u1")!;
    expect(fajri.jumlah).toBe(100000);
    expect(fajri.jumlahTransaksi).toBe(2);
    expect(fajri.tanggalAwal).toBe("2026-11-03");
    expect(fajri.tanggalAkhir).toBe("2026-11-05");
    expect(fajri.baris).toHaveLength(2);
    expect(fajri.baris[0].tanggal).toBe("2026-11-03");
    const nizam = perUser.find((p) => p.userId === "u4")!;
    expect(nizam.jumlah).toBe(52500);
    expect(nizam.jumlahTransaksi).toBe(1);
  });

  it("pemetaan manual menang atas pencocokan nama", () => {
    const { perUser, tidakDicocokkan } = kelompokkanInsentifPerUser(
      [barisFeed("03-11-2026", "Fajri", 75000)],
      USERS,
      [{ namaKunci: "fajri", userId: "u2" }],
    );
    expect(tidakDicocokkan).toEqual([]);
    expect(perUser).toHaveLength(1);
    expect(perUser[0].userId).toBe("u2");
  });

  it("baris tanpa tanggal dilewati dan dihitung, bukan ditebak", () => {
    const { perUser, tanpaTanggal } = kelompokkanInsentifPerUser(
      [
        barisFeed("03-11-2026", "FajriMokodompit", 75000),
        barisFeed("bukan-tanggal", "FajriMokodompit", 25000),
      ],
      USERS,
    );
    expect(tanpaTanggal).toBe(1);
    expect(perUser).toHaveLength(1);
    expect(perUser[0].jumlah).toBe(75000);
    expect(perUser[0].jumlahTransaksi).toBe(1);
  });
});

describe("ringkasInsentifPerUser", () => {
  const user = (id: string, name: string) => ({
    id,
    name,
    username: null,
    cabangNama: "KWSN",
  });
  const baris = (
    userId: string,
    tanggal: string,
    jumlah: number,
    sinkronPada: string,
  ) => ({
    userId,
    tanggal,
    jumlah,
    sinkronPada: new Date(sinkronPada),
    user: user(userId, userId === "u1" ? "Fajri Mokodompit" : "nizam"),
  });

  it("menjumlahkan per karyawan dengan rentang dan sinkron terakhir", () => {
    const hasil = ringkasInsentifPerUser([
      baris("u1", "2026-11-03", 75000, "2026-11-13T10:00:00Z"),
      baris("u1", "2026-11-05", 25000, "2026-11-13T11:00:00Z"),
      baris("u4", "2026-11-05", 52500, "2026-11-13T09:00:00Z"),
    ]);
    expect(hasil).toHaveLength(2);
    // Diurutkan menurut nama karyawan.
    expect(hasil[0].user.name).toBe("Fajri Mokodompit");
    expect(hasil[0].jumlah).toBe(100000);
    expect(hasil[0].jumlahTransaksi).toBe(2);
    expect(hasil[0].tanggalAwal).toBe("2026-11-03");
    expect(hasil[0].tanggalAkhir).toBe("2026-11-05");
    expect(hasil[0].sinkronPada).toEqual(new Date("2026-11-13T11:00:00Z"));
    expect(hasil[1].jumlah).toBe(52500);
    expect(hasil[1].jumlahTransaksi).toBe(1);
  });

  it("daftar kosong menghasilkan ringkasan kosong", () => {
    expect(ringkasInsentifPerUser([])).toEqual([]);
  });
});

describe("harusBatalkanSinkronKosong", () => {
  it("feed 0 baris + DB masih ada data = batalkan", () => {
    expect(harusBatalkanSinkronKosong(0, 5)).toBe(true);
    expect(harusBatalkanSinkronKosong(0, 1)).toBe(true);
  });

  it("feed 0 baris + DB juga kosong = lanjut normal (rentang memang kosong)", () => {
    expect(harusBatalkanSinkronKosong(0, 0)).toBe(false);
  });

  it("feed ada isinya = lanjut normal, berapa pun isi DB", () => {
    expect(harusBatalkanSinkronKosong(3, 5)).toBe(false);
    expect(harusBatalkanSinkronKosong(10, 0)).toBe(false);
  });
});

describe("jalankanSinkronInsentif", () => {
  const panggilanFetch: Array<{ url: string; init?: RequestInit }> = [];
  // Diisi per test: baris mentah feed incentive-line-orders.
  let barisFeed: Array<Record<string, unknown>> = [];

  const headersTiruan = (init: { location?: string; setCookie?: string[] } = {}) => ({
    get: (nama: string) =>
      nama.toLowerCase() === "location" ? (init.location ?? null) : null,
    getSetCookie: () => init.setCookie ?? [],
  });

  const responsTiruan = (init: {
    text?: string;
    json?: unknown;
    headers?: { location?: string; setCookie?: string[] };
  }) => ({
    ok: true,
    status: 200,
    headers: headersTiruan(init.headers),
    text: async () => init.text ?? "",
    json: async () => init.json ?? {},
  });

  const buatBarisFeed = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      transaction_id: 1000 + i,
      invoice_no: `INV-${i}`,
      transaction_date: "05-11-2026",
      service_staff: "FajriMokodompit",
      product_name: "Service Fee",
      quantity: 1,
      unit_price_before_discount: 100000,
      total_technician_commission_value: 25000,
      total_technician_commission_percent_value: 0,
      total_unit_price: 100000,
      business_location: "KWSN",
    }));

  beforeEach(() => {
    vi.clearAllMocks();
    panggilanFetch.length = 0;
    barisFeed = buatBarisFeed(2);
    vi.stubEnv("INOX_USERNAME", "sinkron");
    vi.stubEnv("INOX_PASSWORD", "rahasia");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        panggilanFetch.push({ url, init });
        if (url === "https://inox.my.id/login" && init?.method === "POST") {
          return responsTiruan({
            headers: { location: "/home", setCookie: ["sesi=xyz; Path=/"] },
          });
        }
        if (url === "https://inox.my.id/login") {
          return responsTiruan({
            text: '<form><input name="_token" value="tok123"></form>',
            headers: { setCookie: ["sesi=abc; Path=/"] },
          });
        }
        if (url === "https://inox.my.id/home") {
          return responsTiruan({ text: "<html>Keluar</html>" });
        }
        if (url === "https://inox.my.id/reports/incentive-report") {
          return responsTiruan({
            text: '<meta name="csrf-token" content="csrf-1">',
          });
        }
        if (url.startsWith("https://inox.my.id/reports/incentive-line-orders")) {
          return responsTiruan({ json: { data: barisFeed } });
        }
        throw new Error(`URL tak terduga: ${url}`);
      }),
    );
    mocksInsentif.userFindMany.mockResolvedValue(USERS);
    mocksInsentif.queryRaw.mockResolvedValue([]);
    mocksInsentif.txExecuteRaw.mockResolvedValue(0);
    mocksInsentif.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({ $executeRaw: mocksInsentif.txExecuteRaw }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  /** Gabung potongan template SQL panggilan $executeRaw ke-n. */
  const sqlPanggilan = (i: number) =>
    (mocksInsentif.txExecuteRaw.mock.calls[i][0] as TemplateStringsArray).join("?");
  /** Nilai yang diinterpolasi ke template SQL panggilan $executeRaw ke-n. */
  const nilaiPanggilan = (i: number) => mocksInsentif.txExecuteRaw.mock.calls[i].slice(1);

  it("satu DELETE IN + INSERT batch dalam satu transaksi, semua fetch ber-timeout", async () => {
    barisFeed = buatBarisFeed(501);
    const hasil = await jalankanSinkronInsentif("2026-11");

    expect(hasil.ok).toBe(true);
    expect(hasil.totalTransaksi).toBe(501);
    expect(hasil.totalUserDisinkron).toBe(1);

    // Satu transaksi untuk hapus + sisip.
    expect(mocksInsentif.transaction).toHaveBeenCalledTimes(1);
    // 1 DELETE + 2 INSERT (batch 500 + 1), bukan 4 DELETE + 501 INSERT.
    expect(mocksInsentif.txExecuteRaw).toHaveBeenCalledTimes(3);
    expect(sqlPanggilan(0)).toContain('DELETE FROM "InsentifTransaksi"');
    expect(sqlPanggilan(0)).toContain("IN (");
    // DELETE memakai IN dengan seluruh karyawan aktif (4 user).
    const nilaiDelete = nilaiPanggilan(0)[0] as { values?: unknown[] };
    expect(nilaiDelete.values).toHaveLength(4);
    expect(sqlPanggilan(1)).toContain('INSERT INTO "InsentifTransaksi"');
    expect(sqlPanggilan(2)).toContain('INSERT INTO "InsentifTransaksi"');
    // Batch pertama 500 baris, sisanya 1 baris. Prisma.join meratakan
    // nilai: tiap baris menyumbang 9 nilai (9 kolom), jadi 500 baris =
    // 4500 nilai dan 1 baris = 9 nilai.
    const nilaiInsert1 = nilaiPanggilan(1)[0] as { values?: unknown[] };
    const nilaiInsert2 = nilaiPanggilan(2)[0] as { values?: unknown[] };
    expect(nilaiInsert1.values).toHaveLength(500 * 9);
    expect(nilaiInsert2.values).toHaveLength(1 * 9);

    // Semua fetch di jalur sinkron membawa AbortSignal timeout 30 detik.
    expect(panggilanFetch).toHaveLength(5);
    for (const p of panggilanFetch) {
      expect(p.init?.signal).toBeInstanceOf(AbortSignal);
      expect(p.init?.signal?.aborted).toBe(false);
    }
  });

  it("feed kosong + data lama masih ada = batal sebelum ada yang dihapus", async () => {
    barisFeed = [];
    mocksInsentif.queryRaw.mockResolvedValueOnce([{ jumlah: 3 }]);
    await expect(jalankanSinkronInsentif("2026-11")).rejects.toThrow(
      "Sinkron dibatalkan",
    );
    expect(mocksInsentif.transaction).not.toHaveBeenCalled();
    expect(mocksInsentif.txExecuteRaw).not.toHaveBeenCalled();
  });
});
