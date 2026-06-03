import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CODIGOS_ASISTENCIA, MOTIVOS_TE, DIAS_SEMANA } from '@/lib/calc';
import { fmt, toISO } from '@/lib/format';

const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const COLOR: Record<string, string> = { A: '#EAF3DE', F: '#FCEBEB', D: '#F1EFE8', V: '#E6F1FB', PSG: '#FAEEDA', PCG: '#EEEDFE', TXT: '#E1F5EE', SUS: '#FCEBEB' };

export function TabAsistencias({ semana, nominas, empleados, asistencias, viajeDias, canEdit }: any) {
  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    const init: any = {};
    Object.entries(asistencias).forEach(([nomId, lista]: any) => lista.forEach((a: any) => { init[`${nomId}_${a.dia_index}`] = { ...a }; }));
    setLocal(init);
  }, [asistencias]);

  function dias() {
    const out: Date[] = [];
    const ini = new Date(semana.fecha_inicio + 'T12:00:00');
    const fin = new Date(semana.fecha_fin + 'T12:00:00');
    for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) out.push(new Date(d));
    return out;
  }
  const days = dias();
  const get = (nomId: string, i: number) => local[`${nomId}_${i}`] || null;

  // Poner "A" (asistencia) a todos los empleados en un día.
  async function llenarDiaA(i: number, fecha: string) {
    if (!canEdit) return;
    for (const emp of empleados) {
      const nom = nominas[emp.id];
      if (!nom) continue;
      const a = get(nom.id, i);
      if (a?.codigo) continue; // no pisar lo ya capturado
      await update(nom.id, i, fecha, 'codigo', 'A');
    }
  }

  async function update(nomId: string, i: number, fecha: string, campo: string, valor: any) {
    const key = `${nomId}_${i}`;
    const ex = local[key];
    // Validación: si este día ya tiene un viaje para el empleado, avisar al capturar HE.
    if (campo === 'te_horas' && (valor || 0) > 0 && (ex?.te_horas || 0) <= 0) {
      const hl = viajeDias?.[`${nomId}|${fecha}`];
      if (hl !== undefined) {
        const cuando = hl ? `que llegó a las ${hl}` : 'registrado';
        if (!confirm(`Este día ya tiene un VIAJE ${cuando}. ¿Seguro que también lleva horas extra?`)) return;
      }
    }
    const upd = { ...(ex || { nomina_id: nomId, dia_index: i, fecha, codigo: '', te_horas: 0, te_motivo: '', retardo_min: 0 }), [campo]: valor };
    setLocal((p) => ({ ...p, [key]: upd }));
    if (!asistencias[nomId]) asistencias[nomId] = [];
    const idx = asistencias[nomId].findIndex((a: any) => a.dia_index === i);
    if (idx >= 0) asistencias[nomId][idx] = upd; else asistencias[nomId].push(upd);
    try {
      if (ex?.id) await supabase.from('asistencias').update({ [campo]: valor }).eq('id', ex.id);
      else {
        const { data } = await supabase.from('asistencias').insert({ nomina_id: nomId, dia_index: i, fecha, codigo: campo === 'codigo' ? valor : '', te_horas: campo === 'te_horas' ? valor : 0, te_motivo: campo === 'te_motivo' ? valor : '', retardo_min: campo === 'retardo_min' ? valor : 0 }).select().single();
        if (data) { setLocal((p) => ({ ...p, [key]: { ...p[key], id: data.id } })); const j = asistencias[nomId].findIndex((a: any) => a.dia_index === i); if (j >= 0) asistencias[nomId][j].id = data.id; }
      }
    } catch (err) { console.error(err); }
  }

  return (
    <div>
      <div className="hstack" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(COLOR).map(([c, bg]) => <span key={c} className="hstack text-xs" style={{ gap: 4 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: bg, display: 'inline-block', border: '1px solid var(--ink-200)' }} />{c}</span>)}
      </div>
      <div className="card tbl-freeze">
        <table className="tbl" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Empleado</th>
              {days.map((d, i) => {
                const dn = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
                return (
                  <th key={i} colSpan={4} className="center" style={{ borderLeft: '2px solid var(--ink-300)' }}>
                    <div>{dn} {d.getDate()} {MESES_C[d.getMonth()]}</div>
                    {canEdit && <button className="btn btn-outline btn-sm" style={{ padding: '2px 8px', fontSize: 10, marginTop: 4 }} title="Marcar asistencia (A) a todos en este día" onClick={() => llenarDiaA(i, toISO(d))}>✓ Todos A</button>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp: any) => {
              const nom = nominas[emp.id]; if (!nom) return null;
              return (
                <tr key={emp.id}>
                  <td style={{ minWidth: 160 }}><div className="fw-600">{emp.nombre}</div><div className="text-xs muted">{emp.area}</div></td>
                  {days.map((d, i) => {
                    const a = get(nom.id, i); const codigo = a?.codigo || '';
                    return (
                      <td key={i} colSpan={4} style={{ padding: 4, borderLeft: '2px solid var(--ink-300)' }}>
                        <div className="hstack" style={{ gap: 3 }}>
                          <select value={codigo} disabled={!canEdit} onChange={(e) => update(nom.id, i, toISO(d), 'codigo', e.target.value)} style={{ width: 56, padding: '4px 2px', borderRadius: 6, border: '1px solid var(--ink-200)', background: COLOR[codigo] || 'white', fontSize: 11 }}>
                            <option value="">—</option>{CODIGOS_ASISTENCIA.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input type="number" value={a?.retardo_min || ''} min="0" step="0.25" placeholder="0" disabled={!canEdit} onChange={(e) => update(nom.id, i, toISO(d), 'retardo_min', parseFloat(e.target.value) || 0)} style={{ width: 40, padding: '4px', borderRadius: 6, border: '1px solid var(--ink-200)', fontSize: 11 }} />
                          <input type="number" value={a?.te_horas || ''} min="0" step="0.5" placeholder="0" disabled={!canEdit} onChange={(e) => update(nom.id, i, toISO(d), 'te_horas', parseFloat(e.target.value) || 0)} style={{ width: 40, padding: '4px', borderRadius: 6, border: '1px solid var(--ink-200)', fontSize: 11 }} />
                          <select value={a?.te_motivo || ''} disabled={!canEdit || !(a?.te_horas > 0)} onChange={(e) => update(nom.id, i, toISO(d), 'te_motivo', e.target.value)} style={{ width: 64, padding: '4px 2px', borderRadius: 6, border: '1px solid var(--ink-200)', fontSize: 10 }}>
                            <option value="">—</option>{MOTIVOS_TE.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs muted" style={{ marginTop: 10 }}>Códigos: A asistencia · F falta · D descanso · V vacaciones · PSG permiso sin goce · PCG permiso con goce · TXT tiempo x tiempo · SUS suspensión. R(h) retardo en horas · TE(h) horas extra.</p>
    </div>
  );
}
