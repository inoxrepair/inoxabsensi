import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/**
 * Tabel gaya shadcn dengan tampilan tabel yang sudah ada di halaman admin
 * (header kecil huruf besar, baris bergaris border-line/70). Untuk tabel
 * data generik berbasis kolom, tetap pakai DataTable di data-table.tsx.
 */
export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  );
}

export function TableFooter({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn("border-t border-line font-medium", className)}
      {...props}
    />
  );
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-line/70", className)} {...props} />
  );
}

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-muted last:pr-0",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("py-2.5 pr-4 last:pr-0", className)} {...props} />
  );
}

export function TableCaption({
  className,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption className={cn("sr-only", className)} {...props} />
  );
}
