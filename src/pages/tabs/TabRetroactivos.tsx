import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fmt, fmtFecha } from '@/lib/format';
import { Icon } from '@/components/Icon';

// Retroactivos: viajes / horas extra de OTRO periodo que se pagan en esta nómina.
const TIPOS = [
  { k: 'viaje', t: 'Viaje' },
  { k: 'horas_extra', t: 'Horas extra' },
];
const tipoLabel = (k: string) => TIPOS.find((t) => t.k === k)?.t || k;

export function TabRetroactivos({ semana, nominas, empleados, canEdit, onChanged }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [modalEmp, setModalEmp] = useState<any>(null);
  const [form, setForm] = useState<any>({ monto: '', tipo: 'viaje', periodo_origen: '', descripcion: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, [semana.id]);
  async function fetchItems() {
    const { data } = await supabase.from('nomina_retroactivo').select('*').eq('semana_id', semana.id).order('created_at', { ascending: false });
    setItems(data || []);
  }
  const delEmp = (id: string) => items.filter((i) => i.empleado_id === id);
  const totalEmp = (id: string) => delEmp(id).reduce((s, i) => s + (i.monto || 0), 0);

  function resetForm() { setForm({ monto: '', tipo: 'viaje', periodo_origen: '', descripcion: '' }); }

  async function agregar() {
    const monto = parseFloat(form.monto) || 0;
    if (monto <= 0) { toast.error('Captura el monto'); return; }
    setSaving(true);
    const { error } = await supabase.from('nomina_retroactivo').insert({
      semana_id: semana.id, nomina_id: nominas[modalEmp.id]?.id, empleado_id: modalEmp.id,
      monto, tipo: form.tipo, periodo_origen: form.periodo_origen || null, descripcion: form.descripcion || null,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    resetForm(); setSaving(false); fetchItems(); onChanged?.();
  }
  async function eliminar(id: string) {
    await supabase.from('nomina_retroactivo').delete().eq('id', id);
    fetchItems(); onChanged?.();
  }

  const total = items.reduce((s, i) => s + (i.monto || 0), 0);

  return (
    <div>
      <p className="muted text-sm" style={{ marginTop: 0 }}>
        Viajes u horas extra de <strong>otro periodo</strong> que se pagan en esta nómina (por ejemplo, se omitieron en su semana). Se suman como percepción.
      </p>
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="card-title">Retroactivos</h3>
        <div className="kpi" style={{ minWidth: 180 }}><span className="kpi-label">Total retroactivos</span><span className="kpi-value pos">{fmt(total)}</span></div>
      </div>

      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Empleado</th><th className="center">Registros</th><th className="right">Total</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {empleados.map((e: any) => {
              const n = delEmp(e.id).length;
              return (
                <tr key={e.id}>
                  <td><div className="fw-600">{e.nombre}</div><div className="text-xs muted">{e.area}</div></td>
                  <td className="center">{n || '—'}</td>
                  <td className={`right mono ${totalEmp(e.id) > 0 ? 'pos' : 'zero'}`}>{totalEmp(e.id) > 0 ? fmt(totalEmp(e.id)) : '—'}</td>
                  {canEdit && <td className="right"><button className="btn btn-outline btn-sm" onClick={() => { setModalEmp(e); resetForm(); }}><Icon name="plus" size={14} /></button></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalEmp && (
        <div className="modal-backdrop" onClick={(ev) => ev.target === ev.currentTarget && setModalEmp(null)}>
          <div className="modal page-enter" style={{ maxWidth: 620 }}>
            <div className="modal-header"><h3 className="modal-title">Retroactivos — {modalEmp.nombre}</h3><button className="btn btn-ghost btn-sm" onClick={() => setModalEmp(null)}><Icon name="x" size={16} /></button></div>
            <div className="modal-body">
              {canEdit && (
                <>
                  <div className="form-grid form-grid-2" style={{ alignItems: 'end' }}>
                    <div><label className="field-label">Tipo</label><select className="field-input" value={form.tipo} onChange={(e) => setForm((f: any) => ({ ...f, tipo: e.target.value }))}>{TIPOS.map((t) => <option key={t.k} value={t.k}>{t.t}</option>)}</select></div>
                    <div><label className="field-label">Monto</label><input className="field-input mono" type="number" step="0.01" autoFocus value={form.monto} onChange={(e) => setForm((f: any) => ({ ...f, monto: e.target.value }))} /></div>
                    <div><label className="field-label">Periodo de origen</label><input className="field-input" placeholder="ej. 1ª quincena de mayo" value={form.periodo_origen} onChange={(e) => setForm((f: any) => ({ ...f, periodo_origen: e.target.value }))} /></div>
                    <div><label className="field-label">Descripción</label><input className="field-input" placeholder="destino / motivo" value={form.descripcion} onChange={(e) => setForm((f: any) => ({ ...f, descripcion: e.target.value }))} /></div>
                  </div>
                  <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 10 }}><button className="btn btn-primary btn-sm" onClick={agregar} disabled={saving}><Icon name="plus" size={14} /> Agregar retroactivo</button></div>
                </>
              )}
              <div className="form-section-title">Registrados</div>
              <table className="tbl">
                <thead><tr><th>Tipo</th><th>Periodo origen</th><th>Descripción</th><th className="right">Monto</th><th>Capturado</th>{canEdit && <th></th>}</tr></thead>
                <tbody>
                  {delEmp(modalEmp.id).length === 0 && <tr><td colSpan={canEdit ? 6 : 5}><div className="empty"><div className="empty-title">Sin retroactivos</div></div></td></tr>}
                  {delEmp(modalEmp.id).map((i) => (
                    <tr key={i.id}>
                      <td><span className="badge badge-blue">{tipoLabel(i.tipo)}</span></td>
                      <td className="text-xs">{i.periodo_origen || '—'}</td>
                      <td className="text-xs">{i.descripcion || '—'}</td>
                      <td className="right mono pos">{fmt(i.monto)}</td>
                      <td className="muted text-xs">{fmtFecha(i.created_at?.slice(0, 10))}</td>
                      {canEdit && <td><button className="btn btn-ghost btn-sm" onClick={() => eliminar(i.id)}><Icon name="trash" size={14} /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setModalEmp(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
