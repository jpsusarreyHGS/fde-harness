/**
 * The optional database.
 *
 * `getDb()` returns `null` when `DATABASE_URL` is unset, and every caller
 * degrades to the on-disk fallback. That property is deliberate: the app runs
 * and is reviewable with nothing provisioned, which is worth more at this
 * stage than a hard dependency on a Postgres nobody has created yet.
 */

import type { Sql } from "postgres";

let client: Sql | null = null;
let attempted = false;

export async function getDb(): Promise<Sql | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (client) return client;
  if (attempted) return client;
  attempted = true;
  const { default: postgres } = await import("postgres");
  client = postgres(url, {
    // Serverless: one connection per lambda, short idle life.
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return client;
}

/**
 * Schema.
 *
 * One row per engagement, with the derived state as JSONB plus the few
 * columns the portfolio view sorts and filters on. Deliberately not a
 * normalised model of evidence and requirements yet — see the note in
 * `store.ts` for when that changes and why.
 */
export const SCHEMA = `
create table if not exists engagements (
  slug          text primary key,
  client        text not null,
  sponsor       text,
  stage         text,
  residency     text,
  labour        text,
  schema_version int not null,
  generated_at  timestamptz not null,
  ingested_at   timestamptz not null default now(),
  state         jsonb not null
);
create index if not exists engagements_stage_idx on engagements (stage);
create index if not exists engagements_ingested_idx on engagements (ingested_at desc);

create table if not exists ingest_log (
  id            bigserial primary key,
  slug          text not null,
  at            timestamptz not null default now(),
  schema_version int,
  bytes         int,
  ok            boolean not null,
  note          text
);
`;

export async function migrate(): Promise<boolean> {
  const sql = await getDb();
  if (!sql) return false;
  await sql.unsafe(SCHEMA);
  return true;
}
