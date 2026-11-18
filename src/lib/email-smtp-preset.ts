/**
 * Preset penyedia SMTP untuk email slip gaji. Modul murni tanpa import
 * server (tanpa db/nodemailer), jadi boleh dipakai komponen client
 * (form Pengaturan) maupun lib server (transport email-slip).
 */

export type PresetSmtp = "gmail" | "outlook" | "microsoft365" | "kustom";

export const DAFTAR_PRESET: readonly PresetSmtp[] = [
  "gmail",
  "outlook",
  "microsoft365",
  "kustom",
];

export const LABEL_PRESET: Record<PresetSmtp, string> = {
  gmail: "Gmail",
  outlook: "Outlook.com / Hotmail",
  microsoft365: "Microsoft 365",
  kustom: "Kustom (isi manual)",
};

/** Host + port bawaan tiap preset (port 587 = STARTTLS). */
export const PRESET_SMTP: Record<Exclude<PresetSmtp, "kustom">, {
  host: string;
  port: number;
}> = {
  gmail: { host: "smtp.gmail.com", port: 587 },
  outlook: { host: "smtp-mail.outlook.com", port: 587 },
  microsoft365: { host: "smtp.office365.com", port: 587 },
};

export function presetValid(nilai: string): nilai is PresetSmtp {
  return (DAFTAR_PRESET as readonly string[]).includes(nilai);
}

/**
 * Port 465 = TLS langsung (secure true); port lain (587 STARTTLS, 25)
 * memakai secure false dan nodemailer menaikkan ke TLS sendiri.
 */
export function secureUntukPort(port: number): boolean {
  return port === 465;
}
