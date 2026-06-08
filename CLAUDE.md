# PML CONNECT — Sistema de Nómina WEB

Aplicación web de **nómina** para **Productos Marinos Lizárraga (Grupo Lizárraga)**.
Permite capturar incidencias semanales/quincenales (asistencias, horas extra, retardos,
viajes con incentivos, comedor, préstamos) y calcular automáticamente percepciones,
deducciones, neto a pagar y la distribución del pago (depósito banco / vales / efectivo).

---

## Stack

- **Frontend:** React 18 + **Vite** + **TypeScript** + **Tailwind** + React Router + Framer Motion + Lucide + Sonner.
  Mismo stack y design system que el **CRM PML** (para integrarlo después como módulo). Build: `tsc -b && vite build` → `dist/`.
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions en Deno).
- **Hosting:** Vercel (framework `vite`, ver `vercel.json`).
- Versión: `3.0.0`.

> Migrado desde Create React App (v2) a Vite/TS/Tailwind el 2026-06-02 (fase F0).
> El design system (tokens, componentes `.btn/.card/.field-input/.tbl/.badge/.kpi`, shell
> sidebar+topbar) se replicó de `CRM PML`. Ver `src/index.css`.

## Servicios, cuentas y nombres de proyecto (LEER PRIMERO al cambiar de equipo)

Tres servicios. Aquí el **nombre exacto del proyecto en cada uno** y **con qué cuenta** se entra,
para que el Claude Code del otro equipo sepa exactamente dónde está todo.

### 1. GitHub (código)
- **Cuenta / usuario:** `pmlconect94`
- **Nombre del repositorio:** **`nomina-empresa`**
- **URL:** https://github.com/pmlconect94/nomina-empresa  — **repositorio PÚBLICO**
- Es donde vive TODO el código. `git clone` desde ahí.
- Nota: los commits se autoran como `ventas.lizarraga2@gmail.com` (config local de git de este equipo).

### 2. Supabase (base de datos + auth + edge functions)
- **Cuenta:** la del dueño (organización personal del usuario).
- **Nombre del proyecto:** **`crm-pml`** — ref `xjbhfeqcjjqyjkvdbyxy` (región us-east-1)
- **URL:** `https://xjbhfeqcjjqyjkvdbyxy.supabase.co`
- ⚠️ Este proyecto está **COMPARTIDO** con el sistema de almacén/WMS (tablas `cells`, `pallets`,
  `catalog`, `movimientos`, etc.). **No tocar** esas tablas. Las de nómina están listadas en
  "Modelo de datos" más abajo.
- **Edge Function:** `admin-users` (crear / borrar / cambiar contraseña de usuarios).
- En el otro equipo: tener el **MCP de Supabase** conectado a esta cuenta (o el access token),
  o usar el dashboard de Supabase con la cuenta del usuario.
- El proyecto Supabase original (`jcbhdnuypilxzxflwcah`) fue **borrado**; todo se recreó en `crm-pml`.

### 3. Vercel (hosting / despliegue)
- **Cuenta / usuario:** `ddlpml2-6030`  ·  **Team / scope:** `ddlpml2-6030s-projects`
- **Nombre del proyecto:** **`nomina-empresa`**
- **URL producción:** https://nomina-empresa.vercel.app
- **Plan:** Hobby (gratis). Framework detectado: **Vite** (ver `vercel.json`).
- **Auto-deploy:** cada push a `main` del repo público dispara un deploy automático.
- En el otro equipo: `npx vercel login` con la cuenta `ddlpml2-6030` para poder desplegar/reasignar dominio.
- ⚠️ A veces el dominio corto `nomina-empresa.vercel.app` no se reasigna solo al último deploy;
  reasignar con `npx vercel alias set <url-del-deploy> nomina-empresa.vercel.app`.

### Login de la aplicación
- Admin: **`ddl.pml2@gmail.com`** (rol `admin`). Contraseña: la que ya configuró el usuario.

## Variables de entorno (`.env` / Vercel)

Vite expone solo variables con prefijo `VITE_` (se hornean en el bundle público).
**Nunca** poner secretos de servidor (service_role_key) aquí.

```
VITE_SUPABASE_URL=https://xjbhfeqcjjqyjkvdbyxy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key — pública por diseño, protegida por RLS>
VITE_MASTER_PIN=<pin para desbloquear nóminas / sueldos>
```

## Repositorio (GitHub)

- **Repo:** `https://github.com/pmlconect94/nomina-empresa` (**público**).
- El código vive aquí para poder trabajar desde varias computadoras.
- `.env` y `node_modules` **no** se suben (ver `.gitignore`).

> ⚠️ **Por qué público:** el plan **Hobby** de Vercel bloquea (`BLOCKED`) los deploys de
> repos **privados** cuando el **autor del commit** no es el dueño de la cuenta de Vercel
> (aquí los commits van como `ventas.lizarraga2@gmail.com`, distinto a `ddl.pml2@gmail.com`).
> Soluciones: (a) repo público [elegido], o (b) commitear con el email del dueño de Vercel,
> o (c) upgrade a Pro. Como es público, no se deben subir secretos (el `.env` está en `.gitignore`).

## Cómo correr y desplegar

```bash
npm install
npm run dev               # desarrollo local (Vite, http://localhost:5173)
npm run build             # tsc -b && vite build → dist/

# Despliegue a producción (Vercel CLI, desde esta carpeta):
npx vercel deploy --prod --yes
```

> ⚠️ Tras `vercel deploy` por CLI, el dominio corto `nomina-empresa.vercel.app` a veces
> NO se reasigna solo. Si la web sigue mostrando la versión vieja, reasignar el alias:
> `npx vercel alias set <url-del-deploy>.vercel.app nomina-empresa.vercel.app`

## Trabajar desde otra computadora (setup nuevo) — LEER AL CAMBIAR DE EQUIPO

