# iNox Absensi - Project Context

> Baca file ini sebelum mengubah kode. Ini adalah konteks kerja utama untuk
> melanjutkan project dari session/chat baru. Jangan meminta user menyalin
> konteks lain satu per satu. Gunakan workflow `fundamental-software-engineering`
> bila skill global tersedia.

## Project

- Nama: iNox Absensi.
- Folder lokal di mesin Muse: `~/workspace/inoxabsensi` (clone dari GitHub).
- Tujuan: absensi GPS multi-cabang, jadwal shift, seragam, rekap, payroll,
  kasbon, dan role-based access.
- Bahasa UI: Bahasa Indonesia.
- Zona waktu bisnis: `Asia/Makassar` / WITA.
- Gaya UI: hitam, putih, abu-abu; aksen warna hanya status.
- Terakhir diperbarui: 9 Nov 2026, HEAD `311767f` ("Tambah kolom Cabang di
  Arsip PDF"). Dokumen ini diselaraskan ke commit itu; bila kode sudah
  maju lagi, selaraskan dokumen ini sebelum mengandalkan isinya.

## Stack

- Next.js `16.3.3`, App Router, React `19.2.8`.
- TypeScript `5.9.3`.
- Tailwind CSS `4.3.3`.
- Auth.js/next-auth `5.0.0-beta.32`.
- Prisma `6.19.3`.
- SQLite lokal, PostgreSQL production.
- Zod `4.5.4`, bcryptjs, Vitest, pdf-lib.
- GitHub repository PUBLIK: `https://github.com/inoxrepair/inoxabsensi`
  (dulu privat, dijadikan publik 28 Okt 2026).
- Production BUKAN lagi Railway — pindah ke VPS Rumahweb, lihat
  "Production Deployment" di bawah. `railway.json` dan `Dockerfile` masih
  ada di repo, tapi proyek Railway sudah dihapus 31 Okt 2026 dan tidak
  lagi dipakai.
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

- Production: `https://inoxabsensi.cloud` (VPS Rumahweb `vps.apname`,
  IP 80.43.0.77; app hanya `127.0.0.1:3000` lewat Nginx proxy + HTTPS
  Certbot, Postgres tidak terekspos publik).
- Login: `https://inoxabsensi.cloud/login`
- Health: `https://inoxabsensi.cloud/api/health`
- GitHub: `https://github.com/inoxrepair/inoxabsensi`
- GitHub branch: `main`.
- RAILWAY SUDAH MATI: alamat lama
  `https://inox-absensi-web-production.up.railway.app` dan domain
  `inoxabsensi.online` tidak lagi dipakai — proyek Railway dihapus
  31 Okt 2026 (masa tenggang 48 jam). Jangan deploy ke Railway, jangan
  jadikan URL Railway sebagai acuan produksi.

Health terakhir harus dicek setelah deploy dan diharapkan:

```json
{"status":"ok","database":"connected"}
```

Jangan mencetak atau membagikan `DATABASE_URL`, `AUTH_SECRET`, password,
token GitHub, atau credential lain. Password root VPS juga jangan dikirim
lewat chat / screenshot tanpa sensor — tiap VPS Rumahweb punya password
root sendiri di Clientzone > VPS > Manage.

## Production Deployment (VPS — jalur utama sejak 31 Okt 2026)

- Production di VPS Rumahweb, folder `/opt/inoxabsensi`, TIDAK ada
  auto-deploy. Push ke `main` TIDAK otomatis tayang.
- Cara update (dijalankan Ucok di console VNC `vps.apname`, jam sepi,
  SSH dari mesin Muse diblokir):

```bash
cd /opt/inoxabsensi
git pull origin main        # pastikan commit yang diharapkan ketarik
unset DATABASE_URL
bash deploy.sh              # build ~9 menit, app restart sebentar
```

- `deploy.sh` TIDAK menyentuh Nginx / Certbot / `.env` / database
  (volume `inox-postgres` tetap, migrasi otomatis via CMD Dockerfile) —
  `.env`, Nginx, SSL, dan data tidak hilang.
- Container menjalankan migration PostgreSQL, backfill username, backfill
  seragam, lalu Next standalone server pada port 3000 (hanya localhost).
- Production tidak memakai SQLite.
- Jangan memakai `prisma db push` pada production.
- Production migration berada di `prisma/migrations/` dan schema production
  berada di `prisma/schema.postgresql.prisma`.
- Jangan menghapus database/volume PostgreSQL.
- CELAH UTAMA (per 31 Okt 2026): belum ada backup otomatis VPS. Kalau
  disk/container rusak, data berisiko hilang — backup dump berkala masih
  perlu dibuat.

Rollback:

- VPS: `git revert <commit>` lalu ulangi langkah update di atas
  (pull + `bash deploy.sh`).
- Git: gunakan `git revert <commit>` lalu `git push origin main`.
- Jangan menggunakan `git reset --hard` atau force-push production.
- Rollback kode tidak otomatis rollback database. Migration destructive harus
  dibatalkan dengan migration forward baru.

## Database Models

- Auth.js: `User`, `Account`, `Session`, `VerificationToken`.
- Domain: `Cabang`, `Shift`, `JenisSeragam`, `Jadwal`, `Absensi`,
  `AbsensiCycle`, `Kasbon`, `Payroll`, `PengajuanIzin`, `AuditLog`,
  `RolePermission`, `Pengaturan`.
- `PengajuanIzin` (migrasi `20261029010000`): izin/sakit, maks 30 hari,
  status pending/disetujui/ditolak/dibatalkan; persetujuan membuat baris
  `Absensi` status "izin".
- `AuditLog`: jejak minimal penghapusan log absensi (ringkasan baris yang
  dihapus, tanpa foreign key supaya tidak ikut terhapus bila user dihapus).
- `AbsensiCycle`: pasangan masuk-keluar aktual; shift fleksibel bisa
  sampai 3 cycle, `Absensi` tetap satu baris per user per tanggal.
- `Pengaturan`: kunci -> nilai global, mis. `logo_aplikasi` (data URL
  gambar logo kustom, migrasi `20261104000000`).
- Migrasi `20261029000000`: snapshot toleransi/kasbon/audit
  (`Absensi.menitToleransi`, `menitKotor`, `Kasbon.jumlahTerbayar`).
- Model `JadwalRevision` pernah dibuat untuk Undo, tetapi sudah DIHAPUS untuk
  menghemat storage. Jangan mengembalikan revision database tanpa alasan kuat.
- Backup jadwal sekarang file-based JSON dari menu Pengaturan.

Important storage rules:

- SQLite lokal: `prisma/dev.db`, jangan commit.
- Backup PostgreSQL/PITR provider SUDAH TIDAK BERLAKU — production kini
  VPS, bukan Railway. Backup otomatis VPS belum ada (lihat
  "Production Deployment"); jangan klaim backup provider aktif.
- Backup jadwal JSON disimpan user di perangkat, bukan database.
- Migration/backfill harus idempotent dan tidak menimpa data user.

## Roles and Permissions

Role:

- `super_admin`: semua akses. Payroll hanya super admin (lihat
  "Rekap and Payroll").
- `admin_cabang`: menu `dashboard`, `karyawan` (termasuk Log Absensi dan
  Izin), `jadwal`, `rekap`, `kasbon`; terkunci ke cabangnya.
- `headstore`: menu `dashboard`, `jadwal`; absen, jadwal cabang, riwayat
  pribadi; tidak payroll/cabang/karyawan/pengaturan.
- `karyawan`: absen, jadwal pribadi, riwayat, kasbon, profil, izin.

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
- `Absensi.menitToleransi` dan `menitKotor` adalah snapshot saat
  check-in: `menitKotor = menitToleransi + menitTelat` untuk baris baru,
  supaya mengubah jam/toleransi shift belakangan tidak mengubah riwayat.
- `modeShift`, `minimumKerjaMenit`, dan `kekuranganMenit` menyimpan snapshot
  aturan saat absensi terjadi.
- Menghapus log absensi oleh Super Admin membuat user dapat absen lagi pada
  tanggal itu.
- Edit log mengubah jam/status dan menghitung ulang `menitTelat`.
- Status Hadir/Izin/Alpa/Libur menghasilkan `menitTelat = 0`.
- Status Telat menghitung ulang dari shift dan toleransi.

## Izin / Sakit (workflow, sejak commit `c49fee5`)

Menu: `Admin -> Izin` dan `Karyawan -> Izin`.

- Model `PengajuanIzin`: jenis izin/sakit, maks 30 hari, status
  pending/disetujui/ditolak/dibatalkan.
- Karyawan mengajukan dan membatalkan di `/karyawan/izin`; admin
  menyetujui/menolak/membuat izin langsung di `/admin/izin`.
- Persetujuan gagal total bila bentrok hadir/telat, hari off dilewati,
  baris `Absensi` dibuat status "izin" dan check-in lalu terblokir.
- Persetujuan TIDAK membuat status absensi baru: rekap dan persen
  kehadiran tidak berubah; pembeda izin vs sakit hidup di kolom jenis
  pengajuan dan catatan baris absensi.

## Face Verification (DINONAKTIFKAN)

Fitur pendaftaran dan verifikasi wajah baru sudah DIHAPUS atas permintaan
user. Yang tersisa hanya tampilan HISTORI:

- Kolom database TIDAK dihapus: `User.faceEmbedding`, `User.faceDidaftarkan`,
  `Absensi.faceStatus`, `Absensi.faceJarak`. Jangan buat migration drop kolom.
- `src/lib/wajah.ts` hanya berisi label/warna/status untuk histori Log
  Absensi dan Arsip PDF. Logika embedding/matching sudah dihapus.
- File yang dihapus: `src/lib/face-client.ts`,
  `src/app/admin/karyawan/aksi-wajah.ts`,
  `src/app/admin/karyawan/daftar-wajah.tsx`, `public/models/`,
  deps `@vladmandic/face-api` + `@tensorflow/tfjs`.
- Absensi baru tidak lagi menulis `faceStatus`/`faceJarak` (null).
- Permissions-Policy tidak lagi meminta `camera`.
- Kamera dan Geolocation tetap butuh HTTPS untuk GPS.

Umpan balik absen:

- Animasi centang satu detik (`components/ui/animasi-check.tsx`, keyframes di
  `globals.css`) dan bunyi "check" Web Audio (`src/lib/suara.ts`).
- Berlaku saat absen masuk/keluar berhasil dan saat pendaftaran wajah.
- Semua di perangkat, tidak menambah beban server dan tanpa file audio.
- `siapkanAudio()` dipanggil pada sentuhan pertama agar audio iOS terbuka.

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
- Ada kolom total telat kotor dan toleransi terpakai (snapshot saat
  check-in, bukan hitungan ulang dari shift saat ini).
- Telat ditampilkan seperti `2 kali` dan `22 menit terlambat`.
- CSV tersedia.

Payroll:

- Hanya Super Admin dapat melihat dan mengubah payroll.
- Super Admin dapat edit gaji pokok, tunjangan, potongan, kasbon.
- Kasbon di payroll tersambung ke pengajuan kasbon: tabel menampilkan
  sisa kasbon disetujui periode itu (`jumlah - jumlahTerbayar`) dan
  tombol "Isi kasbon dari pengajuan"; potongan telat tetap diisi manual
  karena tidak ada tarif rupiah per menit telat di sistem.
- Disimpan per user dan periode.
- THP = gaji pokok + tunjangan + insentif - potongan - kasbon.
- Insentif (sejak commit `748809f`, diperbaiki setelahnya): data diambil
  dari Laporan Insentif `inox.my.id` lewat endpoint AJAX
  `GET /reports/incentive-line-orders` (login sesi + CSRF, tanpa API
  resmi) dan disimpan ke tabel `Insentif` (satu baris per karyawan per
  periode). Sinkron manual lewat tombol di menu Admin -> Insentif atau
  `POST /api/insentif/sync` (hanya super_admin; butuh env
  `INOX_USERNAME` / `INOX_PASSWORD` di server). Pencocokan karyawan
  hanya lewat nama (dinormalisasi: huruf kecil, tanpa spasi/simbol,
  exact saja — tanpa fallback contains); nama yang tidak cocok masuk
  daftar `tidakDicocokkan` di hasil sinkron untuk ditinjau manual.
  Tabel `Insentif` adalah satu-satunya sumber nilai insentif di Payroll:
  kolom insentif tampil read-only di Payroll dan tidak bisa diubah di
  sana. Admin cabang hanya melihat insentif tim cabangnya.

## Log Absensi

Menu: `Admin -> Log Absensi`.

- Super Admin melihat/edit/hapus semua log.
- Admin Cabang dapat edit log cabangnya tetapi tidak hapus.
- Filter tanggal dan cabang.
- Kolom Cabang di Log Absensi (sejak commit `c4f9ac0`) diambil dari
  `Absensi.cabangId` — snapshot penempatan saat karyawan itu absen,
  BUKAN `User.cabang` saat ini. Aturan absen tidak berubah: karyawan
  tetap hanya bisa absen di cabang penempatannya; kolom ini hanya
  keterangan. Filter cabang juga memakai `Absensi.cabangId`, supaya
  baris lama tidak ikut berubah bila penempatan karyawan pindah.
- Edit manual menyimpan `editedBy` dan catatan `Diedit manual.`.
- Schema validasi harus berada di `src/lib`, bukan diekspor dari file
  `"use server"`; Next.js akan error jika file server export object.
- Kolom Wajah menampilkan hasil verifikasi wajah dan jaraknya.

## Arsip Absensi

Tombol `Download Arsip` pada Log Absensi mengunduh ZIP berisi PDF per bulan
per karyawan (`nama/2026-08.pdf`).

- Hanya role dengan akses menu `karyawan` (admin) yang boleh mengunduh.
- Admin Cabang dipaksa ke cabangnya sendiri di server, bukan lewat query.
- Rentang maksimal 12 bulan (`MAKS_BULAN_ARSIP` di `src/lib/arsip.ts`).
- ZIP dibuat streaming dengan `archiver`, PDF dengan `pdf-lib`.
- Nama folder/file dibersihkan `namaAman()` agar tidak bisa keluar dari ZIP.
- Route memakai `export const maxDuration = 300` karena banyak PDF.
- Hari tanpa absensi tetap diarsipkan: ada jadwal = alpa, tanpa jadwal = off.
- Arsip PDF punya kolom Cabang paling kanan (sejak commit `311767f`),
  isinya cabang penempatan saat absen hari itu dari `Absensi.cabangId`;
  Alpa/Off diisi "—".

## Foto Profil dan Logo Kustom (sejak commit `5f0b589`, `799f91b`, `d7cdf98`)

- Karyawan punya foto profil; foto tampil di halaman Absensi hari ini,
  di `/karyawan`, dan di kanan atas halaman absen.
- Logo aplikasi bisa diganti super admin di Pengaturan (disimpan sebagai
  data URL di `Pengaturan.logo_aplikasi`); logo kustom tampil sendiri
  lebih besar di sidebar. Logo yang sudah diunggah tersimpan di database
  dan TIDAK perlu diunggah ulang saat deploy — `deploy.sh` tidak
  menyentuh database.

## Sidebar Admin

- Sidebar admin bisa di-toggle expanded/ciut di desktop dan jadi drawer
  di HP (sejak commit `c49fee5`).
- Hak akses menu per role hidup di tabel `RolePermission`, bukan
  hardcode — perubahan akses tidak perlu deploy.

## Backup and Restore

Menu: `Admin -> Pengaturan -> Backup Jadwal`.

- Download backup JSON ke perangkat.
- Import/restore JSON melalui transaction.
- Backup hanya jadwal: username/email, tanggal, nama shift, kode seragam.
- Backup bukan full database backup.
- Untuk full database gunakan backup dump PostgreSQL VPS (manual,
  berkala — belum otomatis, lihat "Production Deployment"). Jangan
  andalkan backup provider: Railway sudah dihapus.

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

Verifikasi terakhir, 9 Nov 2026 15:54 WITA, di HEAD `311767f`:

- TypeScript bersih (`npm run typecheck`, 0 error).
- 276 unit test lulus (21 file, `npm test`).
- Production `https://inoxabsensi.cloud/api/health` HTTP 200 dan database
  connected (dicek 9 Nov 2026 07:54 UTC:
  `{"status":"ok","database":"connected",...}`).
- Git lokal bersih dan sinkron dengan `origin/main` (kecuali folder
  stray tak terlacak `D:\npm-cache/` — jangan commit).
- CATATAN: kode di VPS belum tentu sebaru HEAD ini. Commit `c4f9ac0` dan
  `311767f` (kolom Cabang Log Absensi + Arsip PDF) sudah di-push 8 Nov
  2026, tetapi update VPS-nya masih menunggu Ucok menjalankan langkah
  di "Production Deployment". Jangan klaim fitur itu sudah tayang
  sebelum health + halaman terkait dicek di `inoxabsensi.cloud`.

## Known Warnings

- Prisma package.json config warning: package.json `prisma.seed` akan deprecated
  di Prisma 7. Project sengaja tetap Prisma 6.19.3.
- `railway.json` masih ada di repo tapi proyek Railway sudah dihapus;
  jangan menghidupkan kembali deploy Railway dari file itu.
- Prisma update ke 8 RC jangan dilakukan otomatis.

## How to Continue

Saat user meminta perubahan:

1. Baca file ini dan codebase terkait.
2. Periksa status Git dan deployment VPS (bukan Railway).
3. Identifikasi akar masalah/risiko data.
4. Buat perubahan minimal yang benar.
5. Tambahkan regression test.
6. Jalankan typecheck, test, build.
7. Commit hanya file intended.
8. Push `main` bila user menginginkan; push TIDAK otomatis tayang —
   update VPS dilakukan Ucok dari console (lihat "Production Deployment").
9. Pantau hasil update VPS sampai `bash deploy.sh` selesai dan
   `/api/health` di `inoxabsensi.cloud` kembali 200.
10. Cek `/api/health` dan logs.
11. Jelaskan perubahan dan cara menguji dalam Bahasa Indonesia.

Start a new session with:

```text
Baca PROJECT_CONTEXT.md terlebih dahulu. Gunakan skill fundamental-software-engineering. Lanjutkan project dari konteks tersebut, audit codebase sebelum edit, test, build, dan deploy bila diperlukan.
```
