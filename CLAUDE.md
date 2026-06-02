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

## Trabajar desde otra computadora (setup nuevo)

```bash
git clone https://github.com/pmlconect94/nomina-empresa.git
cd nomina-empresa
npm install

# Recrear el .env (NO está en git). Bajarlo de Vercel:
npx vercel link            # elegir team ddlpml2-6030s-projects / proyecto nomina-empresa
npx vercel env pull .env   # crea .env con VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_MASTER_PIN

npm run dev
```

> El `.env` (con la anon key y el PIN) se obtiene de Vercel con `vercel env pull`.
> No se guardan valores reales en este repo (es público).

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

## Revisión de cálculos (hallazgos 2026-06-02, pendientes de validar con contabilidad)

Lógica en `lib/supabase.js → calcularNomina`. Esquema **dual**: `sd_fiscal` (lo declarado a IMSS)
y `sd_real` (lo que realmente se paga). Hallazgos a revisar antes de hacer pruebas:

1. **Retardos sobre-cobrados:** `retardo_min/60 * dDR` multiplica horas por el salario **diario**,
   no por el por-hora. Debería ser `horas * (dDR/8)`. Hoy un retardo cuesta ~8× de más.
2. **Columna "Faltas" cosmética:** en `TabResumen` muestra `diasF * dDR` en negativo, pero esa
   resta **no** se aplica al neto (las faltas ya no se pagan porque solo se paga 'A'). Confunde.
3. **Quincenal con matemática semanal:** `sd/7` y séptimo `min(días,6)/6` son de semana. En
   quincenal el 7mo día y etiquetas de día salen mal.
4. **Prima vacacional fiscal** se calcula (`primaFiscal`) pero no se usa; solo entra la efectiva.
5. **SDI (Salario Diario Integrado)** aún no existe; se introduce con el modelo de movimientos.

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
- **Fiscal:** agregada la columna **ID NOMEX** con orden por ese ID.

<!-- Ir agregando aquí cada modificación nueva: fecha — qué se cambió y por qué. -->
