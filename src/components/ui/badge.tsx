import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

/**
 * Badge kecil. Varian `default`/`outline` netral (menggantikan Pill lama);
 * varian status memakai warna aksen yang sama dengan StatusBadge — aksen
 * warna HANYA untuk status.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-surface text-ink ring-line",
        outline: "bg-paper text-muted ring-line",
        danger: "bg-status-alpa/10 text-status-alpa ring-status-alpa/25",
        hadir: "bg-status-hadir/10 text-status-hadir ring-status-hadir/25",
        telat: "bg-status-alpa/10 text-status-alpa ring-status-alpa/25",
        alpa: "bg-status-alpa/10 text-status-alpa ring-status-alpa/25",
        izin: "bg-status-izin/10 text-status-izin ring-status-izin/25",
        libur: "bg-surface text-muted ring-line",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
