import { Logo } from "@/components/brand/logo";
import { FormLogin } from "./form-login";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const googleAktif = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="flex justify-center">
        <Logo size={44} />
      </div>

      <h1 className="mt-8 text-center text-lg font-semibold tracking-tight">
        Masuk ke akun Anda
      </h1>
      <p className="mt-1 text-center text-sm text-muted">
        {googleAktif
          ? "Gunakan email kantor atau akun Google Anda"
          : "Gunakan email kantor dan password Anda"}
      </p>

      <FormLogin next={next} googleAktif={googleAktif} />
    </main>
  );
}
