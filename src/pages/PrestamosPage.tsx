import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fmt, fmtFecha, MESES } from '@/lib/format';
import { descuentoPrestamoMonto } from '@/lib/calc';
import { Icon } from '@/components/Icon';
import { PageEnter } from '@/components/motion';

export function PrestamosPage() {
  const { user } = useAuth();
  const canEdit = user?.rol !== 'viewer';
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ empleado_id: '', monto: '', fecha_prestamo: '', tipo: 'semanal' });

  useEffect(() => { fetchP(); fetchE(); }, []);
  async function fetchP() { const { data } = await supabase.from('prestamos').select('*, empleado:empleado_id(nombre,area)').order('created_at', { ascending: false }); setPrestamos(data || []); }
  async function fetchE() { const { data } = await supabase.from('empleados').select('id,nombre,id_banco').eq('activo', true).order('id_banco', { ascending: true, nullsFirst: false }); setEmpleados(data || []); }

  async function guardar() {
    if (!form.empleado_id || !form.monto || !form.fecha_prestamo) return;
    const monto = parseFloat(form.monto);
    await supabase.from('prestamos').insert({ empleado_id: form.empleado_id, monto, saldo: monto, fecha_prestamo: form.fecha_prestamo, tipo: form.tipo, activo: true });
    toast.success('Préstamo registrado');
    setModal(false); setForm({ empleado_id: '', monto: '', fecha_prestamo: '', tipo: 'semanal' }); fetchP();
  }
  async function archivar(id: string) { if (!confirm('¿Archivar este préstamo?')) return; await supabase.from('prestamos').update({ activo: false }).eq('id', id); fetchP(); }

  function primerDesc(fecha: string) {
    if (!fecha) return '';
    const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() + 7);
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  }

  const activos = prestamos.filter((p) => p.activo !== false);
  const totPrestado = activos.reduce((s, p) => s + p.monto, 0);
  const totPend = activos.reduce((s, p) => s + p.saldo, 0);
  const desc = descuentoPrestamoMonto(parseFloat(form.monto) || 0, form.tipo);
  const noms = form.monto ? Math.ceil(parseFloat(form.monto) / desc) : 0;

  return (
    <PageEnter>
      <div className="page-header">
        <div><h1 className="page-title">Préstamos</h1><p className="page-subtitle">El primer descuento aplica una semana después de la fecha</p></div>
        {canEdit && <button className="btn btn-primary" onClick={() => setModal(true)}><Icon name="plus" size={15} /> Nuevo préstamo</button>}
      </div>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <div className="kpi"><span className="kpi-label">Total prestado</span><span className="kpi-value">{fmt(totPrestado)}</span></div>
        <div className="kpi"><span className="kpi-label">Saldo pendiente</span><span className="kpi-value orange">{fmt(totPend)}</span></div>
        <div className="kpi"><span className="kpi-label">Préstamos activos</span><span className="kpi-value">{activos.length}</span></div>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Empleado</th><th>Fecha</th><th>Tipo</th><th className="right">Monto</th><th className="right">Saldo</th><th className="right">Desc./nómina</th><th>Avance</th><th>Status</th>{canEdit && <th></th>}</tr></thead>
          <tbody>
            {prestamos.length === 0 && <tr><td colSpan={9}><div className="empty"><div className="empty-title">Sin préstamos</div></div></td></tr>}
            {prestamos.map((p) => {
              const d = descuentoPrestamoMonto(p.monto, p.tipo);
              const pct = Math.round(((p.monto - p.saldo) / p.monto) * 100);
              const liq = p.saldo === 0, arch = p.activo === false;
              return (
                <tr key={p.id} className={arch ? 'row-inactive' : ''}>
                  <td><div className="fw-600">{p.empleado?.nombre || '—'}</div><div className="text-xs muted">{p.empleado?.area || ''}</div></td>
                  <td className="muted">{fmtFecha(p.fecha_prestamo)}</td>
                  <td><span className="badge badge-gray">{p.tipo === 'semanal' ? 'Semanal 10%' : 'Quincenal 20%'}</span></td>
                  <td className="right mono">{fmt(p.monto)}</td>
                  <td className={`right mono ${liq ? 'pos' : 'orange'}`}>{liq ? 'Liquidado' : fmt(p.saldo)}</td>
                  <td className="right mono blue">{liq ? '—' : fmt(d)}</td>
                  <td style={{ minWidth: 120 }}><div className="text-xs muted" style={{ marginBottom: 3 }}>{pct}%</div><div className="progress"><div className="progress-fill" style={{ width: pct + '%' }} /></div></td>
                  <td><span className={`badge ${arch ? 'badge-gray' : liq ? 'badge-green' : 'badge-blue'}`}>{arch ? 'Archivado' : liq ? 'Liquidado' : 'Activo'}</span></td>
                  {canEdit && <td>{!arch && <button className="btn btn-ghost btn-sm" onClick={() => archivar(p.id)}><Icon name="trash" size={14} /></button>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal page-enter" style={{ maxWidth: 520 }}>
            <div className="modal-header"><h3 className="modal-title">Nuevo préstamo</h3><button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}><Icon name="x" size={16} /></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div><label className="field-label">Empleado</label><select className="field-input" value={form.empleado_id} onChange={(e) => setForm((f: any) => ({ ...f, empleado_id: e.target.value }))}><option value="">— Selecciona —</option>{empleados.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
              </div>
              <div className="form-grid form-grid-2" style={{ marginTop: 14 }}>
                <div><label className="field-label">Monto</label><input className="field-input mono" type="number" value={form.monto} onChange={(e) => setForm((f: any) => ({ ...f, monto: e.target.value }))} /></div>
                <div><label className="field-label">Fecha del préstamo</label><input className="field-input" type="date" value={form.fecha_prestamo} onChange={(e) => setForm((f: any) => ({ ...f, fecha_prestamo: e.target.value }))} /></div>
              </div>
              <div className="form-grid" style={{ marginTop: 14 }}>
                <div><label className="field-label">Tipo de descuento</label><select className="field-input" value={form.tipo} onChange={(e) => setForm((f: any) => ({ ...f, tipo: e.target.value }))}><option value="semanal">Semanal (10%)</option><option value="quincenal">Quincenal (20%)</option></select></div>
              </div>
              {form.monto > 0 && form.fecha_prestamo && (
                <div style={{ marginTop: 14, background: 'var(--ink-50)', borderRadius: 'var(--r-md)', padding: 12 }} className="text-sm">
                  <div className="hstack" style={{ justifyContent: 'space-between' }}><span className="muted">Descuento por nómina</span><span className="mono fw-600">{fmt(desc)}</span></div>
                  <div className="hstack" style={{ justifyContent: 'space-between' }}><span className="muted">Nóminas para liquidar</span><span className="fw-600">{noms}</span></div>
                  <div className="hstack" style={{ justifyContent: 'space-between' }}><span className="muted">Primer descuento aprox.</span><span className="fw-600">{primerDesc(form.fecha_prestamo)}</span></div>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-primary" onClick={guardar} disabled={!form.empleado_id || !form.monto || !form.fecha_prestamo}>Guardar</button></div>
          </div>
        </div>
      )}
    </PageEnter>
  );
}
