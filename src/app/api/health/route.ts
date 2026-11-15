import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check + diagnostik ringan tabel Chat: apakah tabel ChatPesan /
 * ChatMengetik ada di database ini dan berapa pesan 24 jam terakhir.
 * Dipakai untuk memastikan migrasi chat benar-benar jalan di production
 * (pesan yang hilang diam-diam = tabel tidak ada atau baca yang gagal).
 * Tidak menampilkan isi pesan apa pun, hanya hitungan.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    let chat: { pesan24jam: number | null; tabelPesan: boolean; tabelMengetik: boolean } = {
      pesan24jam: null,
      tabelPesan: false,
      tabelMengetik: false,
    };
    try {
      const tabel = await db.$queryRaw<{ nama: string }[]>`
        SELECT "table_name" AS "nama" FROM "information_schema"."tables"
        WHERE "table_schema" = 'public'
          AND "table_name" IN ('ChatPesan', 'ChatMengetik')
      `;
      const ada = new Set(tabel.map((t) => t.nama));
      chat.tabelPesan = ada.has("ChatPesan");
      chat.tabelMengetik = ada.has("ChatMengetik");
      if (chat.tabelPesan) {
        const hitung = await db.$queryRaw<{ jumlah: bigint }[]>`
          SELECT COUNT(*)::bigint AS "jumlah" FROM "ChatPesan"
          WHERE "dibuatPada" >= NOW() - INTERVAL '24 hours'
        `;
        chat.pesan24jam = Number(hitung[0]?.jumlah ?? 0);
      }
    } catch (error) {
      console.error("[health] diagnostik chat gagal:", error);
    }
    return Response.json(
      {
        status: "ok",
        database: "connected",
        chat,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "error", database: "disconnected" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
