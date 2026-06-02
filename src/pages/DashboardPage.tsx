import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt } from '@/lib/format';
import { PageEnter } from '@/components/motion';
import { useAuth } from '@/lib/auth';

export function DashboardPage() {
  const { user } = useAuth();
  const [k, setK] = useState({ empleados: 0, activos: 0, nominasAbiertas: 0, saldoPrestamos: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [emp, sem, pres] = await Promise.all([
        supabase.from('empleados').select('id,activo'),
        supabase.from('semanas').select('id,status').eq('status', 'abierta'),
        supabase.from('prestamos').select('saldo').eq('activo', true),
      ]);
      const empleados = emp.data || [];
      setK({
        empleados: empleados.length,
        activos: empleados.filter((e: any) => e.activo).length,
        nominasAbiertas: (sem.data || []).length,
        saldoPrestamos: (pres.data || []).reduce((s: number, p: any) => s + (p.saldo || 0), 0),
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Empleados activos', value: loading ? '—' : String(k.activos) },
    { label: 'Total empleados', value: loading ? '—' : String(k.empleados) },
    { label: 'Nóminas abiertas', value: loading ? '—' : String(k.nominasAbiertas) },
    { label: 'Saldo en préstamos', value: loading ? '—' : fmt(k.saldoPrestamos) },
  ];

  return (
    <PageEnter>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hola, {user?.nombre?.split(' ')[0]}</h1>
          <p className="page-subtitle">Resumen de Recursos Humanos</p>
        </div>
      </div>
      <div className="grid grid-4">
        {cards.map((c) => (
          <div key={c.label} className="kpi">
            <span className="kpi-label">{c.label}</span>
            <span className="kpi-value">{c.value}</span>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-body">
          <p className="muted" style={{ margin: 0 }}>
            El dashboard con KPIs detallados (faltas, asistencias, vacaciones, suspensiones, permisos, horas extra) llega en la fase F5.
          </p>
        </div>
      </div>
    </PageEnter>
  );
}
