export function Logo({
  size = 32,
  variant = "dark",
}: {
  size?: number;
  variant?: "dark" | "light";
}) {
  const bg = variant === "dark" ? "#111111" : "#FFFFFF";
  const fg = variant === "dark" ? "#FFFFFF" : "#111111";

  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-label="Logo iNOX Absensi"
      >
        <rect width="32" height="32" rx="8" fill={bg} />
        <path
          d="M9 22V13.5M9 10.6h.01"
          stroke={fg}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M15.5 22V13.5c0-.6.5-1 1.1-1h3.3c1.4 0 2.6 1.1 2.6 2.6V22"
          stroke={fg}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">
        iNOX <span className="font-normal text-muted">Absensi</span>
      </span>
    </span>
  );
}
