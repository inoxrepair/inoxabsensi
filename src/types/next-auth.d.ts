import type { RoleKaryawan } from "@/lib/domain";

/** Atribut domain iNox yang ditempelkan ke sesi & JWT. */
type AtributKaryawan = {
  role: RoleKaryawan;
  cabangId: string | null;
  jabatan: string;
};

declare module "next-auth" {
  interface Session {
    user: AtributKaryawan & {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User extends AtributKaryawan {}
}

/**
 * Interface JWT dideklarasikan di @auth/core/jwt; "next-auth/jwt" hanya
 * me-reekspornya, sehingga augmentasi harus menyasar modul aslinya.
 */
declare module "@auth/core/jwt" {
  interface JWT extends AtributKaryawan {}
}
