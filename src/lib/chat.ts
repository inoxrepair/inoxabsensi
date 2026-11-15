import { z } from "zod";

/** Ruang chat bersama: satu ruang untuk semua karyawan (semua cabang). */
export const BATAS_CHAT_JAM = 24;
export const BATAS_CHAT_MS = BATAS_CHAT_JAM * 60 * 60 * 1000;
/** Pesan terbaru yang ditampilkan (lebih lama tetap terhapus 24 jam). */
export const BATAS_PESAN_CHAT = 200;
export const MAKS_ISI_CHAT = 1000;
/** Foto chat dikompresi di HP sebelum upload (lihat kompresFoto). */
export const MAKS_FOTO_CHAT_PX = 1024;
export const KUALITAS_FOTO_CHAT = 0.8;
/** Batas ukuran foto sesudah kompresi (sama dengan foto profil). */
export const MAKS_FOTO_CHAT_BYTE = 2_000_000;
/** Voice note: maks. 2 menit per pesan, berhenti otomatis di batas. */
export const MAKS_SUARA_CHAT_DETIK = 120;
/** Batas ukuran voice note (rekaman 2 menit AAC/Opus jauh di bawah ini). */
export const MAKS_SUARA_CHAT_BYTE = 2_000_000;
/** Seseorang dianggap sedang mengetik bila ping terakhir < 8 detik lalu. */
export const BATAS_MENGETIK_MS = 8000;
/** Ping mengetik dikirim paling sering tiap 3 detik selama mengetik. */
export const INTERVAL_MENGETIK_MS = 3000;
/** Pesan baru dicek tiap 5 detik (polling; tanpa server realtime). */
export const INTERVAL_POLLING_CHAT_MS = 5000;

export type PesanChat = {
  id: string;
  pengirimId: string;
  nama: string;
  fotoProfil: string | null;
  isi: string;
  foto: string | null;
  suara: string | null;
  dibuatPada: Date;
};

/** Validasi kirim pesan: teks saja, foto saja, voice note saja, atau gabungan. */
export const kirimPesanSkema = z
  .object({
    isi: z.string().trim().max(MAKS_ISI_CHAT, "Pesan maks. 1000 karakter."),
    adaFoto: z.boolean().default(false),
    adaSuara: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (!v.isi && !v.adaFoto && !v.adaSuara) {
      ctx.addIssue({
        code: "custom",
        message: "Tulis pesan, pilih foto, atau rekam suara dulu.",
      });
    }
  });
