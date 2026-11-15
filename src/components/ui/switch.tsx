"use client";

import { cn } from "@/lib/utils";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Switch (Radix). Belum dipakai halaman mana pun saat ini (survei Fase 1:
 * tidak ada toggle/switch di src/app) — disediakan untuk kebutuhan fase 2
 * bila ada toggle yang dimigrasikan. Nyala = hitam (bg-ink), mati = surface.
 */
export function Switch({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line bg-surface transition-colors data-[state=checked]:border-ink data-[state=checked]:bg-ink disabled:opacity-40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-paper shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}
