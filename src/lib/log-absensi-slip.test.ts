import { describe, expect, it } from "vitest";
import { bangunLogAbsensiSlip } from "./log-absensi-slip";

const PAGI = { nama: "Pagi", mulaiMenit: 510, selesaiMenit: 990 }; // 08.30–16.30
const FLEKSIBEL = { nama: "Fleksibel", mulaiMenit: 480, selesaiMenit: 1320 };

describe("bangunLogAbsensiSlip", () => {
  it("satu baris per tanggal dalam jendela, urut tanggal", () => {
    const log = bangunLogAbsensiSlip({
      dari: "2026-11-02",
      sampai: "2026-11-04",
      catatan: [],
      jadwal: [],
    });
    expect(log.map((b) => b.tanggal)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
    ]);
    // Tanpa jadwal dan tanpa absensi = off.
    expect(log[0].keadaan).toBe("off");
    expect(log[0].shiftNama).toBeNull();
    expect(log[0].menitKerja).toBeNull();
  });

  it("hari hadir: status, jam masuk/keluar, dan menit kerja dari cycle", () => {
    const log = bangunLogAbsensiSlip({
      dari: "2026-11-02",
      sampai: "2026-11-02",
      catatan: [
        {
          tanggal: "2026-11-02",
          status: "hadir",
          masukMenit: 511,
          keluarMenit: 995,
          menitTelat: 0,
          cabangNama: "KWSN",
          cycles: [{ masukMenit: 511, keluarMenit: 995 }],
        },
      ],
      jadwal: [{ tanggal: "2026-11-02", shift: PAGI }],
    });
    expect(log).toHaveLength(1);
    expect(log[0].keadaan).toBe("hadir");
    expect(log[0].shiftNama).toBe("Pagi");
    expect(log[0].shiftJam).toBe("08.30–16.30");
    expect(log[0].masukMenit).toBe(511);
    expect(log[0].keluarMenit).toBe(995);
    expect(log[0].menitKerja).toBe(484); // 08.31–16.35
    expect(log[0].cabang).toBe("KWSN");
  });

  it("hari telat memakai menit telat tercatat", () => {
    const log = bangunLogAbsensiSlip({
      dari: "2026-11-03",
      sampai: "2026-11-03",
      catatan: [
        {
          tanggal: "2026-11-03",
          status: "telat",
          masukMenit: 525,
          keluarMenit: 990,
          menitTelat: 5,
          cabangNama: "KWSN",
          cycles: [{ masukMenit: 525, keluarMenit: 990 }],
        },
      ],
      jadwal: [{ tanggal: "2026-11-03", shift: PAGI }],
    });
    expect(log[0].keadaan).toBe("telat");
    expect(log[0].menitTelat).toBe(5);
    expect(log[0].menitKerja).toBe(465);
  });

  it("hari tanpa absensi tetapi ada jadwal = alpa; tanpa jadwal = off", () => {
    const log = bangunLogAbsensiSlip({
      dari: "2026-11-04",
      sampai: "2026-11-05",
      catatan: [],
      jadwal: [{ tanggal: "2026-11-04", shift: PAGI }],
    });
    expect(log[0].keadaan).toBe("alpa");
    expect(log[0].shiftNama).toBe("Pagi");
    expect(log[0].masukMenit).toBeNull();
    expect(log[0].menitKerja).toBeNull();
    expect(log[0].cabang).toBeNull();
    expect(log[1].keadaan).toBe("off");
    expect(log[1].shiftNama).toBeNull();
  });

  it("hari fleksibel: menit kerja = jumlah semua cycle", () => {
    const log = bangunLogAbsensiSlip({
      dari: "2026-11-02",
      sampai: "2026-11-02",
      catatan: [
        {
          tanggal: "2026-11-02",
          status: "hadir",
          masukMenit: 480,
          keluarMenit: 1050,
          menitTelat: 0,
          cabangNama: "KWSN",
          cycles: [
            { masukMenit: 480, keluarMenit: 720 },
            { masukMenit: 780, keluarMenit: 1050 },
          ],
        },
      ],
      jadwal: [{ tanggal: "2026-11-02", shift: FLEKSIBEL }],
    });
    expect(log[0].keadaan).toBe("hadir");
    expect(log[0].shiftNama).toBe("Fleksibel");
    expect(log[0].masukMenit).toBe(480); // cycle pertama
    expect(log[0].keluarMenit).toBe(1050); // cycle terakhir
    expect(log[0].menitKerja).toBe(510); // 4 jam + 4,5 jam
  });

  it("hari izin memakai status absensi, bukan alpa", () => {
    const log = bangunLogAbsensiSlip({
      dari: "2026-11-02",
      sampai: "2026-11-02",
      catatan: [
        {
          tanggal: "2026-11-02",
          status: "izin",
          masukMenit: null,
          keluarMenit: null,
          menitTelat: 0,
          cabangNama: null,
          cycles: [],
        },
      ],
      jadwal: [{ tanggal: "2026-11-02", shift: PAGI }],
    });
    expect(log[0].keadaan).toBe("izin");
    expect(log[0].masukMenit).toBeNull();
    expect(log[0].menitKerja).toBeNull();
  });
});
