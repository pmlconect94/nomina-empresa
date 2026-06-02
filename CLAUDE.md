# PML CONNECT — Sistema de Nómina WEB

Aplicación web de **nómina** para **Productos Marinos Lizárraga (Grupo Lizárraga)**.
Permite capturar incidencias semanales/quincenales (asistencias, horas extra, retardos,
viajes con incentivos, comedor, préstamos) y calcular automáticamente percepciones,
deducciones, neto a pagar y la distribución del pago (depósito banco / vales / efectivo).

---

## Stack

- **Frontend:** React 18 (Create React App, `react-scripts`). Sin router: navegación por estado.
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions en Deno).
- **Hosting:** Vercel.
- Versión: `2.0.0`.

## Infraestructura (ver también `.claude` memory)

| Pieza | Valor |
|------|-------|
| Proyecto Supabase | **crm-pml** — `xjbhfeqcjjqyjkvdbyxy` (us-east-1). **Compartido** con el sistema de almacén/WMS. |
| URL Supabase | `https://xjbhfeqcjjqyjkvdbyxy.supabase.co` |
| Proyecto Vercel | **nomina-empresa** — team `ddlpml2-6030s-projects` |
| URL producción | https://nomina-empresa.vercel.app |
| Edge Function | `admin-users` (crear / borrar / cambiar contraseña de usuarios) |
| Admin inicial | `ddl.pml2@gmail.com` (rol `admin`) |

> El proyecto Supabase original (`jcbhdnuypilxzxflwcah`) fue **borrado**; por eso el login
> dejó de funcionar. Se recreó todo el esquema de nómina dentro de `crm-pml`.

## Variables de entorno (`.env` / Vercel)

Solo estas tres. **Nunca** poner secretos del lado servidor aquí: cualquier `REACT_APP_*`
se hornea en el bundle JS público.

```
REACT_APP_SUPABASE_URL=https://xjbhfeqcjjqyjkvdbyxy.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<anon key — pública por diseño, protegida por RLS>
REACT_APP_MASTER_PIN=<pin para desbloquear nóminas timbradas>
```

## Repositorio (GitHub)

- **Repo:** `https://github.com/pmlconect94/nomina-empresa` (privado).
- El código vive aquí para poder trabajar desde varias computadoras.
- `.env` y `node_modules` **no** se suben (ver `.gitignore`).

## Cómo correr y desplegar

```bash
npm install
npm start                 # desarrollo local (lee .env)

# Despliegue a producción (Vercel CLI, desde esta carpeta):
npx vercel deploy --prod --yes
```

> ⚠️ Tras `vercel deploy` por CLI, el dominio corto `nomina-empresa.vercel.app` a veces
> NO se reasigna solo. Si la web sigue mostrando la versión vieja, reasignar el alias:
> `npx vercel alias set <url-del-deploy>.vercel.app nomina-empresa.vercel.app`

## Trabajar desde otra computadora (setup nuevo)

```bash
git clone https://github.com/pmlconect94/nomina-empresa.git
cd nomina-empresa
npm install

# Recrear el .env (NO está en git). Opción A — bajarlo de Vercel:
npx vercel link            # elegir team ddlpml2-6030s-projects / proyecto nomina-empresa
npx vercel env pull .env   # crea .env con las variables de producción

# Opción B — crearlo a mano con estas 3 variables:
#   REACT_APP_SUPABASE_URL=https://xjbhfeqcjjqyjkvdbyxy.supabase.co
#   REACT_APP_SUPABASE_ANON_KEY=<anon key del proyecto crm-pml>
#   REACT_APP_MASTER_PIN=1424798

npm start
```

---

## Arquitectura (`src/`)

```
App.js                      sesión + rol; decide Login / Main / "acceso pendiente"
pages/
  Login.js                  email + contraseña (Supabase Auth)
  Main.js                   header, navegación, botón flotante de Configuración (admin)
  RRHH.js                   tabs: Nóminas / Empleados / Préstamos
  NominaLista.js            crear / listar / eliminar nóminas (semanas)
  NominaDetalle.js          orquesta las 6 pestañas + guardar/timbrar + desbloquear
  Empleados.js              catálogo CRUD, búsqueda y ordenamiento
  Prestamos.js              alta, archivar, avance de pago
  Viajes.js                 incentivos chofer/acompañante por tramo horario
  Usuarios.js               gestión de usuarios (vía Edge Function admin-users)
  Configuracion.js          contenedor de Usuarios
  tabs/
    TabResumen.js           percepciones, deducciones, neto, distribución del pago
    TabAsistencias.js       captura por día (código, retardo, horas extra, motivo)
    TabComedor.js           días de comedor × costo fijo
    TabPrestamosResumen.js  préstamos con descuento aplicable esta nómina
    TabFiscal.js            ISR / IMSS / depósito total / vales
lib/supabase.js             cliente Supabase + constantes + lógica de cálculo
```

