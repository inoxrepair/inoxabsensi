/** Lencana angka merah untuk jumlah pesan chat belum dibaca (maks. "99+"). */
export function LencanaJumlah({
  jumlah,
  className = "",
}: {
  jumlah: number;
  className?: string;
}) {
  if (jumlah <= 0) return null;
  return (
    <span
      className={`grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}
    >
      {jumlah > 99 ? "99+" : jumlah}
    </span>
  );
}
