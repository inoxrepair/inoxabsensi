# iNox Absensi - Project Context

> Baca file ini sebelum mengubah kode. Ini adalah konteks kerja utama untuk
> melanjutkan project dari session/chat baru. Jangan meminta user menyalin
> konteks lain satu per satu. Gunakan workflow `fundamental-software-engineering`
> bila skill global tersedia.

## Project

- Nama: iNox Absensi.
- Folder lokal: `D:\inox-absensi`.
- Tujuan: absensi GPS multi-cabang, jadwal shift, seragam, rekap, payroll,
  kasbon, dan role-based access.
- Bahasa UI: Bahasa Indonesia.
- Zona waktu bisnis: `Asia/Makassar` / WITA.
- Gaya UI: hitam, putih, abu-abu; aksen warna hanya status.

## Stack

- Next.js `16.3.3`, App Router, React `19.2.8`.
- TypeScript `5.9.3`.
- Tailwind CSS `4.3.3`.
- Auth.js/next-auth `5.0.0-beta.32`.
- Prisma `6.19.3`.
- SQLite lokal, PostgreSQL production.
- Zod `4.5.4`, bcryptjs, Vitest, pdf-lib.
- GitHub private repository dan Railway auto-deploy.
- Next config memakai `typedRoutes: true`, `output: "standalone"`, dan
  `experimental.authInterrupts: true`.

## Commands

PowerShell di Windows kadang menolak script npm. Gunakan `.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run dev:https
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run build:prod
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run db:migrate:prod
```

`dev:https` diperlukan saat menguji GPS dari iOS/Android. Geolocation browser
memerlukan HTTPS atau localhost; HTTP melalui IP LAN tidak dapat dipaksa oleh
kode aplikasi.

## URLs

- Production: `https://inox-absensi-web-production.up.railway.app`
- Login: `https://inox-absensi-web-production.up.railway.app/login`
- Health: `https://inox-absensi-web-production.up.railway.app/api/health`
- GitHub: `https://github.com/inoxrepair/inoxabsensi`
- GitHub branch: `main`.
- Railway project: `inox-absensi`.
- Railway app service: `inox-absensi-web`.
- Railway database service: `Postgres`.

Health terakhir harus dicek setelah deploy dan diharapkan:

```json
{"status":"ok","database":"connected"}
```

Jangan mencetak atau membagikan `DATABASE_URL`, `AUTH_SECRET`, password,
Railway token, GitHub token, atau credential lain.

## Production Deployment

- Source GitHub sudah terhubung ke Railway.
- Push ke `main` memicu auto-deploy.
- Railway memakai `Dockerfile` melalui `railway.json`.
- Health check Railway: `/api/health`.
- Container menjalankan migration PostgreSQL, backfill username, backfill
  seragam, lalu Next standalone server pada port Railway.
- Production tidak memakai SQLite.
- Jangan memakai `prisma db push` pada production.
- Production migration berada di `prisma/migrations/` dan schema production
  berada di `prisma/schema.postgresql.prisma`.
- Jangan menghapus database/volume PostgreSQL.

Rollback:

- Railway: service `inox-absensi-web` -> Deployments -> deployment SUCCESS lama
  -> Redeploy/Rollback.
- Git: gunakan `git revert <commit>` lalu `git push origin main`.
- Jangan menggunakan `git reset --hard` atau force-push production.
- Rollback kode tidak otomatis rollback database. Migration destructive harus
  dibatalkan dengan migration forward baru.

## Database Models

- Auth.js: `User`, `Account`, `Session`, `VerificationToken`.
- Domain: `Cabang`, `Shift`, `JenisSeragam`, `Jadwal`, `Absensi`, `Kasbon`,
  `Payroll`, `RolePermission`.
- Model `JadwalRevision` pernah dibuat untuk Undo, tetapi sudah DIHAPUS untuk
  menghemat storage. Jangan mengembalikan revision database tanpa alasan kuat.
- Backup jadwal sekarang file-based JSON dari menu Pengaturan.

Important storage rules:

- SQLite lokal: `prisma/dev.db`, jangan commit.
- Backup PostgreSQL/PITR Railway belum dipastikan aktif; cek sebelum perubahan
  destructive.
