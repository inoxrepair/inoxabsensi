import { describe, expect, it } from "vitest";
import { jarakMeter, periksaRadius } from "./geo";

const KOTAMOBAGU = { lat: 0.7333, lng: 124.3167 };

describe("jarakMeter", () => {
  it("nol untuk titik yang sama", () => {
    expect(jarakMeter(KOTAMOBAGU, KOTAMOBAGU)).toBe(0);
  });

  it("simetris", () => {
    const manado = { lat: 1.4748, lng: 124.8421 };
    expect(jarakMeter(KOTAMOBAGU, manado)).toBeCloseTo(
      jarakMeter(manado, KOTAMOBAGU),
      6,
    );
  });

  it("1 derajat lintang ~111,2 km", () => {
    const jarak = jarakMeter({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(jarak).toBeGreaterThan(111_000);
    expect(jarak).toBeLessThan(111_400);
  });

  it("akurat pada jarak pendek (~11,1 m per 0,0001 derajat)", () => {
    const jarak = jarakMeter(KOTAMOBAGU, {
      lat: KOTAMOBAGU.lat + 0.0001,
      lng: KOTAMOBAGU.lng,
    });
    expect(jarak).toBeCloseTo(11.1, 1);
  });

  it("Kotamobagu-Manado sekitar 100 km", () => {
    const jarak = jarakMeter(KOTAMOBAGU, { lat: 1.4748, lng: 124.8421 });
    expect(jarak / 1000).toBeGreaterThan(95);
    expect(jarak / 1000).toBeLessThan(105);
  });
});

describe("periksaRadius", () => {
  const cabang = { ...KOTAMOBAGU, radiusMeter: 100 };

  it("menerima posisi di dalam radius", () => {
    const hasil = periksaRadius(
      { lat: KOTAMOBAGU.lat + 0.0003, lng: KOTAMOBAGU.lng },
      cabang,
    );
    expect(hasil.dalamRadius).toBe(true);
    expect(hasil.jarakMeter).toBe(33);
  });

  it("menolak posisi di luar radius", () => {
    const hasil = periksaRadius(
      { lat: KOTAMOBAGU.lat + 0.005, lng: KOTAMOBAGU.lng },
      cabang,
    );
    expect(hasil.dalamRadius).toBe(false);
    expect(hasil.jarakMeter).toBeGreaterThan(500);
  });

  it("batas radius bersifat inklusif", () => {
    const hasil = periksaRadius(KOTAMOBAGU, { ...KOTAMOBAGU, radiusMeter: 0 });
    expect(hasil).toEqual({ dalamRadius: true, jarakMeter: 0 });
  });

  it("jarak selalu bilangan bulat", () => {
    const { jarakMeter: jarak } = periksaRadius(
      { lat: KOTAMOBAGU.lat + 0.00042, lng: KOTAMOBAGU.lng - 0.00017 },
      cabang,
    );
    expect(Number.isInteger(jarak)).toBe(true);
  });
});
