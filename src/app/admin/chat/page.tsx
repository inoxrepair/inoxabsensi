import { PageHeader } from "@/components/ui/primitives";
import { ambilPesanChat, ambilYangMengetik } from "@/lib/chat-data";
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
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Chat Karyawan"
        description="Satu ruang untuk semua karyawan. Pesan terhapus otomatis setelah 24 jam."
      />
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
