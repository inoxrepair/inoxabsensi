/**
 * Foto profil juara 1 Top 10 dengan cincin api: gradasi api berputar +
 * pijar berdenyut di belakangnya (lihat .inox-cincin-api di globals.css).
 * `besar` = ukuran podium (96px); kecil = ukuran avatar chat (28px).
 * Dipakai halaman Top 10 dan daftar chat (foto pengirim juara 1).
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
}: {
  foto: string | null;
  nama: string;
  besar?: boolean;
}) {
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