```bash
# 0) Node.js NO viene preinstalado en Windows. Instalar LTS y reabrir la terminal:
winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
#    (verifica: node --version  /  npm --version  →  v24.x / 11.x)

# 1) Clonar y dependencias
git clone https://github.com/pmlconect94/nomina-empresa.git
cd nomina-empresa
npm install                # ~157 paquetes

# 2) Identidad de git de este proyecto (los commits van como ventas.lizarraga2):
git config user.name "pml-diego"
git config user.email "ventas.lizarraga2@gmail.com"

# 3) Recrear el .env (NO está en git). Bajarlo de Vercel:
npx vercel login           # cuenta ddlpml2-6030 (abre el navegador)
npx vercel link --yes --project nomina-empresa   # team ddlpml2-6030s-projects
npx vercel env pull .env   # crea .env con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MASTER_PIN

# 4) Correr
npm run dev                # http://localhost:5173
```

> - El `.env` (anon key + PIN) se obtiene de Vercel con `vercel env pull` (no se guarda en el repo público).
> - **Datos:** viven en Supabase (proyecto `crm-pml`, **schema `nomina`**). No importa desde qué
>   compu trabajes: la base es la misma. Para tocar la BD directo, conectar el **MCP de Supabase**
>   a la cuenta del dueño (o usar el dashboard).
> - **Deploy:** push a `main` del repo público → auto-deploy a producción en Vercel. No hace falta
>   `vercel deploy` por CLI (evita el problema del alias del dominio corto).
> - Login de la app: `ddl.pml2@gmail.com` (admin).

---

## Arquitectura (`src/`) — Vite + TypeScript (.tsx)

```
main.tsx / App.tsx          router + AuthProvider; rutas /app/*
pages/
  LoginPage.tsx             email + contraseña (Supabase Auth)
  DashboardPage.tsx         inicio (KPIs básicos)
  EmpleadosPage.tsx         catálogo CRUD (orden por ID Banco), Ver/Editar, Alta IMSS, botón SUELDO
  SueldoModal.tsx           sueldos por movimientos (alta/modif/baja) + descuentos permanentes (candado)
  NominasPage.tsx           crear / listar / eliminar nóminas; sugiere periodo semanal/quincenal
  NominaDetallePage.tsx     orquesta las pestañas, carga datos, calcula, guardar/desbloquear (PIN)
  PrestamosPage.tsx         alta, abonos fuera de nómina, archivar, avance
  ViajesPage.tsx            ViajesPanel: incentivos por tramo + viajes retroactivos + validación con HE
  UsuariosPage.tsx          gestión de usuarios (Edge Function admin-users)
  tabs/
    TabResumen.tsx          percepciones/deducciones/neto/distribución + recibo (tarjeta) imprimible
    TabAsistencias.tsx      captura por día (código/retardo/HE/motivo), Todos A·D, leyenda incidencias
    TabComedor.tsx          calendario L-V (quincena = 10 días); guarda por día
    TabFiscal.tsx           ISR/IMSS/depósito/vales (orden por ID NOMEX)
    TabRetroactivos.tsx     HE retroactivas (horas + propósito + día de la semana anterior)
    TabDescuentoProducto.tsx / TabBonos.tsx   por empleado con botón "+"; Bonos incluye permanentes
    TabPrestamosResumen.tsx descuento de préstamo aplicable esta nómina
lib/
  supabase.ts               cliente Supabase (db.schema = 'nomina')
  calc.ts                   TODA la lógica de cálculo (calcularNomina), tabuladores viajes, SDI, motivos
  auth.tsx                  AuthProvider, rol, reauth (candado de sueldos)
  format.ts                 fmt, fmtFecha, toISO, nomexLabel, etc.
components/                 Sidebar, Topbar, Icon, motion
```

## Modelo de datos (Postgres, schema **`nomina`** del proyecto Supabase `crm-pml`)

> Desde 2026-06-02 las tablas de nómina viven en el schema **`nomina`** (no en `public`). El
> WMS sigue en `public` y el CRM en `crm`. El cliente del front usa `db: { schema: 'nomina' }`.

Tablas de **nómina** (las del WMS NO se tocan): `empleados` (ficha completa + `alta_imss`,
`sd_real`/`sd_fiscal` semanal-equiv, `vales`, `prevision_social`, `infonavit`), `semanas`,
`nominas`, `asistencias`, `viajes`, `usuarios_roles`, `prestamos`, `prestamo_descuentos`,
`empleado_sueldo_movimientos` (alta/modif/baja con vigencias, sueldo periodo/diario real y
fiscal, SDI, vales, previsión — el último vigente alimenta el cálculo), `empleado_descuentos`
(Infonavit/Fonacot/etc. con historial), `empleado_sueldo_historial` (legado), `comedor_registro`
(comedor por día lun-vie, para reporte mensual), `nomina_descuento_producto`, `nomina_bono`,
`nomina_retroactivo` (HE retroactivas: `horas`, `descripcion`=propósito, `periodo_origen`=día),
`bono_permanente` (bonos por default por empleado) + `bono_permanente_excluido` (exclusiones por
semana). `viajes` tiene `retroactivo` (bool). **Vista** `v_incidencias` (KPIs: días por código + HE
+ retardo, por semana/empleado). Todas con RLS: lectura = autenticados; escritura = `admin`/`editor`
(`usuarios_roles`: escritura solo `admin`). Función helper `get_user_rol()` (apunta a
`nomina.usuarios_roles`) usada por las políticas.

## Reglas de negocio clave (toda la lógica en **`lib/calc.ts` → `calcularNomina`**)

- **Salario diario:** `dDR = sd_real / 7` (real) y `dDF = sd_fiscal / 7` (fiscal). `sd_*` es el
  semanal-equivalente (diario × 7); el diario sale del sueldo del periodo ÷15 (quincena) o ÷7 (semana).
- **Vales / previsión social:** monto base capturado en el alta de sueldo (sugerido 10% del fiscal del
  periodo), pero **se prorratean por las asistencias pagadas**: `base × (asistenciasPagadas / díasPeriodo)`,
  donde `asistenciasPagadas = díasQueCuentan + séptimo` y `díasPeriodo` = 7 (semana) / 15 (quincena).
  Con asistencia completa → vales/previsión completos. **No** entran en el neto (son parte fiscal).
- **Incidencias (pago por código):** **se pagan** (trato asistencia) A, **D**, V, PCG, TXT; **no se
  pagan** (trato falta, restan) **F**, PSG, SUS. `asistMonto = díasPagados[A,V,PCG,TXT] × dDR`; el
  **Descanso (D) se paga vía el séptimo** (no entra en asistMonto para no duplicar).
