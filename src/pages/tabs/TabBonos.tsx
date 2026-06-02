import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { fmt, fmtFecha } from '@/lib/format';
import { Icon } from '@/components/Icon';

const MOTIVOS = ['Productividad mensual', 'Ventas'];

export function TabBonos({ semana, nominas, empleados, canEdit, onChanged }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ empleado_id: '', monto: '', motivo: 'Productividad mensual' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, [semana.id]);
  async function fetchItems() {
    const { data } = await supabase.from('nomina_bono')
      .select('*, empleado:empleado_id(nombre,area)').eq('semana_id', semana.id).order('created_at', { ascending: false });
    setItems(data || []);
  }

  async function agregar() {
    const monto = parseFloat(form.monto) || 0;
    if (!form.empleado_id || monto <= 0) { toast.error('Selecciona empleado y monto'); return; }
    setSaving(true);
    const nomId = nominas[form.empleado_id]?.id;
    const { error } = await supabase.from('nomina_bono').insert({
      semana_id: semana.id, nomina_id: nomId, empleado_id: form.empleado_id, monto, motivo: form.motivo,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('Bono agregado');
    setForm({ empleado_id: '', monto: '', motivo: 'Productividad mensual' }); setSaving(false); fetchItems(); onChanged?.();
  }
  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este bono?')) return;
    await supabase.from('nomina_bono').delete().eq('id', id);
    fetchItems(); onChanged?.();
  }

  const total = items.reduce((s, i) => s + (i.monto || 0), 0);

  return (
    <div>
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="card-title">Bonos</h3>
        <div className="kpi" style={{ minWidth: 200 }}><span className="kpi-label">Total bonos</span><span className="kpi-value pos">{fmt(total)}</span></div>
      </div>

      {canEdit && (
        <div className="card" style={{ marginBottom: 14 }}><div className="card-body">
          <div className="form-grid form-grid-3">
            <div><label className="field-label">Empleado</label>
              <select className="field-input" value={form.empleado_id} onChange={(e) => setForm((f: any) => ({ ...f, empleado_id: e.target.value }))}>
                <option value="">— Selecciona —</option>
                {empleados.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div><label className="field-label">Monto</label><input className="field-input mono" type="number" step="0.01" value={form.monto} onChange={(e) => setForm((f: any) => ({ ...f, monto: e.target.value }))} /></div>
            <div><label className="field-label">Motivo</label>
              <select className="field-input" value={form.motivo} onChange={(e) => setForm((f: any) => ({ ...f, motivo: e.target.value }))}>
                {MOTIVOS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={agregar} disabled={saving}><Icon name="plus" size={14} /> Agregar bono</button>
          </div>
        </div></div>
      )}

      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Empleado</th><th>Motivo</th><th className="right">Monto</th><th>Fecha</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={canEdit ? 5 : 4}><div className="empty"><div className="empty-title">Sin bonos</div></div></td></tr>}
            {items.map((i) => (
              <tr key={i.id}>
                <td><div className="fw-600">{i.empleado?.nombre || '—'}</div><div className="text-xs muted">{i.empleado?.area || ''}</div></td>
                <td><span className="badge badge-blue">{i.motivo}</span></td>
                <td className="right mono pos">{fmt(i.monto)}</td>
                <td className="muted text-xs">{fmtFecha(i.created_at?.slice(0, 10))}</td>
                {canEdit && <td><button className="btn btn-ghost btn-sm" onClick={() => eliminar(i.id)}><Icon name="trash" size={14} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