## Modelo de datos (Postgres)

`empleados`, `semanas`, `nominas`, `asistencias`, `viajes`, `usuarios_roles`,
`prestamos`, `prestamo_descuentos`. Todas con RLS:
lectura = autenticados; escritura = `admin`/`editor` (`usuarios_roles`: escritura solo `admin`).
Función helper `get_user_rol()` usada por las políticas.

## Reglas de negocio clave (`lib/supabase.js`)

- **Salario diario:** `sd_real / 7` (real) y `sd_fiscal / 7` (fiscal).
- **Vales / previsión social:** 10% del `sd_fiscal` cada uno.
- **Séptimo día:** `dDR * min(diasQueCuentan, 6) / 6` (cuentan A, V, PCG).
- **Horas extra:** `horas * (dDR/8) * 2` (dobles).
- **Prima vacacional:** 25% sobre días de vacaciones (V).
- **Viajes:** incentivo por tramo de hora de llegada (tablas `TAB_CHOFER`/`TAB_ACOMP`);
  "se quedó a dormir" = pago máximo + reinicio de tabular.
- **Comedor:** $30 por día, máximo 5 días.
- **Préstamos:** descuento 10% semanal / 20% quincenal del monto; primer descuento
  **una semana después** de la fecha del préstamo. Al timbrar se descuenta del saldo y se
  guarda historial en `prestamo_descuentos` (reversible al desbloquear con PIN).
- **Distribución del pago:** `deposito_banco = max(0, deposito_total - vales)`;
  `efectivo = max(0, neto - deposito_total)`.

## Roles

- `admin` — todo, incluida gestión de usuarios.
- `editor` — captura/edita nóminas abiertas, viajes, asistencias.
- `viewer` — solo lectura.

---

## Estado actual

- ✅ Funcionando en producción tras recrear la BD y reconfigurar Vercel (2026-06-01).
- ⚠️ La BD es nueva → **tablas vacías**. Falta capturar empleados y nóminas (o importar respaldo).

## Pendientes / mejoras propuestas

1. ~~Sincronizar el código con GitHub.~~ ✅ Hecho (repo `pmlconect94/nomina-empresa`).
2. ~~Importar/recapturar datos de empleados.~~ ✅ Hecho (32 empleados importados).
3. **Capturar sueldos e infonavit** de cada empleado (quedaron en $0 tras el import).
4. **Nóminas quincenales:** el cálculo asume semana lunes–domingo; en quincenal las
   etiquetas de día y el "séptimo día" salen mal.
5. **Comedor:** guardar los días en su propia columna en vez de deducirlos del monto.
6. **Recibo individual imprimible** por empleado.
7. **Endurecer el desbloqueo de nóminas:** mover el PIN a verificación del servidor.

---

## Bitácora de cambios

### 2026-06-01 — Recuperación + reconexión
- Recreado todo el esquema de nómina (8 tablas + `get_user_rol()` + RLS) en el proyecto
  Supabase `crm-pml`, conviviendo con el sistema de almacén existente.
- Desplegada la Edge Function `admin-users`.
- Creado el usuario admin inicial (`ddl.pml2@gmail.com`).
- **Seguridad:** eliminado el cliente `supabaseAdmin` del frontend (exponía la
  `service_role_key` en el bundle). La gestión de usuarios ya usaba la Edge Function.
- `.env` y variables de Vercel apuntando al nuevo proyecto; redeploy a producción.
- Verificado: el bundle público ya no contiene el proyecto viejo y el login funciona.

### 2026-06-01 — Ficha completa de empleados + historial de sueldos
- **BD:** `empleados` ampliada con la ficha del Excel "HC Matriz" (datos generales,
  personales, fiscales, domicilio, contacto y contacto de emergencia). Nueva tabla
  `empleado_sueldo_historial` (campo, valor anterior→nuevo, nota, usuario, fecha) con RLS.
- **Import:** cargados los 32 empleados activos del Excel (sueldo/infonavit quedan en 0
  para captura manual).
- **Frontend (`Empleados.js`):** formulario reconstruido por secciones con todos los campos;
  edad calculada de la fecha de nacimiento; al cambiar sueldo fiscal/real o infonavit se pide
  un motivo y se registra en el historial (con usuario y fecha). Botón **"Historial"** por
  empleado que muestra todos los cambios. Tabla principal muestra columnas clave + esquema de pago.
- Áreas/dropdowns ajustados a los valores reales (Logistica/Almacen, Contabilidad, etc.).

### 2026-06-02 — Subida a GitHub
- Inicializado git y subido todo el proyecto a `https://github.com/pmlconect94/nomina-empresa`
  para poder continuar desde otra computadora.
- Agregado `.gitignore` (excluye `node_modules`, `build`, `.env`).
- Documentado en este archivo el flujo de setup en una computadora nueva.

<!-- Ir agregando aquí cada modificación nueva: fecha — qué se cambió y por qué. -->
