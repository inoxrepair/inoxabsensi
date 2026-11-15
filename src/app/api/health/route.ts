import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check + diagnostik ringan tabel Chat: apakah tabel ChatPesan /
 * ChatMengetik ada di database ini dan berapa pesan 24 jam terakhir.
 * Dipakai untuk memastikan migrasi chat benar-benar jalan di production
 * (pesan yang hilang diam-diam = tabel tidak ada atau baca yang gagal).
 * Tidak menampilkan isi pesan apa pun, hanya hitungan.
 *
 * Dua hitungan dibedakan dengan sengaja: pesan24jam memakai NOW()
 * (tanpa parameter) sedangkan pesanTerbaca memakai SELECT yang sama
 * persis dengan ambilPesanChat (JOIN + parameter Date). Bila keduanya
 * berbeda, berarti query bacanya yang gagal — dan galatBaca membawa
 * pesan error Postgres-nya supaya penyebabnya langsung terlihat.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    let chat: {
      pesan24jam: number | null;
      tabelPesan: boolean;
      tabelMengetik: boolean;
      pesanTerbaca: number | null;
      galatBaca: string | null;
    } = {
      pesan24jam: null,
      tabelPesan: false,
      tabelMengetik: false,
      pesanTerbaca: null,
      galatBaca: null,
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
        try {
          const batasBaca = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const baca = await db.$queryRaw<{ jumlah: bigint }[]>`
            SELECT COUNT(*)::bigint AS "jumlah" FROM "ChatPesan" p
            LEFT JOIN "User" u ON u."id" = p."pengirimId"
            WHERE p."dibuatPada" >= ${batasBaca}
          `;
          chat.pesanTerbaca = Number(baca[0]?.jumlah ?? 0);
        } catch (error) {
          chat.galatBaca =
            error instanceof Error ? error.message : String(error);
          console.error("[health] probe baca chat gagal:", error);
        }
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