- Backup jadwal JSON disimpan user di perangkat, bukan database.
- Migration/backfill harus idempotent dan tidak menimpa data user.

## Roles and Permissions

Role:

- `super_admin`: semua akses.
- `admin_cabang`: dashboard, karyawan, jadwal, rekap, kasbon, log absensi
  cabang sesuai permission.
- `headstore`: absen, jadwal cabang, riwayat pribadi; tidak payroll/cabang/
  karyawan/pengaturan.
- `karyawan`: absen, jadwal pribadi, riwayat, kasbon, profil.

Authorization:

- `wajibLogin()` membaca ulang user aktif dari database.
- `wajibAkses(menu)` memeriksa `RolePermission` di server.
- `roleTerbatasCabang()` berlaku untuk Admin Cabang dan Headstore.
- UI hiding bukan security boundary; action/query harus memeriksa scope lagi.

## Authentication and Accounts

- Login menerima username atau email.
- Password disimpan bcrypt hash.
- Username unik, lowercase, karakter: huruf, angka, `.`, `_`, `-`.
- Akun lama dibackfill dari prefix email.
- Admin reset password lewat menu Karyawan dengan field password opsional.
- User ganti password sendiri dari Profil dengan password lama + konfirmasi.
- Forgot-password via email belum dibuat; membutuhkan provider email seperti
  Resend/Brevo/Mailgun.
- Password demo lokal historis: `inox12345`; jangan pakai untuk production.
- Password production jangan diminta/dicetak/dikirim ke chat.

## Attendance

- Check-in/out memakai browser Geolocation API.
- Validasi akhir GPS dilakukan server-side dengan Haversine.
- Waktu diambil server dalam WITA, bukan jam perangkat.
- Satu absensi per user per tanggal (`userId`, `tanggal` unique).
- `Absensi.menitTelat` disimpan ketika check-in.
- `modeShift`, `minimumKerjaMenit`, dan `kekuranganMenit` menyimpan snapshot
  aturan saat absensi terjadi.
- Menghapus log absensi oleh Super Admin membuat user dapat absen lagi pada
  tanggal itu.
- Edit log mengubah jam/status dan menghitung ulang `menitTelat`.
- Status Hadir/Izin/Alpa/Libur menghasilkan `menitTelat = 0`.
- Status Telat menghitung ulang dari shift dan toleransi.

## Flexible Shift

`Shift.mode`:

- `terjadwal`: jam/toleransi dipakai untuk menghitung telat.
- `fleksibel`: jam tidak membatasi; durasi = keluar - masuk; telat = 0.

`minimumKerjaMenit` opsional:

- null/kosong: tanpa minimum.
- Diisi: hanya menjadi indikator kekurangan jam pada Rekap.
- Tidak memblokir check-out.

Hari kerja tetap harus memiliki baris `Jadwal`; hari tanpa jadwal berarti Off.

## Schedule

Menu: `Admin -> Jadwal Shift`.


- Filter cabang Super Admin.
- Admin Cabang/Headstore terkunci ke cabangnya.
- Overview rentang tanggal hanya mengubah kolom tabel.
- `Terapkan shift massal` mengubah database.
- Salin minggu, kosongkan minggu.
- Generator jadwal bulanan dari pola 7 hari.
- Import/export CSV.
- Export PDF A4 landscape.
- Preview Spreadsheet realtime.
- Shift dan seragam dapat diatur per cell.

## Spreadsheet

Preview:

- `P` = Pagi.
- `S` = Siang.
- `F` = Full.
- `Off` = hari libur, background merah lembut.

CSV export memakai kode `O` untuk Off agar ringkas. Import menerima `O`, `L`,
dan `-` sebagai Off, juga tanggal ISO atau tanggal Indonesia seperti
`28 Juli 2026`.

Sinkronisasi penting:

- `barisLive` adalah state pusat editor + preview.
- `updateJadwalCell()` adalah transformasi tunggal.
- Cell dropdown mempunyai sync prop->state dan key deterministik.
- Import/generator/salin/kosongkan melakukan refresh data server.

## Uniforms

Menu: `Admin -> Pengaturan -> Jenis Seragam`.

