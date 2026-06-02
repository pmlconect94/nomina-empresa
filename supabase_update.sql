-- =============================================
-- ACTUALIZACIÓN DE SCHEMA — Ejecutar en Supabase SQL Editor
-- =============================================

-- 0. FUNCIÓN HELPER DE ROL (requerida por todas las políticas RLS)
create or replace function get_user_rol()
returns text as $$
  select rol from usuarios_roles where user_id = auth.uid()
$$ language sql security definer stable;

-- RLS para tablas principales
alter table if exists empleados enable row level security;
drop policy if exists "Autenticados pueden leer empleados" on empleados;
drop policy if exists "Editor puede modificar empleados" on empleados;
create policy "Autenticados pueden leer empleados"
  on empleados for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar empleados"
  on empleados for all using (get_user_rol() in ('admin','editor'));

alter table if exists semanas enable row level security;
drop policy if exists "Autenticados pueden leer semanas" on semanas;
drop policy if exists "Editor puede modificar semanas" on semanas;
create policy "Autenticados pueden leer semanas"
  on semanas for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar semanas"
  on semanas for all using (get_user_rol() in ('admin','editor'));

alter table if exists nominas enable row level security;
drop policy if exists "Autenticados pueden leer nominas" on nominas;
drop policy if exists "Editor puede modificar nominas" on nominas;
create policy "Autenticados pueden leer nominas"
  on nominas for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar nominas"
  on nominas for all using (get_user_rol() in ('admin','editor'));

alter table if exists asistencias enable row level security;
drop policy if exists "Autenticados pueden leer asistencias" on asistencias;
drop policy if exists "Editor puede modificar asistencias" on asistencias;
create policy "Autenticados pueden leer asistencias"
  on asistencias for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar asistencias"
  on asistencias for all using (get_user_rol() in ('admin','editor'));

alter table if exists viajes enable row level security;
drop policy if exists "Autenticados pueden leer viajes" on viajes;
drop policy if exists "Editor puede modificar viajes" on viajes;
create policy "Autenticados pueden leer viajes"
  on viajes for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar viajes"
  on viajes for all using (get_user_rol() in ('admin','editor'));

alter table if exists usuarios_roles enable row level security;
drop policy if exists "Autenticados pueden leer usuarios_roles" on usuarios_roles;
drop policy if exists "Admin puede modificar usuarios_roles" on usuarios_roles;
create policy "Autenticados pueden leer usuarios_roles"
  on usuarios_roles for select using (auth.role() = 'authenticated');
create policy "Admin puede modificar usuarios_roles"
  on usuarios_roles for all using (get_user_rol() = 'admin');

-- 1. Modificar tabla semanas para agregar tipo
ALTER TABLE semanas ADD COLUMN IF NOT EXISTS tipo text default 'semanal';

-- 2. Agregar columna deposito_total a nominas si no existe
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS deposito_total numeric(10,2) default 0;
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS isr numeric(10,2) default 0;
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS imss numeric(10,2) default 0;

-- 3. TABLA DE PRÉSTAMOS
create table if not exists prestamos (
  id uuid default gen_random_uuid() primary key,
  empleado_id uuid references empleados(id) on delete cascade,
  monto numeric(10,2) not null,
  saldo numeric(10,2) not null,
  fecha_prestamo date not null,
  tipo text default 'semanal', -- 'semanal' | 'quincenal'
  activo boolean default true,
  created_at timestamptz default now()
);

-- 4. TABLA DE DESCUENTOS DE PRÉSTAMO (historial por nómina)
create table if not exists prestamo_descuentos (
  id uuid default gen_random_uuid() primary key,
  prestamo_id uuid references prestamos(id) on delete cascade,
  nomina_id uuid references nominas(id) on delete cascade,
  semana_id uuid references semanas(id),
  monto_descontado numeric(10,2) not null,
  saldo_anterior numeric(10,2),
  saldo_posterior numeric(10,2),
  created_at timestamptz default now()
);

-- 5. RLS para préstamos
alter table prestamos enable row level security;
alter table prestamo_descuentos enable row level security;

create policy "Autenticados pueden leer prestamos"
  on prestamos for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar prestamos"
  on prestamos for all using (get_user_rol() in ('admin','editor'));

create policy "Autenticados pueden leer descuentos"
  on prestamo_descuentos for select using (auth.role() = 'authenticated');
create policy "Editor puede modificar descuentos"
  on prestamo_descuentos for all using (get_user_rol() in ('admin','editor'));
