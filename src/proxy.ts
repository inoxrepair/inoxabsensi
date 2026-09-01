import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

/**
 * Proxy (dulu middleware) berjalan sebelum route dirender dan memakai runtime
 * edge, jadi hanya authConfig yang dipakai — tanpa Prisma & bcrypt.
 * Cek izin per menu tetap dilakukan di server component lewat lib/session.ts.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const tujuanAdmin = pathname.startsWith("/admin");
  const tujuanKaryawan = pathname.startsWith("/karyawan");

  if (!user) {
    if (!tujuanAdmin && !tujuanKaryawan) return NextResponse.next();

    // Simpan tujuan awal supaya bisa dikembalikan setelah login.
    const login = new URL("/login", req.nextUrl.origin);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const beranda = user.role === "karyawan" ? "/karyawan" : "/admin";

  // Proxy tidak memutuskan izin role karena JWT dapat tertinggal setelah
  // role diubah admin. Setiap halaman admin memanggil wajibAkses(), yang
  // membaca role terbaru dari database dan mengembalikan 403 bila dilarang.

  // Sudah login tapi membuka /login: arahkan ke beranda sesuai role.
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(beranda, req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Lewati aset statis & endpoint Auth.js agar tidak ikut diproses.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
