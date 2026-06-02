import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Faltan variables: define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
}

// Auth por email/contraseña → persistimos la sesión.
// Todas las tablas de la app viven en el schema `nomina` (separado del WMS, que usa `public`).
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: 'nomina' },
});
