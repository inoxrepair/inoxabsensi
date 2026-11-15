"use client";

import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentPropsWithoutRef } from "react";

/** Label form (Radix). Halaman lama memakai `text-xs text-muted`; tambah className bila perlu. */
export function Label({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
