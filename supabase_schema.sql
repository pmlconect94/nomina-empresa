-- =============================================
-- SCHEMA NÓMINA - Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. EMPLEADOS
create table empleados (
  id uuid default gen_random_uuid() primary key,
  id_banco integer unique not null,
  id_toka integer,
  nombre text not null,
  area text,
  puesto text,
  sd_fiscal numeric(10,2) not null,
  sd_real numeric(10,2) not null,
  infonavit numeric(10,2) default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

-- 2. SEMANAS DE NÓMINA
create table semanas (
  id uuid default gen_random_uuid() primary key,
  fecha_inicio date not null,
  fecha_fin date not null,
  status text default 'abierta', -- 'abierta' | 'timbrada'
  timbrada_at timestamptz,
  timbrada_por uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(fecha_inicio)
);

-- 3. NÓMINA POR EMPLEADO Y SEMANA
create table nominas (
  id uuid default gen_random_uuid() primary key,
  semana_id uuid references semanas(id) on delete cascade,
  empleado_id uuid references empleados(id),
  -- Deducciones manuales
  isr numeric(10,2) default 0,
  imss numeric(10,2) default 0,
  comedor numeric(10,2) default 0,
  prestamos numeric(10,2) default 0,
  desc_productos numeric(10,2) default 0,
  -- Percepciones manuales
  comisiones numeric(10,2) default 0,
  retroactivos numeric(10,2) default 0,
  evaluacion numeric(10,2) default 0,
  -- Distribución pago
  deposito_total numeric(10,2) default 0,
  -- Calculados (guardados al timbrar)
  total_percepciones numeric(10,2),
  total_deducciones numeric(10,2),
  neto numeric(10,2),
  updated_at timestamptz default now(),
  unique(semana_id, empleado_id)
);

-- 4. ASISTENCIAS POR DÍA
create table asistencias (
  id uuid default gen_random_uuid() primary key,
  nomina_id uuid references nominas(id) on delete cascade,
  dia_index integer not null, -- 0=Lunes ... 6=Domingo
  fecha date not null,
  codigo text default 'A', -- A, F, D, V, PSG, PCG, TXT, SUS
  te_horas numeric(4,2) default 0,
  te_motivo text,
  retardo_min integer default 0,
  unique(nomina_id, dia_index)
);

-- 5. VIAJES
create table viajes (
  id uuid default gen_random_uuid() primary key,
  semana_id uuid references semanas(id) on delete cascade,
  fecha date,
  destino text,
  cliente text,
  vehiculo text,
  chofer_id uuid references empleados(id),
  acompanante_id uuid references empleados(id),
  hora_salida time,
  hora_llegada time,
  se_quedo_dormir boolean default false,
  incent_chofer numeric(10,2) default 0,
  incent_acompanante numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- 6. USUARIOS / ROLES
create table usuarios_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) unique,
  email text,
  nombre text,
  rol text default 'viewer', -- 'admin' | 'editor' | 'viewer'
  activo boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table empleados enable row level security;
alter table semanas enable row level security;
alter table nominas enable row level security;
alter table asistencias enable row level security;
alter table viajes enable row level security;
alter table usuarios_roles enable row level security;

-- Función para verificar rol
create or replace function get_user_rol()
returns text as $$
  select rol from usuarios_roles where user_id = auth.uid() and activo = true;
$$ language sql security definer;

-- Políticas: admin y editor pueden leer todo
create policy "Autenticados pueden leer empleados"
  on empleados for select using (auth.role() = 'authenticated');

create policy "Admin puede modificar empleados"
  on empleados for all using (get_user_rol() in ('admin', 'editor'));

create policy "Autenticados pueden leer semanas"
  on semanas for select using (auth.role() = 'authenticated');

create policy "Admin puede modificar semanas"
  on semanas for all using (get_user_rol() in ('admin', 'editor'));

create policy "Autenticados pueden leer nominas"
  on nominas for select using (auth.role() = 'authenticated');

create policy "Editor puede modificar nominas abiertas"
  on nominas for all using (
    get_user_rol() in ('admin', 'editor') and
    exists (select 1 from semanas where id = nominas.semana_id and status = 'abierta')
  );

create policy "Autenticados pueden leer asistencias"
  on asistencias for select using (auth.role() = 'authenticated');

create policy "Editor puede modificar asistencias"
  on asistencias for all using (get_user_rol() in ('admin', 'editor'));

create policy "Autenticados pueden leer viajes"
  on viajes for select using (auth.role() = 'authenticated');

create policy "Editor puede modificar viajes"
  on viajes for all using (get_user_rol() in ('admin', 'editor'));

create policy "Admin puede gestionar usuarios"
  on usuarios_roles for all using (get_user_rol() = 'admin');

create policy "Usuario puede ver su propio rol"
  on usuarios_roles for select using (user_id = auth.uid());

-- =============================================
-- DATOS INICIALES - 31 EMPLEADOS
-- =============================================
insert into empleados (id_banco, id_toka, nombre, area, puesto, sd_fiscal, sd_real) values
(2,10,'Alejandra Rivera Godoy','Contabilidad','Analista contable',3195.08,3500.00),
(4,1,'Silvia Alatorre Salmerón','Administración','Encargado de Crédito y Cobranza',4235.00,5021.56),
(9,5,'Claudia Berenice Hernández Chávez','Administración','Cajera',2844.66,3150.00),
(11,12,'Mario Vega Vega','Almacén','Chofer',2860.48,3165.98),
(25,11,'Cecilia Rodriguez Lugo','Contabilidad','Facturista',2696.68,3000.00),
(29,4,'Diego Diaz Lizárraga','Tesorería','Jefe de Tesorería',11235.00,12000.00),
(41,17,'José Benjamin Hernández Villalobos','Almacén','Chofer',2442.65,3000.00),
(42,16,'Maria Isabel Gutierrez Sarmiento','Aseo','Auxiliar de Limpieza',2240.00,2560.58),
(43,19,'Daniel Alejandro Alvarez Guzman','Almacén','Almacenista',2442.65,2734.89),
(48,18,'María Luisa Calvillo','Contabilidad','Auxiliar Contable',2442.65,2734.89),
(51,21,'Erika Yanet Sanchez Aparicio','Producción','Almacenista',2442.65,2734.89),
(55,22,'Viridiana Ocampo Gómez','Comercial','Ejecutivo Comercial',2799.86,3165.98),
(60,23,'Jacob Yeiko Maldonado Vergara','Almacén','Almacenista',2860.48,3165.98),
(61,24,'Olatz Ferreyra Alatorre','Crédito y Cobranza','Auxiliar Administrativo',2240.00,2560.58),
(63,28,'Maria Joselyn Cervantes Mendoza','Comercial','Crédito y Cobranza',2240.00,2560.58),
(64,27,'Juan Daniel Montoya Vazquez','Almacén','Líder de Almacén',3199.28,3490.49),
(66,29,'Alfredo Flores Campos','Almacén','Chofer',2442.65,3000.00),
(68,30,'Diego Abraham Rojas Ibañez','Almacén','Almacenista',2442.65,2734.89),
(69,32,'Rodolfo Preciado Mayoral','Almacén','Almacenista',2442.65,2734.89),
(71,31,'Jessica Arlette Gonzalez Campos','Comercial','Atención al Cliente',2240.00,2560.58),
(73,33,'José Nieto Aldrete','Comercial','Ejecutivo Comercial',2799.86,3165.98),
(74,35,'Adan Rojas Aviña','Almacén','Chofer',3147.27,3505.70),
(75,36,'Brandon Guillermo Pérez Santillan','Almacén','Almacenista',2860.48,3165.98),
(77,37,'Yunnen Torres Nava','Almacén','Líder de Almacén',3199.28,3490.49),
(80,40,'Luis Fernando Gomez','Almacén','Almacenista',2442.65,2734.89),
(81,41,'Brayan Alejandro Galindo Rodriguez','Almacén','Almacenista',2442.65,2734.89),
(82,42,'Christian Gael Ceja Lizarraga','Almacén','Almacenista',2442.65,2734.89),
(84,43,'Estela Fernanda García','Comercial','Atención al Cliente',2442.65,2734.89),
(85,45,'Jose Humberto Ramirez Ceja','Almacén','Almacenista',2442.65,2734.89),
(86,46,'Jhonatan Andres Flores Hernandez','Almacén','Almacenista',2442.65,2734.89),
(87,47,'Gael Beltran','Almacén','Chofer',2696.68,3000.00);
