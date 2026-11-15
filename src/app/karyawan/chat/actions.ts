"use server";

import { revalidatePath } from "next/cache";
import {
  kirimPesanSkema,
  MAKS_FOTO_CHAT_BYTE,
  MAKS_SUARA_CHAT_BYTE,
} from "@/lib/chat";
import {
  berhentiMengetik,
  kirimPesanChat,
  sapuPesanKadaluarsa,
  tandaiMengetik,
} from "@/lib/chat-data";
import { wajibLogin } from "@/lib/session";

export type HasilChat = { ok: boolean; pesan: string } | undefined;

const TIPE_FOTO_DIIZINKAN = ["image/jpeg", "image/png", "image/webp"];
const TIPE_SUARA_DIIZINKAN = [
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
  "audio/mpeg",
  "audio/x-m4a",
  "audio/aac",
  "audio/3gpp",
];

/**
 * Kirim pesan ke ruang bersama. Foto sudah dikompresi di HP (maks. 1024 px,
 * JPEG); voice note direkam di HP (maks. 2 menit). Server hanya memeriksa
 * tipe dan ukuran lalu menyimpannya sebagai data URL — ikut terhapus saat
 * pesannya disapu.
 */
export async function kirimPesan(formData: FormData): Promise<HasilChat> {
  const sesi = await wajibLogin();
  const foto = formData.get("foto");
  const suara = formData.get("suara");
  const adaFoto = foto instanceof File && foto.size > 0;
  const adaSuara = suara instanceof File && suara.size > 0;
  const parsed = kirimPesanSkema.safeParse({
    isi: formData.get("isi"),
    adaFoto,
    adaSuara,
  });
  if (!parsed.success) {
    return { ok: false, pesan: parsed.error.issues[0].message };
  }

  let fotoDataUrl: string | null = null;
  if (adaFoto && foto instanceof File) {
    if (!TIPE_FOTO_DIIZINKAN.includes(foto.type)) {
      return { ok: false, pesan: "Foto harus JPG, PNG, atau WebP." };
    }
    if (foto.size > MAKS_FOTO_CHAT_BYTE) {
      return { ok: false, pesan: "Foto terlalu besar (maks. 2 MB)." };
    }
    const base64 = Buffer.from(await foto.arrayBuffer()).toString("base64");
    fotoDataUrl = `data:${foto.type};base64,${base64}`;
  }

  let suaraDataUrl: string | null = null;
  if (adaSuara && suara instanceof File) {
    if (!TIPE_SUARA_DIIZINKAN.includes(suara.type)) {
      return { ok: false, pesan: "Voice note tidak bisa dibaca." };
    }
    if (suara.size > MAKS_SUARA_CHAT_BYTE) {
      return { ok: false, pesan: "Voice note terlalu besar (maks. 2 MB)." };
    }
    const base64 = Buffer.from(await suara.arrayBuffer()).toString("base64");
    suaraDataUrl = `data:${suara.type};base64,${base64}`;
  }

  await sapuPesanKadaluarsa();
  await kirimPesanChat(sesi.id, parsed.data.isi, fotoDataUrl, suaraDataUrl);
  await berhentiMengetik(sesi.id);
  revalidatePath("/karyawan/chat");
  revalidatePath("/admin/chat");
  return { ok: true, pesan: "" };
}

/** Ping "sedang mengetik" (dipanggil berkala dari kolom input). */
export async function tandaiMengetikAksi(): Promise<void> {
  const sesi = await wajibLogin();
  await tandaiMengetik(sesi.id);
}
