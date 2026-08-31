import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BarisJadwal, Shift } from "@/app/admin/jadwal/matriks-jadwal";
import { kodeShift } from "@/lib/spreadsheet";
import { formatTanggalPanjang } from "@/lib/format";

const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
const MARGIN = 28;
const NAME_WIDTH = 125;
const DATE_WIDTH = 38;
const ROW_HEIGHT = 18;
const HEADER_HEIGHT = 36;

/**
 * PDF jadwal membagi kolom tanggal per halaman horizontal dan baris karyawan
 * per halaman vertikal. Kode Off ditampilkan dengan background merah muda.
 */
export async function buatJadwalPdf({
  dates,
  rows,
  shifts,
  title,
}: {
  dates: string[];
  rows: BarisJadwal[];
  shifts: Shift[];
  title: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const shiftNames = new Map(shifts.map((s) => [s.id, s.nama]));
  const datesPerPage = Math.max(1, Math.floor((A4_LANDSCAPE[0] - MARGIN * 2 - NAME_WIDTH) / DATE_WIDTH));
  const rowsPerPage = Math.max(1, Math.floor((A4_LANDSCAPE[1] - MARGIN * 2 - 54 - HEADER_HEIGHT) / ROW_HEIGHT));

  for (let dc = 0; dc < dates.length; dc += datesPerPage) {
    const dateChunk = dates.slice(dc, dc + datesPerPage);
    for (let rc = 0; rc < Math.max(rows.length, 1); rc += rowsPerPage) {
      const rowChunk = rows.slice(rc, rc + rowsPerPage);
      const page = pdf.addPage(A4_LANDSCAPE);
      const { height } = page.getSize();
      page.drawText(title, { x: MARGIN, y: height - MARGIN, size: 13, font: bold, color: rgb(0.07, 0.07, 0.07) });
      page.drawText(`Tanggal ${formatTanggalPanjang(dateChunk[0])} - ${formatTanggalPanjang(dateChunk[dateChunk.length - 1])}`, {
        x: MARGIN,
        y: height - MARGIN - 18,
        size: 8,
        font: regular,
        color: rgb(0.4, 0.4, 0.4),
      });

      const top = height - MARGIN - 48;
      drawCell(page, MARGIN, top - HEADER_HEIGHT, NAME_WIDTH, HEADER_HEIGHT, "Karyawan", bold, true);
      dateChunk.forEach((date, i) => {
        const label = formatTanggalPanjang(date).replace(/\s+/g, " ");
        drawCell(page, MARGIN + NAME_WIDTH + i * DATE_WIDTH, top - HEADER_HEIGHT, DATE_WIDTH, HEADER_HEIGHT, label, regular, true, 5);
      });

      rowChunk.forEach((row, ri) => {
        const y = top - HEADER_HEIGHT - (ri + 1) * ROW_HEIGHT;
        drawCell(page, MARGIN, y, NAME_WIDTH, ROW_HEIGHT, row.nama, regular, false, 7);
        dateChunk.forEach((date, di) => {
          const globalIndex = dc + di;
          const cell = row.hari[globalIndex];
          const code = cell ? kodeShift(shiftNames.get(cell.shiftId) ?? "-") : "Off";
          drawCell(
            page,
            MARGIN + NAME_WIDTH + di * DATE_WIDTH,
            y,
            DATE_WIDTH,
            ROW_HEIGHT,
            code,
            bold,
            false,
            7,
            code === "Off",
          );
        });
      });

      page.drawText("P=Pagi  S=Siang  F=Full  Off=Hari libur", {
        x: MARGIN,
        y: 14,
        size: 7,
        font: regular,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return pdf.save();
}

function drawCell(
  page: ReturnType<PDFDocument["addPage"]>,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  header: boolean,
  size = 7,
  off = false,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: off ? rgb(1, 0.9, 0.9) : header ? rgb(0.94, 0.94, 0.94) : rgb(1, 1, 1),
    borderColor: rgb(0.82, 0.82, 0.82),
    borderWidth: 0.5,
  });
  const max = Math.max(1, Math.floor((width - 6) / (size * 0.55)));
  const shown = text.length > max ? `${text.slice(0, Math.max(1, max - 1))}.` : text;
  const textWidth = font.widthOfTextAtSize(shown, size);
  page.drawText(shown, {
    x: x + Math.max(3, (width - textWidth) / 2),
    y: y + (height - size) / 2,
    size,
    font,
    color: off ? rgb(0.75, 0.1, 0.1) : rgb(0.1, 0.1, 0.1),
  });
}
