import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

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
    <Table>
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow className="border-b border-line">
          {columns.map((col) => (
            <TableHead
              key={col.header}
              scope="col"
              className={col.numeric ? "text-right" : undefined}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((col) => {
              const className = col.numeric
                ? "text-right tabular-nums"
                : undefined;

              return col.rowHeader ? (
                <TableHead
                  key={col.header}
                  scope="row"
                  className={`py-2.5 text-sm normal-case tracking-normal text-ink ${
                    col.numeric ? "text-right tabular-nums" : ""
                  }`}
                >
                  {col.cell(row)}
                </TableHead>
              ) : (
                <TableCell key={col.header} className={className}>
                  {col.cell(row)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
