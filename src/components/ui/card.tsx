import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Kartu kaca gaya shadcn (komposabel): CardHeader/CardTitle/CardContent/
 * CardFooter disusun manual. Menggantikan `Card` prop-based lama
 * (primitives.tsx, dihapus saat migrasi shadcn — tidak ada lagi yang
 * memakainya).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/60 bg-white/60 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/50",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-line px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <h2 className={cn("text-sm font-semibold", className)} {...props} />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-t border-line px-4 py-3 text-sm text-muted",
        className,
      )}
      {...props}
    />
  );
}
