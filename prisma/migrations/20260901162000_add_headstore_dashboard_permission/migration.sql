INSERT INTO "RolePermission" ("role", "menu")
VALUES ('headstore', 'dashboard')
ON CONFLICT ("role", "menu") DO NOTHING;
