-- Reference photography can be published without presenting a third-party
-- vehicle or home as verified Penman Empire inventory.
alter table public.products
  add column if not exists is_reference boolean not null default false;

alter table public.vehicles
  add column if not exists is_reference boolean not null default false;

alter table public.properties
  add column if not exists is_reference boolean not null default false;

alter table public.properties
  drop constraint if exists properties_availability_check;
alter table public.properties
  add constraint properties_availability_check
  check (availability in ('available', 'reserved', 'sold', 'let', 'unverified'));
