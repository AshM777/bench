-- Normalize coworker roles: founding executive -> admin; retired executive slugs -> general.
UPDATE "agents" SET "role" = 'admin' WHERE "role" = 'ceo';
UPDATE "agents" SET "role" = 'general' WHERE "role" IN ('cto', 'cmo', 'cfo');
