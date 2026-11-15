"use client";

import { cn } from "@/lib/utils";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Tabs (Radix) gaya kaca. Belum dipakai halaman mana pun saat ini
 * (survei Fase 1: tidak ada tab di src/app) — disediakan untuk kebutuhan
 * fase 2 bila ada navigasi tab yang dimigrasikan.
 */
export function Tabs({
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />;
}

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-white/60 bg-white/60 p-1 text-muted shadow-md shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/50",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-ink data-[state=active]:text-paper",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content className={cn("mt-2", className)} {...props} />
  );
}
