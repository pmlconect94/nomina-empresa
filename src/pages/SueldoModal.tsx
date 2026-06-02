import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fmt, fmtFecha, toISO } from '@/lib/format';
import { antiguedadAnios, factorIntegracionSDI, calcSDI } from '@/lib/calc';
import { Icon } from '@/components/Icon';

const TIPO_LABEL: Record<string, string> = { alta: 'Alta', modificacion: 'Modificación de sueldo', baja: 'Baja' };
const TIPO_BADGE: Record<string, string> = { alta: 'badge-green', modificacion: 'badge-blue', baja: 'badge-gray' };

export function SueldoModal({ empleado, onClose, onChanged }: { empleado: any; onClose: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const canEdit = user?.rol === 'admin' || user?.rol === 'editor';
  const [movs, setMovs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const antig = antiguedadAnios(empleado.fecha_ingreso);
  const factor = factorIntegracionSDI(antig);

  const hoy = useMemo(() => toISO(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)), []);
  const [form, setForm] = useState<any>({ tipo: 'modificacion', fecha_inicio: hoy, sueldo_diario_real: '', sueldo_diario_fiscal: '', sdi: '', nota: '' });

  useEffect(() => { fetchMovs(); }, []);
  async function fetchMovs() {
    setLoading(true);
    const { data } = await supabase.from('empleado_sueldo_movimientos').select('*').eq('empleado_id', empleado.id).order('fecha_inicio', { ascending: false }).order('created_at', { ascending: false });
    setMovs(data || []);
    setLoading(false);
  }

  const vigente = movs.find((m) => m.tipo !== 'baja' && !m.fecha_fin) || null;
  const dadoBaja = movs.length > 0 && movs[0].tipo === 'baja';

  function abrirForm() {
    const esAlta = movs.length === 0 || dadoBaja;
    setForm({
      tipo: esAlta ? 'alta' : 'modificacion',
      fecha_inicio: hoy,
      sueldo_diario_real: vigente?.sueldo_diario_real || '',
      sueldo_diario_fiscal: vigente?.sueldo_diario_fiscal || '',
      sdi: vigente?.sdi || '',
      nota: '',
    });
    setShowForm(true);
  }

  const setFiscal = (v: string) => {
    const fiscal = parseFloat(v) || 0;
    setForm((p: any) => ({ ...p, sueldo_diario_fiscal: v, sdi: fiscal > 0 ? calcSDI(fiscal, antig) : '' }));
  };

  async function guardar() {
    const real = parseFloat(form.sueldo_diario_real) || 0;
    const fiscal = parseFloat(form.sueldo_diario_fiscal) || 0;
    const sdi = parseFloat(form.sdi) || 0;
    if (real <= 0 && fiscal <= 0) { toast.error('Captura al menos un sueldo diario'); return; }
    if (!form.fecha_inicio) { toast.error('Falta la fecha de inicio'); return; }
    setSaving(true);

    // Cerrar la vigencia anterior en la fecha de inicio del nuevo movimiento.
    if (vigente) await supabase.from('empleado_sueldo_movimientos').update({ fecha_fin: form.fecha_inicio }).eq('id', vigente.id);

    const { error } = await supabase.from('empleado_sueldo_movimientos').insert({
      empleado_id: empleado.id, tipo: form.tipo, fecha_inicio: form.fecha_inicio, fecha_fin: null,
      sueldo_diario_real: real, sueldo_diario_fiscal: fiscal, sdi, factor_integracion: factor,
      nota: form.nota.trim() || null, changed_by: user?.id, changed_by_nombre: user?.nombre,
    });
    if (error) { toast.error(error.message); setSaving(false); return; }

    // Sincroniza el sueldo SEMANAL en empleados (= diario × 7) para que el cálculo lo use.
    await supabase.from('empleados').update({ sd_real: Math.round(real * 7 * 100) / 100, sd_fiscal: Math.round(fiscal * 7 * 100) / 100, activo: true }).eq('id', empleado.id);

    toast.success('Movimiento registrado');
    setShowForm(false); setSaving(false); fetchMovs(); onChanged();
  }

  async function darBaja() {
    if (!confirm(`¿Dar de baja a ${empleado.nombre}? Quedará inactivo en el catálogo.`)) return;
    setSaving(true);
    if (vigente) await supabase.from('empleado_sueldo_movimientos').update({ fecha_fin: hoy }).eq('id', vigente.id);
    await supabase.from('empleado_sueldo_movimientos').insert({
      empleado_id: empleado.id, tipo: 'baja', fecha_inicio: hoy, fecha_fin: hoy,
      sueldo_diario_real: 0, sueldo_diario_fiscal: 0, sdi: 0,
      nota: 'Baja del empleado', changed_by: user?.id, changed_by_nombre: user?.nombre,
    });
    await supabase.from('empleados').update({ activo: false }).eq('id', empleado.id);
    toast.success('Empleado dado de baja');
    setSaving(false); fetchMovs(); onChanged();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal page-enter" style={{ maxWidth: 1000, width: '94vw' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Sueldo — {empleado.nombre}</h3>
            <div className="text-xs muted">Antigüedad: {antig} {antig === 1 ? 'año' : 'años'} · Factor SDI: {factor} · El último movimiento vigente es el que calcula la nómina.</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Resumen del vigente */}
          <div className="grid grid-4" style={{ marginBottom: 16 }}>
            <div className="kpi"><span className="kpi-label">Sueldo diario real</span><span className="kpi-value">{vigente ? fmt(vigente.sueldo_diario_real) : '—'}</span></div>
            <div className="kpi"><span className="kpi-label">Sueldo diario fiscal</span><span className="kpi-value">{vigente ? fmt(vigente.sueldo_diario_fiscal) : '—'}</span></div>
            <div className="kpi"><span className="kpi-label">SDI vigente</span><span className="kpi-value blue">{vigente ? fmt(vigente.sdi) : '—'}</span></div>
            <div className="kpi"><span className="kpi-label">Estado</span><span className="kpi-value">{dadoBaja ? <span className="neg">Baja</span> : vigente ? <span className="pos">Vigente</span> : '—'}</span></div>
          </div>

          <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <h4 className="card-title">Historial de movimientos</h4>
            {canEdit && (
              <div className="hstack" style={{ gap: 8 }}>
                {!dadoBaja && empleado.activo && <button className="btn btn-danger btn-sm" onClick={darBaja} disabled={saving}><Icon name="logout" size={13} /> Dar de baja</button>}
                <button className="btn btn-primary btn-sm" onClick={abrirForm} disabled={saving}><Icon name="plus" size={14} /> {movs.length === 0 || dadoBaja ? 'Alta de sueldo' : 'Modificar sueldo'}</button>
              </div>
            )}
          </div>

          <div className="card tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Tipo</th><th>Inicio</th><th>Fin</th><th className="right">S. diario real</th><th className="right">S. diario fiscal</th><th className="right">SDI</th><th>Nota</th><th>Usuario</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={8}><div className="empty"><span className="spinner" /></div></td></tr>}
                {!loading && movs.length === 0 && <tr><td colSpan={8}><div className="empty"><div className="empty-title">Sin movimientos</div><p className="muted">Captura el alta de sueldo para empezar.</p></div></td></tr>}
                {movs.map((m, i) => (
                  <tr key={m.id} style={i === 0 && m.tipo !== 'baja' && !m.fecha_fin ? { background: 'var(--blue-50)' } : undefined}>
                    <td><span className={`badge ${TIPO_BADGE[m.tipo]}`}>{TIPO_LABEL[m.tipo]}</span></td>
                    <td className="muted">{fmtFecha(m.fecha_inicio)}</td>
                    <td className="muted">{m.fecha_fin ? fmtFecha(m.fecha_fin) : <span className="pos">vigente</span>}</td>
                    <td className="right mono">{fmt(m.sueldo_diario_real)}</td>
                    <td className="right mono">{fmt(m.sueldo_diario_fiscal)}</td>
                    <td className="right mono blue">{fmt(m.sdi)}</td>
                    <td className="muted text-xs">{m.nota || '—'}</td>
                    <td className="muted text-xs">{m.changed_by_nombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showForm && (
            <div style={{ marginTop: 16, border: '1px solid var(--ink-200)', borderRadius: 'var(--r-md)', padding: 16, background: 'var(--ink-50)' }}>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">Tipo</label>
                  <select className="field-input" value={form.tipo} onChange={(e) => setForm((p: any) => ({ ...p, tipo: e.target.value }))}>
                    <option value="alta">Alta</option><option value="modificacion">Modificación de sueldo</option>
                  </select>
                </div>
                <div><label className="field-label">Fecha de inicio (vigencia)</label><input className="field-input" type="date" value={form.fecha_inicio} onChange={(e) => setForm((p: any) => ({ ...p, fecha_inicio: e.target.value }))} /></div>
                <div />
                <div><label className="field-label">Sueldo diario real</label><input className="field-input mono" type="number" step="0.01" value={form.sueldo_diario_real} onChange={(e) => setForm((p: any) => ({ ...p, sueldo_diario_real: e.target.value }))} /></div>
                <div><label className="field-label">Sueldo diario fiscal (IMSS)</label><input className="field-input mono" type="number" step="0.01" value={form.sueldo_diario_fiscal} onChange={(e) => setFiscal(e.target.value)} /></div>
                <div><label className="field-label">SDI (auto, editable)</label><input className="field-input mono" type="number" step="0.01" value={form.sdi} onChange={(e) => setForm((p: any) => ({ ...p, sdi: e.target.value }))} /></div>
              </div>
              <div className="form-grid" style={{ marginTop: 14 }}><div><label className="field-label">Nota / motivo</label><input className="field-input" value={form.nota} placeholder="Ej. Aumento anual, ajuste de SDI…" onChange={(e) => setForm((p: any) => ({ ...p, nota: e.target.value }))} /></div></div>
              <div className="hstack" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn btn-primary btn-sm" onClick={guardar} disabled={saving}>{saving ? 'Guardando…' : 'Guardar movimiento'}</button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  );
}
