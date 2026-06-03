import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fmt } from '@/lib/format';
import { calcIncentivos, getTramo, TAB_CHOFER, TAB_ACOMP } from '@/lib/calc';
import { Icon } from '@/components/Icon';

const TRAMOS = ['7am–3pm', '3pm–7pm', '7pm–11pm', '11pm+'];
const EMPTY = { fecha: '', destino: '', cliente: '', vehiculo: '', chofer_id: '', acompanante_id: '', hora_salida: '', hora_llegada: '', se_quedo_dormir: false };

export function ViajesPanel({ semana, canEdit, onChanged }: any) {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [viajes, setViajes] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [incent, setIncent] = useState({ chofer: 0, acomp: 0, tramo: null as number | null });

  useEffect(() => { (async () => {
    const { data: emps } = await supabase.from('empleados').select('id,nombre,id_banco').eq('activo', true).order('id_banco', { ascending: true, nullsFirst: false });
    setEmpleados(emps || []);
    fetchViajes();
  })(); }, [semana.id]);

  async function fetchViajes() {
    const { data } = await supabase.from('viajes').select('*, chofer:chofer_id(nombre), acomp:acompanante_id(nombre)').eq('semana_id', semana.id).order('fecha');
    setViajes(data || []);
  }

  function onForm(campo: string, valor: any) {
    const nf = { ...form, [campo]: valor };
    setForm(nf);
    const { chofer, acomp } = calcIncentivos(nf.hora_llegada, nf.se_quedo_dormir);
    setIncent({ chofer, acomp, tramo: nf.se_quedo_dormir ? null : getTramo(nf.hora_llegada) });
  }

  async function guardar() {
    if (!form.chofer_id && !form.acompanante_id) { toast.error('Selecciona chofer o acompañante'); return; }

    // Validación de fecha: dentro del periodo = normal; hasta 7 días antes = retroactivo (avisa);
    // más viejo o posterior al periodo = bloqueado.
    let retro = false;
    if (form.fecha) {
      const f = new Date(form.fecha + 'T12:00:00');
      const ini = new Date(semana.fecha_inicio + 'T12:00:00');
      const fin = new Date(semana.fecha_fin + 'T12:00:00');
      const DIA = 86400000;
      if (f > fin) { toast.error('La fecha es posterior al periodo de esta nómina'); return; }
      if (f < ini) {
        const diasAntes = Math.round((ini.getTime() - f.getTime()) / DIA);
        if (diasAntes > 7) { toast.error('Solo se permiten viajes de hasta 1 semana antes del periodo'); return; }
        if (!confirm(`Ese viaje (${form.fecha}) no corresponde a esta semana. ¿Darlo de alta y que el monto vaya a Retroactivos?`)) return;
        retro = true;
      }
    }

    // Validación cruzada: si un viaje normal cae en un día con horas extra capturadas, avisar.
    if (!retro && form.fecha) {
      const empIds = [form.chofer_id, form.acompanante_id].filter(Boolean);
      const { data: noms } = await supabase.from('nominas').select('id,empleado_id').eq('semana_id', semana.id).in('empleado_id', empIds);
      const nomIds = (noms || []).map((n: any) => n.id);
      if (nomIds.length) {
        const { data: he } = await supabase.from('asistencias').select('nomina_id').in('nomina_id', nomIds).eq('fecha', form.fecha).gt('te_horas', 0);
        if (he && he.length) {
          const nomEmp: any = {}; (noms || []).forEach((n: any) => (nomEmp[n.id] = n.empleado_id));
          const nombres = [...new Set(he.map((h: any) => empleados.find((e) => e.id === nomEmp[h.nomina_id])?.nombre).filter(Boolean))];
          if (!confirm(`PARA ESTE DÍA ${nombres.join(' y ')} tiene horas extra. ¿Seguro que llegó a la hora del viaje?`)) return;
        }
      }
    }

    await supabase.from('viajes').insert({ semana_id: semana.id, fecha: form.fecha || null, destino: form.destino, cliente: form.cliente, vehiculo: form.vehiculo, chofer_id: form.chofer_id || null, acompanante_id: form.acompanante_id || null, hora_salida: form.hora_salida || null, hora_llegada: form.hora_llegada || null, se_quedo_dormir: form.se_quedo_dormir, incent_chofer: incent.chofer, incent_acompanante: incent.acomp, retroactivo: retro });
    setForm({ ...EMPTY }); setIncent({ chofer: 0, acomp: 0, tramo: null }); toast.success(retro ? 'Viaje retroactivo agregado' : 'Viaje agregado'); fetchViajes(); onChanged?.();
  }
  async function eliminar(id: string) { if (!confirm('¿Eliminar viaje?')) return; await supabase.from('viajes').delete().eq('id', id); fetchViajes(); onChanged?.(); }

  const total = viajes.reduce((s, v) => s + (v.incent_chofer || 0) + (v.incent_acompanante || 0), 0);

  return (
    <div>
      {canEdit && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><h3 className="card-title">Agregar viaje</h3></div>
          <div className="card-body">
            <div className="form-grid form-grid-3">
              <div><label className="field-label">Fecha</label><input className="field-input" type="date" value={form.fecha} onChange={(e) => onForm('fecha', e.target.value)} /></div>
              <div><label className="field-label">Destino</label><input className="field-input" value={form.destino} onChange={(e) => onForm('destino', e.target.value)} /></div>
              <div><label className="field-label">Cliente</label><input className="field-input" value={form.cliente} onChange={(e) => onForm('cliente', e.target.value)} /></div>
              <div><label className="field-label">Vehículo</label><input className="field-input" value={form.vehiculo} onChange={(e) => onForm('vehiculo', e.target.value)} /></div>
              <div><label className="field-label">Chofer</label><select className="field-input" value={form.chofer_id} onChange={(e) => onForm('chofer_id', e.target.value)}><option value="">—</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
              <div><label className="field-label">Acompañante</label><select className="field-input" value={form.acompanante_id} onChange={(e) => onForm('acompanante_id', e.target.value)}><option value="">—</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
              <div><label className="field-label">Hora salida</label><input className="field-input" type="time" value={form.hora_salida} onChange={(e) => onForm('hora_salida', e.target.value)} /></div>
              <div><label className="field-label">Hora llegada</label><input className="field-input" type="time" value={form.hora_llegada} onChange={(e) => onForm('hora_llegada', e.target.value)} /></div>
              <div className="hstack" style={{ alignItems: 'flex-end', gap: 8 }}>
                <button type="button" className={`switch ${form.se_quedo_dormir ? 'on' : ''}`} onClick={() => onForm('se_quedo_dormir', !form.se_quedo_dormir)} />
                <span className="text-sm">Se quedó a dormir</span>
              </div>
            </div>
            <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <div className="hstack" style={{ gap: 16 }}>
                <div><div className="text-xs muted">Chofer {incent.tramo != null ? `· ${TRAMOS[incent.tramo]}` : ''}</div><div className="fw-700 blue">{fmt(incent.chofer)}</div></div>
                <div><div className="text-xs muted">Acompañante</div><div className="fw-700 blue">{fmt(incent.acomp)}</div></div>
                <div><div className="text-xs muted">Total</div><div className="fw-700">{fmt(incent.chofer + incent.acomp)}</div></div>
              </div>
              <button className="btn btn-primary" onClick={guardar}><Icon name="plus" size={15} /> Guardar viaje</button>
            </div>
          </div>
        </div>
      )}

      <div className="card tbl-wrap">
        <div className="card-header"><h3 className="card-title">Viajes</h3><span className="text-sm muted">Total incentivos: <strong className="blue">{fmt(total)}</strong></span></div>
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Destino</th><th>Cliente</th><th>Chofer</th><th>Acompañante</th><th>Salida</th><th>Llegada</th><th className="right">Inc. chofer</th><th className="right">Inc. acomp.</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {viajes.map((v) => (
              <tr key={v.id}>
                <td className="muted">{v.fecha || '—'}{v.retroactivo && <span className="badge badge-amber" style={{ marginLeft: 4 }}>Retro</span>}</td><td>{v.destino || '—'}</td><td>{v.cliente || '—'}</td>
                <td>{v.chofer?.nombre || '—'}</td><td>{v.acomp?.nombre || '—'}</td>
                <td className="mono">{v.hora_salida || '—'}</td><td className="mono">{v.hora_llegada || '—'}{v.se_quedo_dormir ? ' 🌙' : ''}</td>
                <td className="right mono blue">{fmt(v.incent_chofer || 0)}</td><td className="right mono blue">{fmt(v.incent_acompanante || 0)}</td>
                {canEdit && <td><button className="btn btn-ghost btn-sm" onClick={() => eliminar(v.id)}><Icon name="trash" size={14} /></button></td>}
              </tr>
            ))}
            {viajes.length === 0 && <tr><td colSpan={canEdit ? 10 : 9}><div className="empty"><div className="empty-title">Sin viajes registrados</div></div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
