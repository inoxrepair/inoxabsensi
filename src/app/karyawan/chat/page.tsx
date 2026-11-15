import { ambilPesanChat, ambilYangMengetik, tandaiChatDibaca } from "@/lib/chat-data";
import { ambilTop5 } from "@/lib/top5-data";
import { wajibLogin } from "@/lib/session";
import { DaftarChat } from "./daftar-chat";
import { FormChat } from "./form-chat";

/** Ruang chat bersama untuk semua karyawan (semua cabang, semua role). */
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const sesi = await wajibLogin();
  const [pesan, mengetik, top10] = await Promise.all([
    ambilPesanChat(),
    ambilYangMengetik(sesi.id),
    ambilTop5(),
    tandaiChatDibaca(sesi.id),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Chat Karyawan</h1>
      <p className="mt-1 text-sm text-muted">
        Satu ruang untuk semua karyawan. Pesan terhapus otomatis setelah
        24 jam.
      </p>

      <div className="mt-4">
        <DaftarChat
          pesan={pesan}
          sayaId={sesi.id}
          mengetik={mengetik}
          juaraId={top10.peringkat[0]?.userId ?? null}
        />
      </div>

      <div className="sticky bottom-24 z-10 mt-4">
        <FormChat />
      </div>
    </div>
  );
}
