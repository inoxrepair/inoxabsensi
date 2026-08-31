"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import type { NavItem } from "@/lib/nav";

export function AdminSidebar({ menu }: { menu: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-paper md:flex md:flex-col">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Logo size={28} />
      </div>

      <nav aria-label="Menu admin" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {menu.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-ink font-medium text-paper"
                      : "text-muted hover:bg-surface hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
