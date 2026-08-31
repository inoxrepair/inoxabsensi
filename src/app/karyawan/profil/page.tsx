import { TombolKeluar } from "@/components/layout/tombol-keluar";
import { db } from "@/lib/db";
import { LABEL_ROLE } from "@/lib/domain";
import { wajibLogin } from "@/lib/session";
import { formatTanggal } from "@/lib/format";
import { FormPassword } from "./form-password";

export const dynamic = "force-dynamic";

function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function KaryawanProfilPage() {
  const sesi = await wajibLogin();
  const user = await db.user.findUniqueOrThrow({
    where: { id: sesi.id },
    select: {
      name: true,
      email: true,
      username: true,
      jabatan: true,
      role: true,
      tanggalMasuk: true,
      cabang: { select: { nama: true } },
    },
  });

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Profil</h1>

      <div className="mt-5 flex items-center gap-3.5 rounded-xl border border-line bg-paper p-4">
        <div
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-ink text-lg font-medium text-paper"
        >
          {inisial(user.name)}
        </div>
        <div className="min-w-0">
          <p className="font-medium">{user.name}</p>
          <p className="text-sm text-muted">{user.jabatan}</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-paper text-sm">
        {[
          ["Cabang", user.cabang?.nama ?? "Belum ditempatkan"],
          ["Email", user.email],
          ["Username", user.username ? `@${user.username}` : "Belum diatur"],
          ["Bergabung", formatTanggal(user.tanggalMasuk)],
          ["Role", LABEL_ROLE[sesi.role]],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <FormPassword />

      <div className="mt-4">
        <TombolKeluar className="block w-full rounded-xl border border-line bg-paper px-4 py-3 text-center text-sm font-medium" />
      </div>
    </>
  );
}
