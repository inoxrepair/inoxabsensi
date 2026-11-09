# iNox Absensi

Aplikasi absensi GPS multi-cabang untuk iNox, mencakup autentikasi berbasis
role, cabang/radius, jadwal shift, seragam, rekap keterlambatan, payroll,
kasbon, workflow izin/sakit, foto profil, dan logo aplikasi yang bisa diganti.

Login mendukung username atau email. Administrator dapat mereset password
melalui menu Karyawan, dan pengguna dapat mengganti password sendiri di Profil.

Production:

https://inoxabsensi.cloud

Login: https://inoxabsensi.cloud/login — Health: https://inoxabsensi.cloud/api/health

Production berjalan di VPS Rumahweb (`vps.apname`, `/opt/inoxabsensi`),
bukan Railway. Proyek Railway sudah dihapus 31 Okt 2026 dan alamat
Railway lamanya tidak lagi dipakai. Push ke `main` tidak otomatis tayang;
update VPS dilakukan manual dari console (lihat `DEPLOY.md`).

## Development Lokal

```powershell
npm.cmd install
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run dev
```

Pengujian GPS dari iOS/Android memerlukan HTTPS:

```powershell
npm.cmd run dev:https
```

## Verifikasi

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

Per 9 Nov 2026, HEAD `311767f`: typecheck bersih, 276 unit test lulus
(21 file).

## Deployment

Panduan PostgreSQL, Docker, VPS, HTTPS, seed admin, dan backup tersedia di
[`DEPLOY.md`](./DEPLOY.md). Konteks kerja lengkap (stack, model, role,
aturan absensi/rekap/payroll, dan cara lanjut) ada di
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

File `.env`, database lokal, secret, dan build output tidak masuk repository.
