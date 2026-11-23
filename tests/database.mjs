import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,storage,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
create publication supabase_realtime;`);
try {
  for (const name of [
    "202611230001_foundation.sql",
    "202611230002_community.sql",
  ])
    await db.exec(
      fs.readFileSync(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  console.log(
    "PASS: complete migration compiled with PostgreSQL engine (Supabase auth/storage schemas simulated).",
  );
} catch (e) {
  console.error(e.message, e.where, e.query);
  process.exit(1);
}
await db.exec(
  fs.readFileSync(
    new URL("../supabase/tests/authorization.sql", import.meta.url),
    "utf8",
  ),
);
console.log("PASS: database authorization and lifecycle regression suite.");
try {
  await db.exec(
    fs.readFileSync(
      new URL("../supabase/tests/community.sql", import.meta.url),
      "utf8",
    ),
  );
} catch (e) {
  console.error(e.message, e.where);
  process.exit(1);
}
console.log(
  "PASS: community, legal/photo gates, feedback isolation and reviewed deletion regression suite.",
);
await db.close();
