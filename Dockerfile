FROM node:24-alpine

RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build hanya membutuhkan URL PostgreSQL yang valid secara sintaks;
# koneksi database baru dipakai saat runtime/migration.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG AUTH_SECRET=build-only-secret-not-used-at-runtime
ENV DATABASE_URL=$DATABASE_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build:prod

# Next standalone tidak menyalin public dan static secara otomatis.
RUN cp -r public .next/standalone/public && \
    mkdir -p .next/standalone/.next && \
    cp -r .next/static .next/standalone/.next/static

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

# Migrasi idempoten dijalankan sebelum server menerima trafik. Seed production
# hanya berjalan bila RUN_PRODUCTION_SEED=true, lalu variable itu dihapus.
CMD ["sh", "-c", "npm run db:migrate:prod && npm run db:backfill-usernames && if [ \"$RUN_PRODUCTION_SEED\" = \"true\" ]; then npm run db:seed:prod; fi && node .next/standalone/server.js"]
