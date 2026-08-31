import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { TombolKeluar } from "@/components/layout/tombol-keluar";
import { Logo } from "@/components/brand/logo";
import { LABEL_ROLE } from "@/lib/domain";
import { menuDiizinkan, wajibLogin } from "@/lib/session";
import { ADMIN_NAV } from "@/lib/nav";

/** Inisial nama untuk avatar teks. */
function inisial(nama: string) {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await wajibLogin();
  const izin = await menuDiizinkan(user.role);
  const menu = ADMIN_NAV.filter((n) => izin.has(n.menu));

  return (
    <div className="flex min-h-dvh">
      <AdminSidebar menu={menu} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-line bg-paper px-4 md:px-6">
          <div className="md:hidden">
            <Logo size={26} />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.nama}</p>
              <p className="text-xs text-muted">{LABEL_ROLE[user.role]}</p>
            </div>
            <div
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full bg-ink text-sm font-medium text-paper"
            >
              {inisial(user.nama)}
            </div>
            <TombolKeluar className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