- **Séptimo día:** `dDR × (díasQueCuentan × factor)`; factor = `1/6` semanal, `2/13` quincenal.
- **Horas extra:** `horas × (dDR/8) × 2` (dobles). Motivos en `MOTIVOS_TE` (incluye Junta/Planta/Desayuno).
- **Retardos:** se capturan **en horas**; descuento = `horas × (dDR/8)` (valor por hora).
- **Prima vacacional:** ❌ **NO se suma** al neto (se quitó). V paga el día completo, sin el 25%.
- **Viajes:** incentivo por **tramo de hora de llegada** (4 tramos, `TAB_CHOFER`/`TAB_ACOMP`):
  7am-3pm 200/100 · 3pm-7pm 400/200 · 7pm-11pm 500/300 · **11pm-7am 600/400**.
  "Se quedó a dormir" = **último tabular + $100** (600+100 / 400+100 = 700/500) **+ el tabular de la
  hora de llegada del día siguiente** (ej.: llega 8pm → 700/500 + 500/300 = chofer 1200 / acomp 800).
  El incentivo se **congela** en `viajes.incent_*` al capturar (editar recalcula). Solo área
  Logística/Almacén. **Viaje retroactivo** (fecha ≤7 días antes del periodo) cuenta en Retroactivo.
- **Retroactivos:** viajes retro + **HE retro** (pestaña "HE retro": horas + propósito + día de la
  semana anterior) → suman a la columna/total **Retroactivo**.
- **Comedor:** $30 por día. **Semanal:** corre **viernes→jueves** (del viernes anterior al lunes
  hasta el jueves), 5 días — porque la nómina cierra el viernes y ese día aún no se sabe el comedor,
  así que pasa a la siguiente. **Quincenal:** días hábiles del periodo (1–15 / 16–fin), máx 10.
- **Préstamos:** descuento **10% del monto** (semanal **y** quincenal); primer descuento **una semana
  después** de la fecha del préstamo. **Abonos fuera de nómina** reducen el saldo (el % de descuento
  no cambia). Al timbrar se descuenta del saldo y se guarda historial en `prestamo_descuentos`
  (reversible al desbloquear con PIN).
- **Bonos permanentes:** definidos por empleado, aplican por **default cada nómina**; se pueden
  **excluir por periodo** (tabla `bono_permanente` + exclusiones `bono_permanente_excluido`).
- **Neto a pagar (real):** `percepciones (SIN vales ni previsión) − deducciones (SIN ISR ni IMSS)`.
- **Depósito fiscal (calculado, NO se captura):** `sueldoFiscalPeriodo (completo) + vales + previsión
  − TODAS las deducciones (incluye ISR e IMSS)`. El sueldo fiscal va completo (las faltas no lo reducen).
- **Depósito corregido:** casilla manual (`nominas.deposito_corregido`, NULL = usar el fiscal). Se usa
  cuando el depósito fiscal calculado no coincide con el sistema de timbrado (nomiexpress).
- **Distribución del pago:** `efectivo = neto − depósito_corregido`;
  `deposito_banco = depósito_corregido − vales`; `vales` = los prorrateados.
  (vales + banco + efectivo = neto.) Sin Alta IMSS → todo a efectivo (sin depósito ni vales).

## Roles

- `admin` — todo, incluida gestión de usuarios.
- `editor` — captura/edita nóminas abiertas, viajes, asistencias.
- `viewer` — solo lectura.

---

## Estado actual (2026-06-02)

