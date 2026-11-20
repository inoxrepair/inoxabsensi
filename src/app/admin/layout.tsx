import { AdminLayoutClient } from "@/components/layout/admin-layout-client";
import { LatarLiquid } from "@/components/ui/latar-liquid";
import { hitungPesanBelumDibaca } from "@/lib/chat-data";
import { LABEL_ROLE } from "@/lib/domain";
import { hitungPengajuanIzinPending } from "@/lib/izin-data";
import { menuDiizinkan, wajibLogin } from "@/lib/session";
import { ADMIN_NAV } from "@/lib/nav";
import { bacaVersiLogo } from "@/lib/pengaturan";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await wajibLogin();
  const izin = await menuDiizinkan(user.role);
  const menu = ADMIN_NAV.filter((n) => izin.has(n.menu));
  const versiLogo = await bacaVersiLogo();
  const jmlBelumDibacaChat = await hitungPesanBelumDibaca(user.id);
  const jmlPendingIzin = await hitungPengajuanIzinPending(user);

  return (
    <div className="relative min-h-dvh">
      <LatarLiquid />
      <AdminLayoutClient
        menu={menu}
        nama={user.nama}
        labelRole={LABEL_ROLE[user.role]}
        versiLogo={versiLogo}
        jmlBelumDibacaChat={jmlBelumDibacaChat}
        jmlPendingIzin={jmlPendingIzin}
      >
        {children}
      </AdminLayoutClient>
    </div>
  );
}
