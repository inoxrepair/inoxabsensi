import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";

/**
 * Tombol gaya kaca. Varian memetakan pola yang sudah dipakai halaman:
 * - default: tombol utama hitam (bg-ink / text-paper)
 * - outline: tombol sekunder berbingkai (border-line)
 * - glass: tombol di atas panel kaca (bg-white/60 + backdrop-blur)
 * - ghost: tanpa bingkai, untuk aksi ringan di dalam kartu
 * - danger: aksi merusak (teks merah status-alpa)
 * - link: teks bergaris bawah
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-ink text-paper",
        outline: "border border-line bg-transparent text-ink",
        glass:
          "border border-white/60 bg-white/60 text-ink shadow-md shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/60 dark:shadow-black/50",
        ghost: "text-ink hover:bg-surface",
        danger: "bg-status-alpa/10 text-status-alpa",
        link: "text-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        default: "h-9 px-4",
        lg: "h-10 px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Render sebagai elemen anak (mis. <Link>) alih-alih <button>. */
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
