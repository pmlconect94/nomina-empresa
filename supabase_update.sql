-- =============================================
-- ACTUALIZACIÓN DE SCHEMA — Ejecutar en Supabase SQL Editor
-- =============================================

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
