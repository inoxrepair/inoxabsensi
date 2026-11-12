import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gabung class Tailwind (pola shadcn); dipakai komponen kaca cair. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
