import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi Auth.js yang bebas dependensi Node (tanpa Prisma/bcrypt),
 * sehingga aman dipakai di proxy.ts yang berjalan di runtime edge.
 * Provider yang butuh database didaftarkan di src/auth.ts.
 */
export const authConfig = {
  /**
   * Sesi login berlaku 1 hari sejak login. updateAge sengaja sama dengan
   * maxAge, jadi sesi TIDAK diperpanjang otomatis saat dipakai — karyawan
   * login ulang tiap hari. Ini juga membatasi efek "password diubah
   * diam-diam tertutup sesi lama" (dulu sampai 30 hari) menjadi 1 hari.
   */
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    /** Salin atribut domain ke token agar proxy & server component tidak query DB. */
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.cabangId = user.cabangId;
        token.jabatan = user.jabatan;
      }
      // Foto profil JANGAN ikut ke token: Auth.js menyalin user.image
      // (data URL base64, puluhan–ratusan KB) ke token.picture, lalu token
      // itu di-encode jadi cookie sesi. Cookie sebesar itu ditolak Nginx
      // (header melebihi proxy buffer) sehingga login yang berhasil
      // dibalas 502 — user yang punya foto tidak bisa login segar.
      // Foto tetap diambil dari DB saat render halaman, bukan dari sesi.
      delete token.picture;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.cabangId = token.cabangId;
      session.user.jabatan = token.jabatan;
      return session;
    },
  },
} satisfies NextAuthConfig;
