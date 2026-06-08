import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, toISO } from '@/lib/format';

const COSTO = 30;
const DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function TabComedor({ semana, nominas, empleados, canEdit }: any) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set()); // "nomId|fecha"
  const [loading, setLoading] = useState(true);

  // Días hábiles (lunes a viernes) del comedor.
  function diasHabiles() {
    const out: Date[] = [];
    const ini = new Date(semana.fecha_inicio + 'T12:00:00');

    if (semana.tipo === 'quincenal') {
      // Quincena: días hábiles del periodo (1–15 o 16–fin), máx 10. El 11º pasa a la otra quincena.
      const fin = new Date(semana.fecha_fin + 'T12:00:00');
      for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow >= 1 && dow <= 5) out.push(new Date(d));
      }
      return out.slice(0, 10);
    }

    // Semanal: la nómina cierra el VIERNES, así que ese día aún no se sabe el comedor → pasa a la
    // siguiente nómina. El comedor corre del VIERNES anterior al lunes hasta el JUEVES de la semana
    // (p.ej. nómina lun 1–dom 7 → comedor vie 29, lun 1, mar 2, mié 3, jue 4 = 5 días).
    const start = new Date(ini); start.setDate(ini.getDate() - 3); // viernes anterior al lunes
    const end = new Date(ini); end.setDate(ini.getDate() + 3);     // jueves de la semana
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) out.push(new Date(d));
    }
    return out;
  }
  const dias = diasHabiles();
  const fechasValidas = new Set(dias.map((d) => toISO(d)));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('comedor_registro').select('nomina_id,fecha').eq('semana_id', semana.id);
      const s = new Set<string>();
      (data || []).forEach((r: any) => s.add(`${r.nomina_id}|${r.fecha}`));
      setMarcados(s);
      setLoading(false);
    })();
  }, [semana.id]);

  function countNom(nomId: string, set: Set<string>) {
    let n = 0;
    set.forEach((k) => {
      const [id, fecha] = k.split('|');
      if (id === nomId && fechasValidas.has(fecha)) n++;
    });
    return n;
  }

  async function toggle(empId: string, nomId: string, fecha: string) {
    if (!canEdit) return;
    const key = `${nomId}|${fecha}`;
    const next = new Set(marcados);
    const checked = next.has(key);
    if (checked) next.delete(key); else next.add(key);
    setMarcados(next);

    try {
      if (checked) await supabase.from('comedor_registro').delete().eq('nomina_id', nomId).eq('fecha', fecha);
      else await supabase.from('comedor_registro').insert({ semana_id: semana.id, nomina_id: nomId, empleado_id: empId, fecha });
      // Sincroniza el monto de comedor en la nómina (para el cálculo).
      const monto = countNom(nomId, next) * COSTO;
      if (nominas[empId]) nominas[empId].comedor = monto;
      await supabase.from('nominas').update({ comedor: monto }).eq('id', nomId);
    } catch (err) { console.error(err); }
  }

  let totalDias = 0;
  marcados.forEach((k) => { if (fechasValidas.has(k.split('|')[1])) totalDias++; });

  return (
    <div>
      <p className="muted text-sm" style={{ marginTop: 0 }}>
        Marca los días que cada empleado usó el comedor (solo lunes a viernes). Costo por día: <strong>{fmt(COSTO)}</strong>. Queda registrado por día para el reporte mensual.
      </p>
      {loading ? <div className="empty"><span className="spinner" /></div> : (
        <div className="card tbl-freeze">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>Empleado</th>
                {dias.map((d, i) => (
                  <th key={i} className="center" style={{ borderLeft: '1px solid var(--ink-200)' }}>
                    {DIAS_C[d.getDay()]}<br /><span className="muted">{d.getDate()} {MESES_C[d.getMonth()]}</span>
                  </th>
                ))}
                <th className="right">Días</th>
                <th className="right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp: any) => {
                const nom = nominas[emp.id];
                if (!nom) return null;
                const n = countNom(nom.id, marcados);
                return (
                  <tr key={emp.id}>
                    <td><div className="fw-600">{emp.nombre}</div><div className="text-xs muted">{emp.area}</div></td>
                    {dias.map((d, i) => {
                      const fecha = toISO(d);
                      const on = marcados.has(`${nom.id}|${fecha}`);
                      return (
                        <td key={i} className="center" style={{ borderLeft: '1px solid var(--ink-100)' }}>
                          <input type="checkbox" checked={on} disabled={!canEdit} onChange={() => toggle(emp.id, nom.id, fecha)} style={{ width: 17, height: 17, cursor: canEdit ? 'pointer' : 'default', accentColor: 'var(--blue-500)' }} />
                        </td>
                      );
                    })}
                    <td className="right mono fw-600">{n}</td>
                    <td className={`right mono ${n > 0 ? 'neg' : 'zero'}`}>{n > 0 ? '-' + fmt(n * COSTO) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: 'var(--ink-50)', fontWeight: 700 }}>
                <td>Total</td>
                <td colSpan={dias.length} className="right">{totalDias} comidas</td>
                <td className="right mono">{totalDias}</td>
                <td className="right mono neg">-{fmt(totalDias * COSTO)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