- Global untuk semua cabang.
- `JenisSeragam`: kode, nama, deskripsi, aktif/nonaktif.
- Master default: `SRG-A`, `SRG-B`, `POLO-INOX`.
- Seragam yang pernah dipakai jadwal tidak dihapus; nonaktifkan.
- `Jadwal` menyimpan `seragamId` dan snapshot teks `seragam`.

## Rekap and Payroll

Rekap:

- Per bulan atau custom Dari/Sampai.
- Filter cabang.
- Kolom Hadir, Telat, menit terlambat, Izin, Alpa, Jam kerja, Kurang jam.
- Telat ditampilkan seperti `2 kali` dan `22 menit terlambat`.
- CSV tersedia.

Payroll:

- Super Admin dapat edit gaji pokok, tunjangan, potongan, kasbon.
- Disimpan per user dan periode.
- THP = gaji pokok + tunjangan - potongan - kasbon.

## Log Absensi

Menu: `Admin -> Log Absensi`.

- Super Admin melihat/edit/hapus semua log.
- Admin Cabang dapat edit log cabangnya tetapi tidak hapus.
- Filter tanggal dan cabang.
- Edit manual menyimpan `editedBy` dan catatan `Diedit manual.`.
- Schema validasi harus berada di `src/lib`, bukan diekspor dari file
  `"use server"`; Next.js akan error jika file server export object.

## Backup and Restore

Menu: `Admin -> Pengaturan -> Backup Jadwal`.

- Download backup JSON ke perangkat.
- Import/restore JSON melalui transaction.
- Backup hanya jadwal: username/email, tanggal, nama shift, kode seragam.
- Backup bukan full database backup.
- Untuk full database gunakan backup PostgreSQL/PITR provider.

## PWA and Mobile

- `public/sw.js`, `public/offline.html`, `public/icon.svg`, manifest tersedia.
- Service worker hanya cache asset statis.
- `/api`, `/admin`, `/karyawan`, `/login` network-only.
- GPS mobile wajib HTTPS.
- Jika muncul `Failed to find Server Action`, tutup tab lama, refresh penuh,
  dan buka URL production lagi; biasanya tab memakai bundle deployment lama.
- Jangan membuat fallback koordinat palsu.

## Git Workflow

Sebelum commit:

```powershell
git status
git diff
git diff --cached --check
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Git executable pada Windows pernah berada di:

```text
C:\Program Files\Git\cmd\git.exe
```

GitHub CLI pernah berada di:

```text
D:\GitHubCLI\gh.exe
```

Jangan stage `.env`, `*.db`, logs, node_modules, `.next`, cert/key, atau
credential.

## Current Verification

Verifikasi terakhir sebelum konteks ini dibuat:

- TypeScript bersih.
- 181 unit test lulus.
- Production build berhasil.
- Railway deployment SUCCESS.
- `/api/health` HTTP 200 dan database connected.
- Git local bersih dan sinkron dengan GitHub.

## Known Warnings

- Prisma package.json config warning: package.json `prisma.seed` akan deprecated
  di Prisma 7. Project sengaja tetap Prisma 6.19.3.
- Railway `railway.json` Config as Code warning: masih berfungsi sampai batas
  Railway yang diumumkan; jangan migrasikan ke `.railway/railway.ts` sebelum
  builder Dockerfile dapat dipastikan tetap terkonfigurasi.
- Prisma update ke 8 RC jangan dilakukan otomatis.

## How to Continue

Saat user meminta perubahan:

1. Baca file ini dan codebase terkait.
2. Periksa status Git dan deployment.
3. Identifikasi akar masalah/risiko data.
4. Buat perubahan minimal yang benar.
5. Tambahkan regression test.
6. Jalankan typecheck, test, build.
7. Commit hanya file intended.
8. Push `main` bila user menginginkan deployment/lanjut sesuai workflow project.
9. Pantau Railway sampai SUCCESS.
10. Cek `/api/health` dan logs.
11. Jelaskan perubahan dan cara menguji dalam Bahasa Indonesia.

Start a new session with:

```text
Baca PROJECT_CONTEXT.md terlebih dahulu. Gunakan skill fundamental-software-engineering. Lanjutkan project dari konteks tersebut, audit codebase sebelum edit, test, build, dan deploy bila diperlukan.
```
