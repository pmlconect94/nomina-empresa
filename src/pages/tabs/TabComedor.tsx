import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt } from '@/lib/format';

const COSTO = 30;

export function TabComedor({ nominas, empleados, canEdit }: any) {
  const [dias, setDias] = useState<Record<string, number>>({});

  useEffect(() => {
    const init: any = {};
    empleados.forEach((emp: any) => {
      const nom = nominas[emp.id];
      if (nom) init[nom.id] = Math.max(0, Math.min(5, Math.floor((parseFloat(nom.comedor) || 0) / COSTO)));
    });
    setDias(init);
  }, [empleados, nominas]);

  async function set(empId: string, nomId: string, val: string) {
    let d = parseInt(val, 10); if (isNaN(d)) d = 0; d = Math.max(0, Math.min(5, d));
    setDias((p) => ({ ...p, [nomId]: d }));
    const monto = d * COSTO;
    if (nominas[empId]) nominas[empId].comedor = monto;
    await supabase.from('nominas').update({ comedor: monto }).eq('id', nomId);
  }

  const totalDias = Object.values(dias).reduce((a, b) => a + b, 0);

  return (
    <div>
      <p className="muted text-sm" style={{ marginTop: 0 }}>Máximo 5 días por empleado. Costo por día: <strong>{fmt(COSTO)}</strong>.</p>
      <div className="card tbl-wrap" style={{ maxWidth: 620 }}>
        <table className="tbl">
          <thead><tr><th>Empleado</th><th className="center">Días (0-5)</th><th className="right">A descontar</th></tr></thead>
          <tbody>
            {empleados.map((emp: any) => {
              const nom = nominas[emp.id]; if (!nom) return null;
              const d = dias[nom.id] ?? 0;
              return (
                <tr key={emp.id}>
                  <td><div className="fw-600">{emp.nombre}</div><div className="text-xs muted">{emp.area}</div></td>
                  <td className="center"><input className="field-input mono" type="number" min="0" max="5" value={d === 0 ? '' : d} placeholder="0" disabled={!canEdit} onChange={(e) => set(emp.id, nom.id, e.target.value)} style={{ width: 70, textAlign: 'center', margin: '0 auto' }} /></td>
                  <td className={`right mono ${d > 0 ? 'neg' : 'zero'}`}>{d > 0 ? '-' + fmt(d * COSTO) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr style={{ background: 'var(--ink-50)', fontWeight: 700 }}><td>Total</td><td className="center">{totalDias} días</td><td className="right mono neg">-{fmt(totalDias * COSTO)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
