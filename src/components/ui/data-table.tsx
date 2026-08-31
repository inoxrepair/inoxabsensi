/**
 * Tabel data untuk halaman admin. Dibuat generic supaya tiap halaman
 * hanya mendefinisikan kolom + cara render sel, tanpa duplikasi markup.
 */
export type Kolom<T> = {
  /** Judul kolom */
  header: string;
  /** Isi sel */
  cell: (row: T) => React.ReactNode;
  /** Rata kanan untuk angka */
  numeric?: boolean;
  /** Jadikan sel ini header baris (aksesibilitas) */
  rowHeader?: boolean;
};

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: Kolom<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((col) => (
              <th
                key={col.header}
                scope="col"
                className={`py-2 pr-4 font-medium last:pr-0 ${
                  col.numeric ? "text-right" : ""
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line/70">
              {columns.map((col) => {
                const className = `py-2.5 pr-4 last:pr-0 ${
                  col.numeric ? "text-right tabular-nums" : ""
                }`;

                return col.rowHeader ? (
                  <th
                    key={col.header}
                    scope="row"
                    className={`${className} text-left font-medium`}
                  >
                    {col.cell(row)}
                  </th>
                ) : (
                  <td key={col.header} className={className}>
                    {col.cell(row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
