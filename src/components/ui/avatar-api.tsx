/**
 * Foto profil juara Top 10 dengan cincin beranimasi (lihat globals.css).
 * `besar` = juara 1 (96px, cincin api + pijar); `biru` = peringkat 2 & 3
 * (72px, cincin biru lebih tipis, putaran lebih lambat, tanpa pijar);
 * tanpa keduanya = ukuran avatar kecil (28px, cincin api kecil).
 * Dipakai halaman Top 10 (foto pengirim juara 1).
 */

/** Inisial nama untuk avatar bila karyawan belum pasang foto profil. */
function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/);
  const huruf = bagian.slice(0, 2).map((b) => b[0] ?? "");
  return huruf.join("").toUpperCase() || "?";
}

export function AvatarApi({
  foto,
  nama,
  besar = false,
  biru = false,
}: {
  foto: string | null;
  nama: string;
  besar?: boolean;
  biru?: boolean;
}) {
  if (biru) {
    return (
      <div className="relative size-[72px] shrink-0">
        <div aria-hidden="true" className="inox-cincin-biru absolute inset-0 rounded-full" />
        <div className="absolute inset-[2px] rounded-full bg-paper" />
        {foto ? (
          <img
            src={foto}
            alt={`Foto ${nama}`}
            className="absolute inset-[4px] size-16 rounded-full object-cover"
          />
        ) : (
          <span className="absolute inset-[4px] flex size-16 items-center justify-center rounded-full bg-surface text-base font-semibold">
            {inisial(nama)}
          </span>
        )}
      </div>
    );
  }

  if (!besar) {
    return (
      <span className="relative size-7 shrink-0">
        <span
          aria-hidden="true"
          className="inox-nyala-api absolute -inset-0.5 rounded-full bg-orange-500/50 blur-[3px]"
        />
        <span aria-hidden="true" className="inox-cincin-api absolute inset-0 rounded-full" />
        <span className="absolute inset-[2px] rounded-full bg-paper" />
        {foto ? (
          <img
            src={foto}
            alt={`Foto ${nama}`}
            className="absolute inset-[2px] size-6 rounded-full object-cover"
          />
        ) : (
          <span className="absolute inset-[2px] flex size-6 items-center justify-center rounded-full bg-surface text-[10px] font-semibold">
            {inisial(nama)}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="relative size-24 shrink-0">
      <div
        aria-hidden="true"
        className="inox-nyala-api absolute -inset-1 rounded-full bg-orange-500/50 blur-md"
      />
      <div aria-hidden="true" className="inox-cincin-api absolute inset-0 rounded-full" />
      <div className="absolute inset-[3px] rounded-full bg-paper" />
      {foto ? (
        <img
          src={foto}
          alt={`Foto ${nama}`}
          className="absolute inset-[5px] size-[86px] rounded-full object-cover"
        />
      ) : (
        <span className="absolute inset-[5px] flex size-[86px] items-center justify-center rounded-full bg-surface text-lg font-semibold">
          {inisial(nama)}
        </span>
      )}
    </div>
  );
}
