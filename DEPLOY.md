# Deploy iNox Absensi Online

Dokumen ini memakai PostgreSQL untuk production. SQLite `prisma/dev.db` hanya
untuk development lokal dan tidak cocok untuk hosting serverless/container
yang filesystem-nya ephemeral.

## Pilihan Hosting

Cara paling sederhana:

- **Railway**: satu service PostgreSQL + satu service Docker dari repository ini.
- **Render**: satu PostgreSQL + satu Web Service dengan Dockerfile.
- **Fly.io/VPS**: gunakan `docker-compose.production.yml` atau PostgreSQL
  managed terpisah.

Jangan expose PostgreSQL ke internet publik. Aplikasi saja yang menerima trafik
port 3000 melalui reverse proxy HTTPS.

## 1. Siapkan Repository

Pastikan repository berisi file berikut:

```text
Dockerfile
docker-compose.production.yml
prisma/schema.postgresql.prisma
prisma/migrations/20260831000000_init_postgresql/migration.sql
prisma/migrations/migration_lock.toml
```

Build production memakai:

```powershell
npm.cmd run build:prod
```

Container menjalankan migration sebelum aplikasi standalone:

```text
prisma migrate deploy -> backfill username akun lama -> node .next/standalone/server.js
```

Jangan menggunakan `prisma db push` pada database production.

## 2. Buat PostgreSQL

Ambil connection string PostgreSQL dari provider. Format umum:

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

Set sebagai `DATABASE_URL`. Pada Railway/Render biasanya connection string
tersedia sebagai variable bawaan database service.

## 3. Set Environment Variables

Wajib:

```text
DATABASE_URL=postgresql://...
AUTH_SECRET=<random minimal 32 bytes>
AUTH_URL=https://domain-anda.example
AUTH_TRUST_HOST=true
```

Generate secret:

```bash
openssl rand -base64 32
```

Atau gunakan generator secret tepercaya dari platform hosting. Jangan gunakan
`dev-only-secret` dari `.env` lokal.

Opsional Google OAuth:

```text
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

Callback URL Google harus diarahkan ke:

```text
https://domain-anda.example/api/auth/callback/google
```

Untuk seed admin pertama kali, siapkan sementara:

```text
SEED_ADMIN_NAME=Owner iNox
SEED_ADMIN_EMAIL=owner@domain-anda.example
SEED_ADMIN_PASSWORD=<password minimal 12 karakter>
```

## 4. Deploy dengan Docker

Build dan start:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Lihat log:

```bash
docker compose -f docker-compose.production.yml logs -f app
```

Seed admin hanya satu kali setelah container berjalan:

```bash
docker compose -f docker-compose.production.yml exec app npm run db:seed:prod
```

Pada Railway tanpa SSH key, set sementara:

```text
RUN_PRODUCTION_SEED=true
```

Lalu deploy ulang. Setelah log menampilkan `Production seed selesai`, hapus
`RUN_PRODUCTION_SEED` dan ketiga variable `SEED_ADMIN_*`, lalu redeploy.

Setelah seed selesai, hapus `SEED_ADMIN_PASSWORD` dari environment platform
atau ganti nilainya. Seed production bersifat upsert untuk admin dan aman
dijalankan ulang, tetapi password admin akan mengikuti nilai environment saat
seed dijalankan.

## 5. Reverse Proxy HTTPS

Expose hanya port reverse proxy, bukan port aplikasi secara langsung. Contoh
Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name absensi.domain-anda.example;

    ssl_certificate /etc/letsencrypt/live/absensi.domain-anda.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/absensi.domain-anda.example/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Buat sertifikat Let's Encrypt menggunakan Certbot atau fitur TLS managed dari
platform hosting. `AUTH_URL` harus sama persis dengan domain HTTPS tersebut.

## 6. Health Check

Endpoint:

```text
GET https://domain-anda.example/api/health
```

Respons sehat:

```json
{"status":"ok","database":"connected","timestamp":"..."}
```

Atur health check platform ke `/api/health`. Respons `503` berarti aplikasi
tidak bisa mengakses database.

## 7. Uji Setelah Online

1. Buka `https://domain-anda.example/login`.
2. Login dengan akun admin hasil seed.
3. Buat cabang dengan koordinat aktual.
4. Buat akun Karyawan/Headstore dan tempatkan ke cabang.
5. Susun jadwal shift.
6. Buka domain HTTPS yang sama dari iPhone dan Android.
7. Izinkan Location Services pada browser.
8. Uji check-in di dalam radius cabang.
9. Uji check-out dan cek Rekap.
10. Uji pengajuan Kasbon dari akun karyawan.

GPS mobile **wajib** memakai HTTPS. `http://192.168.x.x:3000` hanya cocok
untuk melihat halaman, bukan untuk Geolocation API iOS/Android.

## 8. Backup dan Operasional

- Aktifkan backup otomatis PostgreSQL dari provider.
- Jangan menyimpan `.env`, `DATABASE_URL`, atau `AUTH_SECRET` di repository.
- Jalankan migration deploy pada setiap release sebelum menerima trafik baru.
- Pantau `/api/health` dan log aplikasi.
- Jangan menghapus cabang yang sudah punya riwayat; nonaktifkan melalui UI.
- Untuk update aplikasi: build image baru, jalankan migration, lalu rolling
  restart service.

## 9. Rollback Deployment

Rollback kode tidak otomatis mengembalikan database. Gunakan salah satu:

### Railway Dashboard (cepat)

1. Buka service `inox-absensi-web`.
2. Buka tab `Deployments`.
3. Pilih deployment lama yang berstatus `SUCCESS`.
4. Klik menu deployment lalu `Redeploy`/`Rollback` jika tersedia.
5. Periksa `/api/health` dan fungsi utama.

Cara ini mengaktifkan image/commit lama, tetapi data yang sudah ditulis user
setelah deployment baru tetap ada.

### Git Revert (direkomendasikan untuk riwayat source)

```bash
git revert <commit-yang-bermasalah>
git push origin main
```

Railway akan auto-deploy commit revert. Jangan memakai force-push atau
`git reset --hard` pada branch production.

Migration yang hanya menambah kolom nullable/default biasanya aman ketika kode
di-rollback. Migration destructive (drop/rename) harus dibatalkan dengan
migration forward baru dan backup database, bukan dengan menghapus file
migration lama.

## Development Lokal

```powershell
npm.cmd run dev
```

Untuk pengujian GPS mobile dengan sertifikat development:

```powershell
npm.cmd run dev:https
```

Untuk production lokal penuh dengan Docker:

```powershell
docker compose -f docker-compose.production.yml up -d --build
```

Untuk database SQLite lokal, tetap gunakan:

```powershell
npm.cmd run db:push
npm.cmd run db:seed
```
