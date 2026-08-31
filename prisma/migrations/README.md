# Database Migrations

## Local Development

Development lokal memakai SQLite:

```powershell
npm.cmd run db:push
npm.cmd run db:seed
```

Database berada di `prisma/dev.db` dan tidak boleh dipakai sebagai database
production.

## Production

Production memakai `prisma/schema.postgresql.prisma` dan migration SQL pada:

```text
prisma/migrations/20260831000000_init_postgresql/migration.sql
```

Container menjalankan:

```text
npm run db:migrate:prod
```

Jangan jalankan `prisma db push` terhadap PostgreSQL production. Migration
memakai `CREATE TABLE`, index, dan foreign key yang dihasilkan dari schema
PostgreSQL. Backup database sebelum release pertama.
