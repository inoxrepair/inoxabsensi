import type { NextAuthConfig } from "next-auth";

/**
 * Konfigurasi Auth.js yang bebas dependensi Node (tanpa Prisma/bcrypt),
 * sehingga aman dipakai di proxy.ts yang berjalan di runtime edge.
 * Provider yang butuh database didaftarkan di src/auth.ts.
 */
export const authConfig = {
  session: { strategy: "jwt" },
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
