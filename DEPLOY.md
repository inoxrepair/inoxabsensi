# Deploy iNox Absensi Online

Dokumen ini memakai PostgreSQL untuk production. SQLite `prisma/dev.db` hanya
untuk development lokal dan tidak cocok untuk hosting serverless/container
yang filesystem-nya ephemeral.

> Status per 9 Nov 2026, HEAD `311767f`: production adalah
> **https://inoxabsensi.cloud** di VPS Rumahweb (`vps.apname`,
> IP 80.43.0.77, folder `/opt/inoxabsensi`). Proyek Railway sudah
> **dihapus 31 Okt 2026** — alamat Railway lama
> (`*.up.railway.app`, `inoxabsensi.online`) tidak lagi dipakai dan
> tidak boleh dijadikan target deploy. `railway.json` masih ada di repo
> tapi sudah tidak terpakai. Push ke `main` **tidak** otomatis tayang.

## Pilihan Hosting

Production saat ini:

- **VPS Rumahweb (dipakai)**: Ubuntu 24.04, Docker + Postgres 16 dalam
  container, Nginx + HTTPS Certbot. App hanya mendengarkan
  `127.0.0.1:3000` lewat Nginx proxy; Postgres tidak terekspos publik.

Alternatif bila suatu saat pindah dari VPS:

- **Render**: satu PostgreSQL + satu Web Service dengan Dockerfile.
- **Fly.io/VPS lain**: gunakan `docker-compose.production.yml` atau
  PostgreSQL managed terpisah.

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

## 2. Update Production di VPS (jalur utama)

Dilakukan Ucok di console VNC `vps.apname`, jam sepi (SSH dari mesin Muse
diblokir jaringan). Di folder repo VPS `/opt/inoxabsensi`:

```bash
cd /opt/inoxabsensi
git pull origin main        # pastikan commit yang diharapkan ketarik
unset DATABASE_URL
bash deploy.sh              # build ~9 menit, app restart sebentar
```

`deploy.sh` (disimpan di VPS, salinannya ada di paket migrasi VPS) melakukan:
build ulang image app, jalankan container, lalu cek health lokal
`http://127.0.0.1:3000/api/health`. Skrip ini **tidak** menyentuh Nginx /
Certbot / `.env` / database (volume `inox-postgres` tetap) — `.env`, Nginx,
SSL, dan data tidak hilang saat update.

> Sinkron insentif (sejak commit `748809f`) butuh `INOX_USERNAME` dan
> `INOX_PASSWORD` di `.env` VPS (`/opt/inoxabsensi/.env`) — kredensial
> login `inox.my.id`. Tanpa keduanya, tombol Sinkron menjawab error 500.
> Isi sekali secara manual di VPS, jangan commit ke repo.

Setelah itu cek dari luar:

```text
GET https://inoxabsensi.cloud/api/health
```

Respons sehat:

```json
{"status":"ok","database":"connected","timestamp":"..."}
```

Lalu buka halaman terkait perubahan (mis. Log Absensi, Arsip PDF, Payroll)
dan pastikan tampilannya sesuai.

## 3. Buat PostgreSQL (hanya saat instalasi awal)

Ambil connection string PostgreSQL dari provider. Format umum:

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

Set sebagai `DATABASE_URL`. Di VPS, Postgres berjalan sebagai container
`db` dengan volume `inox-postgres`; connection string-nya ada di `.env`
di VPS (jangan commit, jangan kirim lewat chat).

## 4. Set Environment Variables

Wajib:

```text
DATABASE_URL=postgresql://...
AUTH_SECRET=<random minimal 32 bytes>
AUTH_URL=https://inoxabsensi.cloud
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
https://inoxabsensi.cloud/api/auth/callback/google
```

Untuk seed admin pertama kali, siapkan sementara:

```text
SEED_ADMIN_NAME=Owner iNox
SEED_ADMIN_EMAIL=owner@domain-anda.example
SEED_ADMIN_PASSWORD=<password minimal 12 karakter>
```

## 5. Deploy dengan Docker (instalasi awal / VPS baru)

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

Di VPS, file compose yang dipakai adalah `docker-compose.vps.yml`
(app + db Postgres 16, port app hanya localhost) dan update rutin memakai
`bash deploy.sh` seperti di bagian 2 — jangan jalankan `docker compose up`
manual untuk update rutin kecuali `deploy.sh` gagal dan penyebabnya sudah
jelas.

Setelah seed selesai, hapus `SEED_ADMIN_PASSWORD` dari environment platform
atau ganti nilainya. Seed production bersifat upsert untuk admin dan aman
dijalankan ulang, tetapi password admin akan mengikuti nilai environment saat
seed dijalankan.

## 6. Reverse Proxy HTTPS

Expose hanya port reverse proxy, bukan port aplikasi secara langsung. Contoh
Nginx (sudah terpasang di VPS untuk `inoxabsensi.cloud`):

```nginx
server {
    listen 443 ssl http2;
    server_name inoxabsensi.cloud;

    ssl_certificate /etc/letsencrypt/live/inoxabsensi.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inoxabsensi.cloud/privkey.pem;

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
`deploy.sh` tidak menyentuh konfigurasi Nginx/Certbot ini.

## 7. Health Check

Endpoint:

```text
GET https://inoxabsensi.cloud/api/health
```

Respons sehat:

```json
{"status":"ok","database":"connected","timestamp":"..."}
```

Atur health check platform ke `/api/health`. Respons `503` berarti aplikasi
tidak bisa mengakses database.

## 8. Uji Setelah Online

1. Buka `https://inoxabsensi.cloud/login`.
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

## 9. Backup dan Operasional

- **Belum ada backup otomatis VPS** (celah utama per 31 Okt 2026). Buat
  dump PostgreSQL berkala secara manual dan salin keluar VPS; jangan
  mengandalkan backup provider, karena Railway sudah dihapus.
- Jangan menyimpan `.env`, `DATABASE_URL`, atau `AUTH_SECRET` di repository.
- Jalankan migration deploy pada setiap release sebelum menerima trafik baru.
- Pantau `/api/health` dan log aplikasi.
- Jangan menghapus cabang yang sudah punya riwayat; nonaktifkan melalui UI.
- Untuk update aplikasi: pull kode baru, jalankan `bash deploy.sh`
  (build image baru, migration, lalu restart service) — lihat bagian 2.

## 10. Rollback Deployment

Rollback kode tidak otomatis mengembalikan database. Di VPS:

```bash
cd /opt/inoxabsensi
git revert <commit-yang-bermasalah>
git push origin main
unset DATABASE_URL
bash deploy.sh
```

Atau, bila revert belum di-push, cukup checkout commit lama di VPS lalu
`bash deploy.sh`. Jangan memakai force-push atau `git reset --hard` pada
branch production.

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
