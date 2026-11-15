import Top5Page from "@/app/karyawan/top5/page";
import { wajibAkses } from "@/lib/session";

/**
 * Top 10 Absensi dilihat dari shell admin — halaman yang sama dengan
 * versi karyawan (peringkat global semua cabang), hanya shell-nya admin.
 */
export default async function Top5AdminPage() {
  await wajibAkses("top5");
  return (
    <div className="mx-auto max-w-2xl">
      <Top5Page />
    </div>
  );
}