- ✅ En producción (https://nomina-empresa.vercel.app). BD en Supabase `crm-pml`, schema `nomina`.
- ✅ **32 empleados cargados** con sueldos (real/fiscal por periodo), vales, previsión, SDI e IDs
  (Toka/Banco/NOMEX) — alta masiva desde `EMPLEADOS_SUELDOS.xlsx`.
- ✅ 3 préstamos a medias dados de alta (María Isabel, Joselyn, Claudia) con fecha 2026-05-01 para
  que descuenten en la nómina del **25–31 may**.
- 🔜 **Se estaba armando la nómina semanal del 25–31 may** con los cambios recientes de cálculo.

## 🧭 Para la próxima sesión de Claude Code (LEER)

**Entorno (Windows):**
- Usar **PowerShell** para node/npm/git/vercel — en el shell `bash` de las tools, `node`/`npm` NO
  están en el PATH (hay que prefijar `$env:Path = "$env:ProgramFiles\nodejs;$env:Path"`).
- Para la BD: **MCP de Supabase** (project_id `xjbhfeqcjjqyjkvdbyxy`, schema `nomina`). Las tablas
  de nómina NO están en `public` (ahí está el WMS — no tocar).
- Deploy: **`git push` a `main`** → auto-deploy Vercel. NO usar `vercel deploy` por CLI (rompe el
  alias del dominio corto). MCP de Vercel: projectId `prj_123NF7kQh51ipCzUz6gigeX6gdyf`,
  teamId `team_50ehqq8196yW0uMKTuEO8eXF`.
- Flujo seguro: editar → `npm run build` (tsc) → commit → push → verificar prod 200.

**Pendiente de validar / siguientes pasos:**
- ✔️ Validar la **nómina 25–31 may** con el cálculo nuevo (incidencias resta/no resta, retardo en
  horas, sin prima vacacional, préstamo 10%). Comparar montos contra lo esperado por contabilidad.
- 📊 **Dashboard de KPIs de incidencias** (fase F5): ya existe la vista `nomina.v_incidencias`
  (días por código + HE + retardo por semana/empleado) lista para consumir.
- 🏖️ **F4 Vacaciones**: cálculo de saldo por antigüedad (helpers `diasVacacionesLFT`/`antiguedadAnios`
  en `calc.ts` ya existen). La prima vacacional se quitó del neto a propósito.

**Datos a confirmar con el usuario (posibles errores del Excel):**
- **Miguel Angel Villalobos**: quedó **sin NOMEX** (el Excel traía "-").
- **NOMEX 57 duplicado**: Alfredo Flores y Yunnuen Torres lo comparten.
- **Alejandro Abaroa**: su sueldo real se fijó en **25,632** (el Excel; antes la BD tenía 35,000).

**Hallazgos de cálculo viejos — YA RESUELTOS:** retardos (ahora por hora), quincenal (factor 2/13 +
sueldo por periodo), prima vacacional (quitada), SDI (existe vía movimientos de sueldo).

## Roadmap RH / Nómina (propuesto, por fases)

- **F0 — Rediseño visual tipo CRM:** portar tokens y componentes del CRM (`CRM PML`) a este app
  (sidebar navy + topbar, paleta ink/navy/blue, Geist, `.btn/.card/.field-input/.tbl/.badge/.kpi`).
- **F1 — Catálogo de empleados:** formulario casi pantalla completa; **ocultar sueldos/infonavit**
  de la vista; **toggle "Alta IMSS"** (apagado = todo efectivo; prendido = transferencia + vales);
  filtros **Activos / Bajas / Todos**; empleados dados de baja en gris.
- **F2 — Modelo de sueldos por movimientos + botón SUELDO:** tabla de movimientos
  (Alta / Modificación de sueldo / Baja) con Fecha inicio, Fecha fin, Sueldo diario y SDI;
  el último vigente es el que calcula. Botón **SUELDO** protegido con contraseña. Dar de baja desde ahí.
- **F3 — Nóminas por esquema:** al crear nómina semanal/quincenal, incluir solo los empleados
  de ese esquema (`esquema_pago`). Arreglar cálculo quincenal.
- **F4 — Vacaciones:** cálculo por antigüedad (LFT 2023: 12 días el 1er año, +2 hasta 20, luego
  +2 cada 5 años); saldo por empleado; al capturar V en una nómina se descuenta del saldo; prima 25%.
- **F5 — Dashboard KPIs:** faltas, asistencias, vacaciones, suspensiones, permisos c/ y s/ goce,
  tiempo x tiempo, horas extra.
- **F6 — Revisión de cálculos + pruebas:** aplicar fixes (retardos, faltas, quincenal) y validar.

### Ideas extra propuestas (a evaluar)
Aguinaldo (15 días LFT), finiquito/liquidación, recibo individual imprimible, reporte de
dispersión (banco / vales / efectivo), bitácora de incidencias por empleado.

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

### 2026-06-02 — F0: migración a Vite + TS + Tailwind (diseño tipo CRM)
- Migrado de Create React App a **Vite + TypeScript + Tailwind**, replicando el design
  system del **CRM PML**: shell con **sidebar navy + topbar**, paleta ink/navy/blue, fuente
  Geist, componentes `.btn/.card/.field-input/.tbl/.badge/.kpi`, Framer Motion.
- Router con React Router. Páginas en TSX: Login, Dashboard, Empleados (ficha + historial),
  Nóminas (lista + detalle con 6 pestañas), Préstamos, Viajes, Usuarios.
- Auth por Supabase (sesión + rol vía `usuarios_roles`). Env vars → `VITE_*`. `vercel.json`
  (framework vite, output `dist`, rewrites SPA).
- **Deploy:** se hizo el repo **público** para destrabar el bloqueo de Vercel (ver sección
  Repositorio). Producción sirve la app nueva en https://nomina-empresa.vercel.app.
- Pendiente de seguir: F1 (catálogo: toggle Alta IMSS, ocultar sueldos, filtros), F2
  (sueldos por movimientos + botón SUELDO), F3 (nóminas por esquema), F4 (vacaciones),
  F5 (dashboard KPIs), F6 (revisión de cálculos).

### 2026-06-02 — F1: Catálogo de empleados
- Nueva columna `empleados.alta_imss` (bool). Toggle **Alta IMSS** por empleado en la tabla
  y en el formulario (apagado = todo efectivo; prendido = transferencia + vales). Su efecto
  en el cálculo de distribución del pago se aplicará en F2/F6.
- Se **ocultaron sueldos/infonavit** del catálogo (columnas de tabla y sección del formulario).
  La gestión de sueldos + historial pasa a la pantalla protegida **SUELDO** (F2).
- Formulario de empleado casi a pantalla completa (modal 96vw / máx 1180px).
- Filtros Activos / Bajas / Todos (bajas se muestran en gris).

### 2026-06-02 — F2: Sueldos por movimientos + botón SUELDO
- Nueva tabla `empleado_sueldo_movimientos` (tipo alta/modificacion/baja, fecha_inicio,
  fecha_fin, sueldo_diario_real, sueldo_diario_fiscal, sdi, factor_integracion, nota, usuario).
  El **último vigente** (fecha_fin NULL, tipo ≠ baja) es el que calcula.
- Botón **SUELDO** por empleado, protegido con **contraseña** (re-autenticación del usuario
  logueado vía `reauth` en `lib/auth`). Pantalla `SueldoModal` con resumen (real/fiscal/SDI),
  historial de movimientos, alta/modificación y **dar de baja**.
- **SDI** = sueldo diario fiscal × factor de integración IMSS `(365 + 15 + díasVac×0.25)/365`
  (helpers en `lib/calc.ts`: `factorIntegracionSDI`, `calcSDI`, `diasVacacionesLFT`, `antiguedadAnios`).
- **Puente con el cálculo actual:** al guardar un movimiento se sincroniza
  `empleados.sd_real` y `sd_fiscal` (= sueldo diario × 7), para que `calcularNomina` (semanal)
  siga funcionando sin cambios. La refactorización del cálculo a base diaria queda para F6.

### 2026-06-02 — Ajustes catálogo + descuentos permanentes + densidad
- **Fix:** el candado de sueldos autocompletaba la barra de búsqueda del catálogo. La búsqueda
  va en un `<form autoComplete="off">` y el candado tiene un campo usuario oculto (`username`).
- Se quitó el botón **Alta/Baja** del catálogo: las altas/bajas se hacen desde la pantalla
  **Sueldo** (re-alta vuelve a activar y queda en el historial de movimientos).
- Nuevo botón **Ver** (tarjeta de detalle solo lectura, con botón Editar).
- **Alta IMSS:** prender es libre; **apagar requiere autorización** (contraseña).
- Nueva tabla `empleado_descuentos` (Infonavit, Fonacot, pensión, etc.) con vigencia e
  **historial**, gestionada en la pantalla Sueldo. El Infonavit vigente se sincroniza a
  `empleados.infonavit` para el cálculo.
- **Densidad reducida** en todo el UI (fuentes/paddings) para scrollear menos.

### 2026-06-02 — F3: Nóminas por esquema (semanal / quincenal)
- Al crear una nómina, solo se incluyen los empleados activos de **ese** esquema
  (`empleados.esquema_pago` = Semanal/Quincenal). El detalle de nómina también filtra por esquema.
- El esquema se elige con botones (Semanal/Quincenal) al crear la nómina, y como *select* en
  el alta del empleado (no se escribe a mano).
- Descuentos permanentes: el monto se etiqueta según el periodo del empleado
  ("Monto por quincena" / "Monto por semana").
- **Pendiente F6 (calc):** el "séptimo día" usa lógica semanal `min(días,6)/6`; para quincena
  debería ser proporcional (≈2 séptimos). El sueldo ya es diario (día × días trabajados escala
  bien al periodo); validar montos quincenales al hacer pruebas.

### 2026-06-02 — Comedor calendario + ajustes de captura
- **Comedor:** ahora es un **calendario** (lunes a viernes, con días en el encabezado; semana =
  5 días, quincena = ~10). Cada check se guarda por día en la tabla `comedor_registro`
  (para el reporte mensual al proveedor). El monto se sincroniza a `nominas.comedor`.
- **Cálculo del séptimo día:** ahora es proporcional (`díasQueCuentan / 6`), así la quincena
  da ≈2 séptimos en vez de 1.
- **Asistencias:** línea divisoria entre días + botón **"✓ Todos A"** por día (marca asistencia
  a todos y solo capturas las faltas).
- **Viajes:** al guardar/eliminar ahora se refleja de inmediato en el Resumen (callback al padre).
- **Resumen:** columnas **ID Toka** e **ID Banco** + encabezados ordenables (nombre, IDs, neto,
  depósito, efectivo).

### 2026-06-02 — Congelado de tablas, NOMEX con letra, regla quincena, recibo
- **Scroll:** clase `.tbl-freeze` congela el encabezado y la **columna de nombres** en
  asistencias y comedor (y quita una fila de encabezado en asistencias).
- **NOMEX con prefijo** según esquema: Quincenal → `Q-0000`, Semanal → `S-0000`
  (`nomexLabel` en `lib/format`). Se muestra en catálogo y tarjeta.
- **Cálculo quincena:** descansos pagados = `díasQueCuentan × 2/13` (13 laborables + 2
  descansos). Ej.: 10 días trabajados → 1.54 de descanso. Semanal sigue 1/6. `calcularNomina`
  ahora recibe el `tipo`.
- **Recibo / tarjeta de nómina:** clic en un empleado del Resumen abre el desglose completo
  (percepciones, deducciones, neto, distribución) con botón Imprimir.

### 2026-06-02 — Sueldo capturado por periodo (precisión)
- En la pantalla SUELDO ahora se captura el **sueldo del periodo**: "Sueldo quincenal real/fiscal"
  (quincenales) o "Sueldo semanal real/fiscal" (semanales). El **diario** se deriva dividiendo
  entre **15** (quincena) o **7** (semana), con 4 decimales de precisión.
- Tabla `empleado_sueldo_movimientos`: nuevas columnas `sueldo_periodo_real/fiscal`; los diarios
  y SDI pasan a `numeric(12,4)`; `empleados.sd_real/sd_fiscal` también a `numeric(12,4)`.
- El cálculo sigue usando el semanal-equivalente (`diario × 7`); el SDI se calcula sobre el
  diario fiscal. Esto evita el problema de decimales al capturar diarios "feos".

### 2026-06-02 — Descuento producto, bonos, vales/previsión, fiscal quincena, recibo
- Nuevas pestañas en el detalle de nómina: **Desc. producto** (monto + N° nota, tabla
  `nomina_descuento_producto`) y **Bonos** (monto + motivo Productividad mensual / Ventas,
  tabla `nomina_bono`). Se reflejan en el cálculo (bono = percepción, desc. producto = deducción).
- **Vales y previsión social** ahora se **capturan** en el alta de sueldo (sugerido 10% del
  fiscal del periodo); se guardan en el movimiento y en `empleados`. El cálculo los usa
  (antes los calculaba).
- **Fiscal por periodo:** el sueldo fiscal, vales y previsión se muestran/usan por periodo
  (quincena = ÷15 × 15), ya no en base semanal. `calcularNomina` expone `sueldoFiscalPeriodo`.
- **Recibo de nómina:** agrega Bono y Descuento de producto, y el detalle de **días con horas
  extra** y **viajes** (fecha, destino, rol, monto).
- **Resumen:** letra más chica y columnas nuevas **Bono** y **Desc. prod.** (préstamos ya estaba).

### 2026-06-02 — Bonos/desc. por empleado, sin-IMSS a efectivo, fiscal con NOMEX
- **Bonos** y **Desc. producto**: ahora es una lista de empleados con botón **"+"** por fila
  que abre un modal para capturar monto + motivo/N° nota y ver/eliminar los registrados.
- **Vales de despensa** agregado al resumen de la pantalla de Sueldo.
- **Sin Alta IMSS** (switch apagado): todo el sueldo va a **efectivo**, no hay vales ni depósito,
  y solo cuenta el sueldo real (lógica en `calcularNomina`). En la pestaña **Fiscal** esos
  empleados salen **en gris** ("Sin Alta IMSS — todo a efectivo").

### 2026-06-02 — Schema `nomina`, fix retardos, comedor 10 días, Retroactivos
- **Base de datos → schema `nomina`:** las **14 tablas de nómina** se movieron de `public` a un
  schema dedicado **`nomina`** (separadas del WMS, que se queda en `public`; el CRM ya usaba su
  schema `crm`). Se verificó que ninguna FK ni RLS cruza entre apps. `get_user_rol()` ahora apunta
  a `nomina.usuarios_roles` (SECURITY DEFINER, `search_path = nomina, public`). Schema expuesto en
  la API (`pgrst.db_schemas = public,crm,storage,graphql_public,nomina`).
  - **Cliente front:** `createClient(..., { db: { schema: 'nomina' } })` en `lib/supabase.ts` →
    todos los `.from()` resuelven a `nomina.*` sin cambiar cada llamada.
  - **Edge function `admin-users`:** su cliente service-role usa `db: { schema: 'nomina' }` (v2).
- **Fix cálculo retardos:** `retardoMonto` ahora es `horas × (dDR/8)` (valor por hora), antes era
  `horas × dDR` (día completo → ~8× de más). `lib/calc.ts`.
- **Comedor en quincena = 10 días:** el calendario de comedor se limita a 10 hábiles en quincenal
  (el 11º, p.ej. el 15, pasa a la otra quincena). El conteo/monto solo cuenta días visibles.
  `tabs/TabComedor.tsx`.
- **Nuevo apartado Retroactivos** (`tabs/TabRetroactivos.tsx`): viajes/HE de **otro periodo**
  pagados en esta nómina. Tabla **`nomina_retroactivo`** (tipo viaje/horas_extra, periodo_origen,
  descripcion, monto). Es **percepción**: `calcularNomina` recibe `retroactivo` y lo suma; aparece
  en el recibo y en una columna **Retro.** del Resumen. Captura por empleado con botón **"+"**.

### 2026-06-02 — Retroactivos rediseñados (viajes en Viajes, HE retro, validación día)
- **Viajes retroactivos:** se dan de alta en la pantalla **Viajes**, no en una hoja aparte. Regla
  de fecha al guardar: dentro del periodo = normal; **hasta 7 días antes** del inicio = avisa y, si
  aceptas, se marca `viajes.retroactivo=true` (badge **Retro** en la lista); fecha más vieja o
  posterior al periodo = **bloqueada**. El incentivo de un viaje retro **no** cuenta en el bucket
  Viajes sino en **Retroactivo** (columna **Retro.** del Resumen).
- **HE retroactivas:** la hoja antes "Retroactivos" ahora es **"HE retro"**: capturas **horas +
  propósito** (MOTIVOS_TE) y el monto = `horas × valor hora × 2` se **suma al total de Horas extra**
  (no a un bucket aparte). Se guarda en `nomina_retroactivo.horas` (nueva columna).
- **Validación viaje ↔ HE el mismo día (ambos sentidos):** al guardar un **viaje** en un día con
  horas extra del chofer/acompañante → "PARA ESTE DÍA … tiene horas extra, ¿seguro que llegó a la
  hora del viaje?"; al capturar **HE** en un día que ya tiene viaje → "este día ya tiene un viaje
  que llegó a las …, ¿seguro?". Aceptar = guarda igual.
- **calc:** `calcularNomina` recibe `retroactivo` (incentivo viaje retro → bucket Retroactivo) y
  `horasExtraRetro` (→ se suma a `te`). Expone `te`, `teRetro`, `teRetroHrs`.
- **DB (aditivo):** `viajes.retroactivo` (bool) y `nomina_retroactivo.horas` (numeric).

### 2026-06-02 — HE retro → Retroactivo, día de la semana anterior, alta masiva de sueldos
- **HE retro suma a Retroactivo, no a Horas extra:** `calc` expone `retroactivoTotal = retroactivo
  (viaje) + teRetro (HE retro)`; el Resumen muestra ese total en la columna **Retro.** y deja
  **T. extra** solo con las HE normales. El recibo separa "Retroactivo · viajes" y "Retroactivo ·
  horas extra".
- **HE retro: día con calendario (semana anterior):** en la pestaña **HE retro** el campo
  "periodo de origen" se reemplazó por un **selector de fecha** limitado a los 7 días previos al
  inicio del periodo (`min`/`max`). Se guarda en `nomina_retroactivo.periodo_origen` (ISO).
- **Alta masiva de sueldos (32 empleados):** cargados desde `EMPLEADOS_SUELDOS.xlsx` replicando la
  pantalla SUELDO: por empleado se cerró la vigencia previa, se insertó un movimiento de **alta**
  (sueldo periodo real/fiscal, diario ÷15/÷7, SDI por antigüedad, vales, previsión) y se sincronizó
  la ficha (`sd_real/sd_fiscal` = diario×7, vales, previsión, **ID Toka/Banco/NOMEX**, esquema).

### 2026-06-02 — Cambios de forma (orden por ID Banco, columnas, asistencias)
- **Orden por ID Banco por defecto** en TODAS las listas de empleados (menor→mayor): Resumen,
  Asistencias, Comedor, Bonos, Desc. producto, HE retro, Viajes (selects), Préstamos y catálogo
  (`NominaDetallePage` carga `empleados` ordenados por `id_banco`; Resumen/Asistencias tienen su
  propio sort con default id_banco).
- **Fiscal** ordena por defecto por **ID NOMEX** ascendente.
- **Resumen:** se quitó la columna **ID Toka**; **ID Banco** va antes del nombre; se quitaron las
  columnas **Asist.** y **7mo día** de la tabla — ahora se muestran **combinadas en un solo valor
  ("Asistencias + séptimo día") solo en la tarjeta de nómina** (recibo).
- **Asistencias:** ID Banco a la izquierda del nombre (misma celda congelada) + orden clicable;
  botón **"✓ Todos A"** ahora junto al día; etiquetas **Cód / Ret / T.E. / Mot** sobre los inputs;
  en **domingos** el botón es **"✓ Todos D"** (marca descanso) en vez de Todos A.
- **Orden de pestañas:** Resumen · Asistencias · Viajes · Comedor · Fiscal · HE retro ·
  Desc. producto · Bonos · Préstamos.

### 2026-06-02 — Motivos HE, retardo en horas, fiscal, bonos permanentes, préstamos
- **Motivos de horas extra:** agregados **Junta, Planta, Desayuno** a `MOTIVOS_TE`.
- **Inputs numéricos sin flechas (spinners)** en toda la app (CSS global `appearance: none`).
- **Retardo (fix de cálculo):** el campo se captura en **horas**; el monto = `(sd_real/7/8) ×
  horas` (antes dividía entre 60 tratándolo como minutos). `calc.ts` ya no divide `/60`.
- **Fiscal:** se corrigió que al cambiar de pestaña y volver se borraba lo capturado (ISR/IMSS/
  depósito). Ahora `update` también sincroniza el objeto `nominas` en memoria.
- **Leyenda de incidencias** en Asistencias: explica qué **resta** (D, PSG, SUS) y qué **no resta**
  (A, F, V, PCG, TXT) — todo queda en el historial.
- **Bonos permanentes:** nuevas tablas `bono_permanente` y `bono_permanente_excluido`. Aplican por
  default en cada nómina (se suman al bucket Bono); en la pestaña **Bonos** se pueden **quitar del
  periodo** (toggle "Aplica este periodo" → exclusión por semana) o **quitar por completo**
  (activo=false). UI con dos secciones: permanentes y bonos de este periodo.
- **Préstamos:**
  - **Quincenal ahora descuenta 10%** (igual que semanal); `descuentoPrestamoMonto` y todas las
    vistas/etiquetas actualizadas.
  - **Abonos fuera de nómina:** botón **Abonar** en Préstamos reduce el saldo y lo registra en
    `prestamo_descuentos` (nomina/semana NULL); el descuento por nómina sigue siendo 10% del monto.
  - Alta de 3 préstamos a medias (María Isabel 5000/saldo 1500, Joselyn 6000/2400, Claudia
    3000/1200), semanal, fecha 2026-05-01 para que descuenten en la nómina del 25–31 may.

### 2026-06-02 — Cálculo por incidencia (resta/no resta) + KPIs
- **Tratamiento de pago por código** (regla del usuario): **NO restan / se pagan (asistencia):**
  A, **D**, V, PCG, TXT. **Restan / no se pagan (falta):** **F**, PSG, SUS.
- En `calcularNomina`: `COD_PAGA = [A,V,PCG,TXT]` se pagan a tarifa diaria y cuentan para el
  séptimo; `COD_FALTA = [F,PSG,SUS]` no se pagan. El **Descanso (D)** se paga vía el séptimo día
  (por eso no entra en `asistMonto`, para no duplicar). Antes solo se pagaba 'A' (V/PCG/TXT no
  recibían el día base) → corregido.
- **KPIs:** `calc` devuelve `incidencias` (conteo por código) y `diasD`. El detalle por día sigue
  en `asistencias`; nueva **vista `nomina.v_incidencias`** (días por código + HE + retardo, por
  semana/empleado) lista para el dashboard de incidencias (F5).
- Leyenda de Asistencias corregida (F = resta, D = no resta).
- **Fiscal:** agregada la columna **ID NOMEX** con orden por ese ID.

### 2026-06-03 — F5: Dashboard visual (rediseño) de KPIs
- **`DashboardPage.tsx`** rediseñado a un panel **visual y espaciado, con gráficas de barras en CSS**
  (sin librerías nuevas). Filtro global por **Mes** (select que lista los meses con datos, el más
  reciente por defecto; soporta automáticamente meses futuros cuando lleguen).
  - **Incidencias del mes** — tarjetas grandes (Faltas, Retardos, Horas extra, Vacaciones, Permiso
    c/goce, Permiso s/goce); al pulsar una se **despliega quién** (lista de empleados con su conteo).
  - **Destinos más visitados** y **Choferes que más viajaron** (barras horizontales, top 6).
  - **Motivos de horas extra** (barras, desde `asistencias.te_motivo`).
  - **Comedor**: comidas servidas + personas distintas del mes.
  - **Préstamos activos**: barra de avance (% pagado) + saldo por empleado + saldo total.
  - Pie de página con 4 KPIs generales (activos, viajes del mes, HE del mes, saldo préstamos).
- Datos: consulta directa a `asistencias` (vía `nominas` para mapear empleado), `viajes`,
  `comedor_registro` y `prestamos`; se agrupan por mes (`fecha`) en el cliente. Numéricos
  coercionados con `Number()`. **Nota:** hoy solo hay datos de **mayo 2026** (semana 25–31 may);
  junio aparecerá en el selector cuando se capture. Typecheck `tsc --noEmit` limpio.

### 2026-06-03 — UI: sidebar más delgado + contenido a ancho completo
- `--sidebar-w` 248 → **200px** y `.content` sin `max-width` (era 1400px) ni centrado → el área de
  trabajo usa todo el ancho disponible. Solo CSS (`src/index.css`).

### 2026-06-03 — Cálculo: vales/previsión prorrateados + depósito fiscal calculado + corregido
- **Vales y previsión social** dejan de ser monto fijo: se **prorratean** por asistencias pagadas
  (`base × (díasQueCuentan + séptimo) / díasPeriodo`). En semana/quincena completa → monto íntegro.
- **Depósito fiscal CALCULADO** (antes se capturaba `deposito_total`): `sueldoFiscalPeriodo + vales +
  previsión − todas las deducciones (ISR e IMSS incluidos)`. El sueldo fiscal va completo (faltas no
  lo reducen).
- **Depósito corregido:** nueva columna `nomina.deposito_corregido` (numeric, NULL = usar el fiscal).
  Casilla editable en la pestaña Fiscal (default = fiscal; botón ↺ para quitar la corrección). Es el
  valor que se usa para banco y efectivo cuando no coincide con el sistema de timbrado.
- **Distribución:** `efectivo = neto − dep_corregido`; `dep_banco = dep_corregido − vales`. El `neto`
  no cambió (ya excluía vales/previsión y ISR/IMSS).
- **Tab Fiscal:** se quitaron la columna *Prev. social* y el input *Dep. total*; se agregaron
  *Dep. fiscal* (calculado en vivo con el ISR/IMSS de la fila) y *Dep. corregido* (editable). El
  **recibo** ahora muestra bloque "Parte fiscal" (sueldo fiscal, previsión, vales, ISR, IMSS, depósito
  fiscal) + distribución (corregido, vales, banco, efectivo). `lib/calc.ts`, `TabFiscal.tsx`,
  `TabResumen.tsx`. `deposito_total` queda en desuso. Validado con el ejemplo de María Joselyn
  (neto 1,398.10 · dep. fiscal 1,194.82 · corregido 821.49 · banco 634.82 · efectivo 576.60).

### 2026-06-03 — Ajustes UX: viajes editables, sync empleados, préstamos, filtros, impresión
- **Viajes editables** (`ViajesPage`): botón ✏️ por fila carga el viaje al formulario; al actualizar
  **pide confirmación** ("¿Modificar este viaje? Se recalcularán los incentivos"). Antes solo se podían
  borrar y recapturar. Chofer/Acompañante **solo listan personal de `Logistica/Almacen`**.
- **Empleado agregado tarde** (`NominaDetallePage`): al abrir una nómina **abierta** se crean en
  automático las filas de `nominas` faltantes para empleados activos del esquema → ya aparecen en
  Asistencias y Comedor (antes solo salían en Resumen).
- **Préstamos** (`PrestamosPage`): clic en un préstamo abre **desglose de pagos** (tabla
  `prestamo_descuentos`: fecha, concepto Nómina<periodo>/Abono fuera de nómina, abono, saldo
  anterior→posterior) + KPIs monto/abonado/saldo.
- **Asistencias**: filtros por **área** (botones arriba; "Todos A/D" respeta el filtro).
- **Dep. corregido en rojo**: en Fiscal (input y valor) y en el recibo del Resumen.
- **Impresión** (`TabResumen` + nuevo `tabs/printNomina.ts`): el botón Imprimir es un menú con 3
  formatos que abren ventana e imprimen: **Resumen general**, **Dispersión bancaria** (ID Banco +
  nombre + importe a depositar + total) y **Dispersión vales/efectivo** (dos listados con totales).
  Encabezado con empresa, periodo, fecha y firmas (Elaboró/Revisó/Autorizó).
- **Confirmado (sin cambio):** el descuento de préstamo por nómina solo se aplica al **Guardar**
  la nómina (no antes). PIN maestro para desbloquear = `VITE_MASTER_PIN` (1424798).

### 2026-06-03 — Impresiones/Exportaciones de nómina (formatos)
- Reescrito `tabs/printNomina.ts`. El menú "Imprimir / Exportar" del Resumen ofrece:
  - **Incidencias** (carta **horizontal**): matriz empleado × día con Asist (coloreado por código) / R
    (retardo) / T.E.
  - **Viajes y horas extra** (carta vertical): tabla de viajes (fecha, destino, cliente, vehículo,
    chofer, acompañante, horas) + tabla de **horas extra** (incluye **HE retroactivas** marcadas
    "(retro)", desde `nomina_retroactivo`) + resúmenes **Chofer** y **Acompañante** (viajes + dinero).
  - **Dispersión** (carta horizontal, con firmas): columnas en este orden — ID Banco · Empleado ·
    **Sueldo** (asistencia+séptimo) · Préstamo · Comedor · Desc. Producto · Infonavit · Falta/Retardo
    (=descuento retardos; faltas ya van en el sueldo) · Bono · Retroactivo · **Extra** (horas extra +
    incentivos de viajes) · Neto · Dep. Banco · Efectivo. Deducciones en rojo. Reconcilia con el neto.
  - **Vales — Excel (CSV)**: descarga `vales_easyvale_<periodo>.csv` con columnas **ID** (26260, cuenta
    de vales, constante) · **NOMINA** (= `id_toka` del empleado) · **MONTO** (vales prorrateados) ·
    **PRODUCTO** (EASYVALE CHIP, constante). Solo empleados con vales>0; avisa si alguno no tiene ID Toka.
  - **Dispersión banco**: pendiente (el usuario la definirá después).
- Impresión: abre ventana nueva con HTML propio (encabezado empresa/periodo/fecha) y `window.print()`
  (requiere permitir pop-ups). El CSV lleva BOM UTF-8 para acentos en Excel.

### 2026-06-03 — Impresión: colores + cruce viaje/HE
- Impresión ahora respeta **colores y fondos** (`print-color-adjust: exact`) para que el papel/PDF
  salga igual que la vista generada (códigos de incidencia, encabezados, deducciones en rojo).
- En "Viajes y horas extra" se agregó, **debajo de la tabla de viajes**, la sección **"⚠ Mismo día
  con viaje y horas extra"**: cruza viajes (chofer/acompañante) con HE de `asistencias` por
  empleado+fecha (nombre, fecha, rol, destino·llegada, horas, motivo) para tenerlo mapeado.

### 2026-06-08 — Viajes (tabulador), exports .xlsx, comedor vie→jue, reporte fiscal, fix dup asistencias
- **Viajes — tabulador de 4 tramos** por hora de llegada: 7am-3pm 200/100 · 3pm-7pm 400/200 ·
  7pm-11pm 500/300 · **11pm-7am 600/400**. **"Se quedó a dormir"** = **último tabular + $100**
  (700/500) **+ el tabular de la hora de llegada del día siguiente** (ej. llega 8pm → 700/500 +
  500/300 = 1200/800). `DORMIR_EXTRA = 100` en `calc.ts`. (Antes hubo un tramo 1am-7am que se quitó.)
- **Exports a `.xlsx` reales** (dependencia **SheetJS `xlsx`** instalada desde el CDN 0.20.3):
  **Vales** (`ID·NOMINA·MONTO·PRODUCTO`) y nuevo **Depósito a banco** (`ID BANCO·NOMBRE·DEPOSITO`,
  solo quienes depositan >0). Antes eran CSV. Funciones `exportarValesXLSX` /
  `exportarDispersionBancoXLSX` en `printNomina.ts`.
- **Impresión Dispersión:** la columna **"Extra" se separó** en **Horas Extra** (`c.te`) y **Viajes**
  (`c.incentivos`); la columna **Dep. Banco** ahora muestra **banco + toka** (`depositoCorregido`),
  no solo el banco.
- **Comedor semanal → ventana viernes→jueves:** como la nómina cierra el **viernes** y ese día aún
  no se sabe el comedor, ese viernes pasa a la siguiente nómina y entra el **viernes anterior**
  (5 días: vie, lun, mar, mié, jue). **Quincenal sin cambios** (1–15 / 16–fin, máx 10).
- **Fix — asistencias duplicadas:** se encontró un caso (empleado agregado tarde + captura rápida)
  con **dos filas para el mismo día** → el cálculo contaba un día de más. Solución: **restricción
  única `asistencias (nomina_id, dia_index)`** + la captura ahora usa **upsert** (no insert), así no
  se duplica aunque el estado local no tenga el `id`.
- **Nuevo "Reporte fiscal"** (impresión, horizontal con firmas y totales, orden por ID NOMEX):
  **ID NOMEX · Nombre · Vales · Dep. Banco** (solo banco) **· Asistencia · Séptimo día** (estas dos
  **EN NÚMERO de días**, no dinero: semana completa = 6 y 1; séptimo días = `septimo/dDR`) **·
  Infonavit · Comedor · Retardos · Préstamo · Desc. Producto** (en dinero).

<!-- Ir agregando aquí cada modificación nueva: fecha — qué se cambió y por qué. -->
