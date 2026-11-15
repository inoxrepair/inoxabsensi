import { ambilPesanChat, ambilYangMengetik, tandaiChatDibaca } from "@/lib/chat-data";
import { ambilTop5 } from "@/lib/top5-data";
import { wajibAkses } from "@/lib/session";
import { DaftarChat } from "@/app/karyawan/chat/daftar-chat";
import { FormChat } from "@/app/karyawan/chat/form-chat";

/** Ruang chat bersama, dilihat dari shell admin (ruang yang sama). */
export const dynamic = "force-dynamic";

export default async function ChatAdminPage() {
  const sesi = await wajibAkses("chat");
  const [pesan, mengetik, top10] = await Promise.all([
    ambilPesanChat(),
    ambilYangMengetik(sesi.id),
    ambilTop5(),
    tandaiChatDibaca(sesi.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chat Karyawan</h1>
          <p className="mt-1 text-sm text-muted">
            Satu ruang untuk semua karyawan. Pesan terhapus otomatis setelah 24 jam.
          </p>
        </div>
      </header>
      <DaftarChat
        pesan={pesan}
        sayaId={sesi.id}
        mengetik={mengetik}
        juaraId={top10.peringkat[0]?.userId ?? null}
      />
      <div className="mt-4">
        <FormChat />
      </div>
    </div>
  );
}
