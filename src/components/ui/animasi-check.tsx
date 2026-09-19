"use client";

/**
 * Overlay centang satu detik sebagai umpan balik absensi. Murni CSS sehingga
 * tidak ada library animasi dan tidak ada permintaan jaringan.
 */
export function AnimasiCheck({
  judul,
  keterangan,
}: {
  judul: string;
  keterangan?: string;
}) {
  return (
    <div
      className="inox-overlay-check pointer-events-none fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-paper px-8 py-7 shadow-xl">
        <span className="inox-lingkaran-check grid size-20 place-items-center rounded-full bg-status-hadir/15">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="size-10"
            aria-hidden="true"
          >
            <path
              className="inox-centang-check"
              d="M5 13l4 4L19 7"
              stroke="var(--color-status-hadir)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-base font-semibold">{judul}</p>
        {keterangan ? (
          <p className="text-sm text-muted">{keterangan}</p>
        ) : null}
      </div>
    </div>
  );
}