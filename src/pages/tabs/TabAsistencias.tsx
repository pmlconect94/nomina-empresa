import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CODIGOS_ASISTENCIA, MOTIVOS_TE, DIAS_SEMANA } from '@/lib/calc';
import { fmt, toISO } from '@/lib/format';

const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const COLOR: Record<string, string> = { A: '#EAF3DE', F: '#FCEBEB', D: '#F1EFE8', V: '#E6F1FB', PSG: '#FAEEDA', PCG: '#EEEDFE', TXT: '#E1F5EE', SUS: '#FCEBEB' };

export function TabAsistencias({ semana, nominas, empleados, asistencias, viajeDias, canEdit }: any) {
  const [local, setLocal] = useState<Record<string, any>>({});
  const [sortEmp, setSortEmp] = useState<{ key: 'id_banco' | 'nombre'; dir: 1 | -1 }>({ key: 'id_banco', dir: 1 });
  const toggleSort = (key: 'id_banco' | 'nombre') => setSortEmp((s) => s.key === key ? { key, dir: (s.dir === 1 ? -1 : 1) } : { key, dir: 1 });
  const empOrden = useMemo(() => {
    return [...empleados].sort((a, b) => {
      let va: any, vb: any;
      if (sortEmp.key === 'nombre') { va = (a.nombre || '').toLowerCase(); vb = (b.nombre || '').toLowerCase(); }
      else { va = a.id_banco ?? Number.MAX_SAFE_INTEGER; vb = b.id_banco ?? Number.MAX_SAFE_INTEGER; }
      return va < vb ? -1 * sortEmp.dir : va > vb ? 1 * sortEmp.dir : 0;
    });
  }, [empleados, sortEmp]);

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

  // Poner un código a todos los empleados en un día (A entre semana, D los domingos).
  async function llenarDia(i: number, fecha: string, codigo: string) {
    if (!canEdit) return;
    for (const emp of empleados) {
      const nom = nominas[emp.id];
      if (!nom) continue;
      const a = get(nom.id, i);
      if (a?.codigo) continue; // no pisar lo ya capturado
      await update(nom.id, i, fecha, 'codigo', codigo);
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
              <th style={{ minWidth: 180 }}>
                <span onClick={() => toggleSort('id_banco')} style={{ cursor: 'pointer' }}>ID Banco <span style={{ opacity: sortEmp.key === 'id_banco' ? 1 : 0.25 }}>{sortEmp.key === 'id_banco' ? (sortEmp.dir === 1 ? '▲' : '▼') : '↕'}</span></span>
                <span className="muted"> · </span>
                <span onClick={() => toggleSort('nombre')} style={{ cursor: 'pointer' }}>Empleado <span style={{ opacity: sortEmp.key === 'nombre' ? 1 : 0.25 }}>{sortEmp.key === 'nombre' ? (sortEmp.dir === 1 ? '▲' : '▼') : '↕'}</span></span>
              </th>
              {days.map((d, i) => {
                const dn = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()];
                const esDomingo = d.getDay() === 0;
                return (
                  <th key={i} colSpan={4} className="center" style={{ borderLeft: '2px solid var(--ink-300)' }}>
                    <div className="hstack" style={{ justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{dn} {d.getDate()} {MESES_C[d.getMonth()]}</span>
                      {canEdit && <button className="btn btn-outline btn-sm" style={{ padding: '1px 6px', fontSize: 10 }} title={`Marcar ${esDomingo ? 'descanso (D)' : 'asistencia (A)'} a todos en este día`} onClick={() => llenarDia(i, toISO(d), esDomingo ? 'D' : 'A')}>✓ Todos {esDomingo ? 'D' : 'A'}</button>}
                    </div>
                    <div className="hstack" style={{ gap: 3, marginTop: 3, paddingLeft: 4, justifyContent: 'flex-start', fontWeight: 400 }}>
                      <span style={{ width: 56, fontSize: 9, color: 'var(--ink-500)', textAlign: 'center' }}>Cód</span>
                      <span style={{ width: 40, fontSize: 9, color: 'var(--ink-500)', textAlign: 'center' }}>Ret</span>
                      <span style={{ width: 40, fontSize: 9, color: 'var(--ink-500)', textAlign: 'center' }}>T.E.</span>
                      <span style={{ width: 64, fontSize: 9, color: 'var(--ink-500)', textAlign: 'center' }}>Mot</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {empOrden.map((emp: any) => {
              const nom = nominas[emp.id]; if (!nom) return null;
              return (
                <tr key={emp.id}>
                  <td style={{ minWidth: 180 }}>
                    <div className="hstack" style={{ gap: 8 }}>
                      <span className="mono fw-700" style={{ minWidth: 26, color: 'var(--ink-500)' }}>{emp.id_banco ?? '—'}</span>
                      <div><div className="fw-600">{emp.nombre}</div><div className="text-xs muted">{emp.area}</div></div>
                    </div>
                  </td>
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
      <div className="card" style={{ marginTop: 12, padding: 12 }}>
        <div className="text-xs fw-700" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-500)' }}>Incidencias — qué resta y qué no (todo queda en el historial)</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
          {[
            { c: 'A', n: 'Asistencia', resta: false },
            { c: 'F', n: 'Falta', resta: false },
            { c: 'D', n: 'Descanso', resta: true },
            { c: 'V', n: 'Vacación', resta: false },
            { c: 'PSG', n: 'Permiso sin goce de sueldo', resta: true },
            { c: 'PCG', n: 'Permiso con goce de sueldo', resta: false },
            { c: 'TXT', n: 'Tiempo x Tiempo', resta: false },
            { c: 'SUS', n: 'Suspensión', resta: true },
          ].map((it) => (
            <div key={it.c} className="hstack text-xs" style={{ gap: 6, justifyContent: 'space-between', padding: '3px 6px', borderRadius: 6, background: COLOR[it.c] || 'var(--ink-50)' }}>
              <span><strong>{it.c}</strong> · {it.n}</span>
              <span className={`badge ${it.resta ? 'badge-red' : 'badge-green'}`}>{it.resta ? 'Resta' : 'No resta'}</span>
            </div>
          ))}
        </div>
        <p className="text-xs muted" style={{ margin: '8px 0 0' }}>Además: <strong>Ret</strong> = retardo en horas (se resta) · <strong>T.E.</strong> = tiempo extra en horas · <strong>Mot</strong> = motivo del tiempo extra.</p>
      </div>
    </div>
  );
}
