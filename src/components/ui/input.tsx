import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

/**
 * Input teks gaya kaca: bingkai border-line, latar transparan, teks 14px.
 * Aturan 16px di mobile sudah ditangani globals.css (iOS zoom).
 */
export function Input({
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted/70 disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
