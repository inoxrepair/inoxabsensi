# Restore Inox Absensi (kalau VPS rusak / pindah VPS)

Panduan ini supaya aplikasi bisa dibangun ulang dari nol hanya dengan
3 hal: **backup database**, **isi `.env`**, dan **kode di GitHub**.
Simpan panduan ini di GitHub (bukan cuma di VPS) — kalau VPS mati,
panduan di VPS ikut hilang.

## 1. Yang harus sudah tersimpan DI LUAR VPS

| Yang disimpan | Di mana | Keterangan |
| --- | --- | --- |
| Backup database terbaru | `inoxabsensi-backups/db-YYYYMMDD-HHMMSS.sql.gz` (~600 KB) | Download lewat SFTP secara berkala (mis. tiap selesai update). Hanya file `db-*` terbaru yang dibutuhkan. |
| Isi file `.env` server | Password manager / catatan aman | `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `INOX_USERNAME`, `INOX_PASSWORD`, dst. **JANGAN** commit `.env` ke GitHub. |
| Kode aplikasi | GitHub `inoxrepair/inoxabsensi`, branch `main` | Sudah di GitHub, tidak perlu disimpan terpisah. |

Catatan: file `absensi-*.tar.gz` + `part-*` (kit migrasi, ~150–300 MB)
**tidak perlu** disimpan — isinya sama dengan kode GitHub + `node_modules`
yang bisa di-install ulang. Hapus saja bila memenuhi disk.

## 2. Siapkan VPS baru

- Ubuntu 24.04, install PostgreSQL + Node.js 20+.
- Buat database + user (nama di bawah contoh — sesuaikan dengan
  `DATABASE_URL` yang akan dipakai di `.env`):

```bash
sudo -u postgres psql -c "CREATE DATABASE inoxabsensi;"
sudo -u postgres psql -c "CREATE USER inoxabsensi_app WITH PASSWORD 'isi-password-di-sini';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE inoxabsensi TO inoxabsensi_app;"
```

## 3. Restore database dari backup

```bash
# Salin file backup terbaru ke VPS baru (lewat SFTP), lalu:
gunzip -c db-YYYYMMDD-HHMMSS.sql.gz | psql -h 127.0.0.1 -U inoxabsensi_app -d inoxabsensi
# Masukkan password user database saat diminta.
# Cek isinya masuk: sudo -u postgres psql -d inoxabsensi -c "SELECT count(*) FROM \"User\";"
```

JANGAN jalankan seed (`db:seed:prod`) setelah restore — data sudah ada
di backup. Seed hanya untuk database kosong (instalasi pertama kali).

## 4. Restore aplikasi dari GitHub

```bash
git clone https://github.com/inoxrepair/inoxabsensi.git /home/inoxabsensi
cd /home/inoxabsensi
# Buat file .env dari simpanan (lihat .env.example untuk daftar variabel).
npm ci
npm run build:prod
npx prisma migrate deploy
```

Build menyalin `.env` + `.next/static` + `public` ke `.next/standalone`
(update-biznet.sh melakukan ini otomatis; bila build manual, salin
sendiri sebelum menjalankan service).

## 5. Jalankan sebagai service + domain

Buat `/etc/systemd/system/absensi.service` (contoh — sesuaikan path bila perlu):

```ini
[Unit]
Description=Inox Absensi
After=network.target postgresql.service

[Service]
Type=simple
User=inoxabsensi
Group=inoxabsensi
WorkingDirectory=/home/inoxabsensi
Environment=HOSTNAME=127.0.0.1
Environment=PORT=3001
Environment=NODE_OPTIONS=--max-old-space-size=512
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now absensi
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/api/health
# Harus 200.
```

Lalu pasang Nginx sebagai reverse proxy ke `127.0.0.1:3001` untuk domain
(`inoxabsensi.cloud`) + sertifikat HTTPS (certbot), dan pasang ulang cron
sinkron insentif (8x sehari WIB) bila dipakai.

## 6. Verifikasi

- Buka `https://inoxabsensi.cloud/login` — tampil normal (styled).
- Login sebagai super admin, cek Dashboard + satu slip gaji.
- Cek `systemctl is-active absensi` = `active`.
