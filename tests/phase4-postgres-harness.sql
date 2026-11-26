-- CI-only compatibility harness for a fresh disposable PostgreSQL database.
-- NOT the Supabase platform schema. Never run against hosted or existing databases.
DO $$ BEGIN
 IF current_database() <> 'talentfolio_ci' THEN
   RAISE EXCEPTION 'CI harness requires the disposable talentfolio_ci database';
 END IF;
END $$;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY, email text UNIQUE, email_confirmed_at timestamptz,
 created_at timestamptz, updated_at timestamptz
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
CREATE TABLE storage.buckets (
 id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false,
 file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE storage.objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 bucket_id text REFERENCES storage.buckets(id), name text NOT NULL,
 UNIQUE(bucket_id,name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN cardinality(string_to_array(name,'/'))>1
 THEN (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1]
 ELSE ARRAY[]::text[] END
$$;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
GRANT EXECUTE ON FUNCTION storage.foldername(text) TO anon,authenticated;
-- Exercise migration-specific grants against broadly granted Supabase-style defaults.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO anon,authenticated;

-- Supabase grants direct EXECUTE privileges in addition to PUBLIC defaults.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated;
