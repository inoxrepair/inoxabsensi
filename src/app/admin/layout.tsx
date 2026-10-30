import { AdminLayoutClient } from "@/components/layout/admin-layout-client";
import { LABEL_ROLE } from "@/lib/domain";
import { menuDiizinkan, wajibLogin } from "@/lib/session";
import { ADMIN_NAV } from "@/lib/nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await wajibLogin();
  const izin = await menuDiizinkan(user.role);
  const menu = ADMIN_NAV.filter((n) => izin.has(n.menu));

  return (
    <AdminLayoutClient
      menu={menu}
      nama={user.nama}
      labelRole={LABEL_ROLE[user.role]}
    >
      {children}
    </AdminLayoutClient>
  );
}
