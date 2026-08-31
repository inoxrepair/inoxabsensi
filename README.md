# iNox Absensi

Aplikasi absensi GPS multi-cabang untuk iNox, mencakup autentikasi berbasis
role, cabang/radius, jadwal shift, rekap keterlambatan, payroll, dan kasbon.

Production:

https://inox-absensi-web-production.up.railway.app

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

## Deployment

Panduan PostgreSQL, Docker, Railway, HTTPS, seed admin, dan backup tersedia di
[`DEPLOY.md`](./DEPLOY.md).

File `.env`, database lokal, secret, dan build output tidak masuk repository.
