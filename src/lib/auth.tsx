import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type Rol = 'admin' | 'editor' | 'viewer';

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
};

type AuthContextValue = {
  user: Usuario | null;
  rolPendiente: boolean; // sesión activa pero sin rol asignado
  loading: boolean;
  signOut: () => Promise<void>;
  reauth: (password: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [rolPendiente, setRolPendiente] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  async function loadRol(userId: string, userEmail: string) {
    setEmail(userEmail);
    const { data } = await supabase.from('usuarios_roles').select('rol,nombre').eq('user_id', userId).single();
    if (data) {
      setUser({ id: userId, email: userEmail, nombre: data.nombre || userEmail, rol: data.rol as Rol });
      setRolPendiente(false);
    } else {
      setUser(null);
      setRolPendiente(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadRol(session.user.id, session.user.email || '');
      else { setLoading(false); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) loadRol(session.user.id, session.user.email || '');
      else { setUser(null); setRolPendiente(false); setLoading(false); setEmail(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    rolPendiente,
    loading,
    signOut: async () => { await supabase.auth.signOut(); },
    // Re-verifica la contraseña del usuario logueado (para el candado de Sueldos).
    reauth: async (password: string) => {
      if (!email) return false;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    },
  }), [user, rolPendiente, loading, email]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
