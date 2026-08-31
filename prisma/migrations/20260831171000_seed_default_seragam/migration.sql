INSERT INTO "JenisSeragam" (
  "id", "kode", "nama", "deskripsi", "aktif", "createdAt", "updatedAt"
) VALUES
  ('default_seragam_a', 'SRG-A', 'Seragam A', 'Seragam kerja tipe A', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default_seragam_b', 'SRG-B', 'Seragam B', 'Seragam kerja tipe B', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default_polo_inox', 'POLO-INOX', 'Polo iNox', 'Kaos polo resmi iNox', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("kode") DO NOTHING;
