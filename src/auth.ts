import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { authConfig } from "@/auth.config";
import { db } from "@/lib/db";
import { bacaRole } from "@/lib/domain";
import { loginSkema } from "@/lib/akun";

/** Login Google hanya diaktifkan jika kredensial OAuth tersedia. */
const googleAktif = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identifier: { label: "Username atau email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSkema.safeParse(raw);
        if (!parsed.success) return null;

        const identifier = parsed.data.identifier.toLowerCase();
        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }],
          },
        });

        // Pesan seragam: jangan bocorkan apakah email terdaftar.
        if (!user?.passwordHash || !user.aktif) return null;

        const cocok = await compare(parsed.data.password, user.passwordHash);
        if (!cocok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: bacaRole(user.role),
          cabangId: user.cabangId,
          jabatan: user.jabatan,
        };
      },
    }),
    ...(googleAktif ? [Google] : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Google hanya boleh dipakai akun yang sudah didaftarkan admin.
     * Tanpa ini, siapa pun dengan akun Google bisa masuk.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const terdaftar = await db.user.findUnique({
        where: { email: user.email },
        select: { aktif: true },
      });
      return terdaftar?.aktif ?? false;
    },
    /** Google tidak melewati authorize(), jadi atribut domain diambil di sini. */
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const row = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, cabangId: true, jabatan: true },
        });
        if (row) {
          token.sub = row.id;
          token.role = bacaRole(row.role);
          token.cabangId = row.cabangId;
          token.jabatan = row.jabatan;
        }
        return token;
      }
      return authConfig.callbacks.jwt({ token, user });
    },
  },
});
