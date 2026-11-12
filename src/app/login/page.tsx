import { Logo } from "@/components/brand/logo";
import { LatarLiquid } from "@/components/ui/latar-liquid";
import { LiquidGlass } from "@/components/ui/liquid-glass";
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
    <main className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <LatarLiquid />

      <LiquidGlass
        variant="regular"
        tint="rgba(255, 255, 255, 0.6)"
        cornerRadius={32}
        className="p-6 sm:p-8"
      >
        <div className="flex justify-center">
          <Logo size={64} />
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
      </LiquidGlass>
    </main>
  );
}
