import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

/** Textarea gaya kaca, sepadan dengan Input. */
export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted/70 disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
