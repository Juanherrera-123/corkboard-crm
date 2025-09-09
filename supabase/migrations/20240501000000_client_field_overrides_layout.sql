alter table client_field_overrides
  add column if not exists x int,
  add column if not exists y int,
  add column if not exists w int,
  add column if not exists h int;
