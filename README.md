# Sistema de Nómina — Guía de instalación

## Paso 1: Crear cuenta en Supabase (gratis)

1. Ve a https://supabase.com y crea una cuenta con Google
2. Crea un nuevo proyecto (ponle el nombre que quieras, ej: "nomina-empresa")
3. Guarda la contraseña del proyecto
4. Espera ~2 minutos a que se inicialice

## Paso 2: Configurar la base de datos

1. En tu proyecto Supabase, ve a **SQL Editor** (ícono de base de datos)
2. Copia todo el contenido del archivo `supabase_schema.sql`
3. Pégalo en el editor y presiona **Run**
4. Esto crea todas las tablas y carga los 31 empleados

## Paso 3: Activar login con Google

1. En Supabase ve a **Authentication → Providers → Google**
2. Actívalo y sigue las instrucciones para crear credenciales en Google Cloud Console
   - Ve a https://console.cloud.google.com
   - Crea un proyecto nuevo
   - Ve a "APIs & Services → Credentials → Create OAuth Client ID"
   - Tipo: Web application
   - Authorized redirect URIs: `https://TU_PROYECTO.supabase.co/auth/v1/callback`
3. Copia el Client ID y Client Secret a Supabase

## Paso 4: Obtener las claves de Supabase

1. Ve a **Settings → API** en tu proyecto Supabase
2. Copia:
   - `Project URL` → va en REACT_APP_SUPABASE_URL
   - `anon public key` → va en REACT_APP_SUPABASE_ANON_KEY

## Paso 5: Configurar el proyecto

1. Copia el archivo `.env.example` y renómbralo a `.env`
2. Pega tus claves:
```
REACT_APP_SUPABASE_URL=https://abcdefgh.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...
```

## Paso 6: Subir a Vercel (gratis)

1. Ve a https://vercel.com y crea cuenta con Google
2. Instala Vercel CLI: `npm install -g vercel`
3. En la carpeta del proyecto ejecuta: `vercel`
4. Sigue los pasos del wizard
5. En Vercel → Settings → Environment Variables agrega las mismas variables del .env

O más fácil: sube el código a GitHub y conecta el repo en Vercel.

## Paso 7: Primer acceso y dar permisos

1. Abre la URL de tu app en Vercel
2. Inicia sesión con tu Google
3. Como primer usuario, ve directo a Supabase → Table Editor → usuarios_roles
4. Busca tu registro y cambia `rol` a `admin` manualmente
5. A partir de ahí puedes dar acceso a los demás desde la app

## Roles del sistema

| Rol | Permisos |
|-----|----------|
| admin | Todo: empleados, nómina, viajes, usuarios |
| editor | Captura nóminas, asistencias, viajes |
| viewer | Solo lectura |

## Estructura del proyecto

```
src/
  lib/supabase.js     → Cliente Supabase y funciones de cálculo
  pages/
    Login.js          → Login con Google
    Main.js           → Navegación principal
    Nomina.js         → Lista y detalle de nómina por empleado
    Viajes.js         → Panel de viajes
    Empleados.js      → Catálogo de empleados
    Usuarios.js       → Gestión de permisos
  App.js              → Root con autenticación
  App.css             → Estilos
supabase_schema.sql   → Base de datos completa
```
