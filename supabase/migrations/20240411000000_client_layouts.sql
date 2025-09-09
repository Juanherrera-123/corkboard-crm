create table if not exists client_layouts (
  client_id uuid primary key references clients(id) on delete cascade,
  layout jsonb not null default '[]'::jsonb
);
