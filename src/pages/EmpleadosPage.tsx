import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fmt, fmtFechaHora, calcEdad } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { PageEnter } from '@/components/motion';

const AREAS = ['Administración', 'Cobranza', 'Contabilidad', 'Logistica/Almacen', 'Recursos Humanos', 'Ventas'];
const ESQUEMAS = ['Semanal', 'Quincenal'];
const SEXOS = ['Masculino', 'Femenino'];
const ESTADO_CIVIL = ['Soltero', 'Soltera', 'Casado', 'Casada', 'Union libre', 'Viudo', 'Viuda', 'Divorciado', 'Divorciada'];
const ESCOLARIDAD = ['Primaria', 'Secundaria', 'Preparatoria', 'Licenciatura', 'Maestría', 'Universidad', 'Doctorado'];
const TURNOS = [1, 2, 3];
const CAMPOS_SUELDO: Record<string, string> = { sd_fiscal: 'Sueldo fiscal', sd_real: 'Sueldo real', infonavit: 'Infonavit' };

export function EmpleadosPage() {
  const { user } = useAuth();
  const canEdit = user?.rol === 'admin';
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'activos' | 'bajas' | 'todos'>('activos');
  const [editando, setEditando] = useState<any>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState<any>({});
  const [notaCambio, setNotaCambio] = useState('');
  const [saving, setSaving] = useState(false);
  const [histEmp, setHistEmp] = useState<any>(null);
  const [histData, setHistData] = useState<any[]>([]);

  useEffect(() => { fetchEmpleados(); }, []);
  async function fetchEmpleados() {
    const { data } = await supabase.from('empleados').select('*').order('nombre');
    setEmpleados(data || []);
  }

  const lista = useMemo(() => {
    let r = empleados;
    if (filtro === 'activos') r = r.filter((e) => e.activo);
    else if (filtro === 'bajas') r = r.filter((e) => !e.activo);
    if (busqueda) {
      const t = busqueda.toLowerCase();
      r = r.filter((e) =>
        [e.nombre, e.puesto, e.area, e.rfc, e.id_nomex, e.id_toka]
          .some((v) => v && String(v).toLowerCase().includes(t)));
    }
    return r;
  }, [empleados, filtro, busqueda]);

  function abrirNuevo() {
    setForm({ activo: true, ubicacion: 'Matriz', razon_social: 'Productos Marinos Lizarraga, S. de R.L. de C.V.', esquema_pago: 'Semanal', sd_fiscal: 0, sd_real: 0, infonavit: 0 });
    setNuevo(true); setEditando('nuevo'); setNotaCambio('');
  }
  function abrirEdicion(e: any) { setForm({ ...e }); setNuevo(false); setEditando(e.id); setNotaCambio(''); }

  async function guardar() {
    if (!form.nombre) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const num = (v: any) => (v === '' || v == null ? null : Number(v));
    const txt = (v: any) => (v === '' || v == null ? null : v);
    const data: any = {
      id_nomex: num(form.id_nomex), id_banco: num(form.id_banco), id_toka: num(form.id_toka),
      nombre: form.nombre, activo: form.activo !== false,
      fecha_ingreso: txt(form.fecha_ingreso), puesto: txt(form.puesto), area: txt(form.area),
      jefe_inmediato: txt(form.jefe_inmediato), ubicacion: txt(form.ubicacion), razon_social: txt(form.razon_social),
      turno: num(form.turno), horario: txt(form.horario), esquema_pago: txt(form.esquema_pago),
      fecha_nacimiento: txt(form.fecha_nacimiento), sexo: txt(form.sexo), estado_civil: txt(form.estado_civil),
      escolaridad: txt(form.escolaridad), rfc: txt(form.rfc), curp: txt(form.curp), nss: txt(form.nss),
      domicilio: txt(form.domicilio), colonia: txt(form.colonia), municipio: txt(form.municipio), codigo_postal: txt(form.codigo_postal),
      telefono: txt(form.telefono), correo: txt(form.correo),
      contacto_nombre: txt(form.contacto_nombre), contacto_parentesco: txt(form.contacto_parentesco), contacto_telefono: txt(form.contacto_telefono),
      sd_fiscal: +(form.sd_fiscal || 0), sd_real: +(form.sd_real || 0), infonavit: +(form.infonavit || 0),
    };
    let empId = editando;
    let error;
    if (nuevo) {
      const r = await supabase.from('empleados').insert(data).select('id').single();
      error = r.error; empId = r.data?.id;
    } else {
      const r = await supabase.from('empleados').update(data).eq('id', editando);
      error = r.error;
    }
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return; }

    const original = nuevo ? { sd_fiscal: 0, sd_real: 0, infonavit: 0 } : (empleados.find((e) => e.id === editando) || {});
    const cambios = Object.keys(CAMPOS_SUELDO)
      .filter((c) => +(original[c] || 0) !== +(data[c] || 0))
      .map((c) => ({ empleado_id: empId, campo: c, valor_anterior: +(original[c] || 0), valor_nuevo: +(data[c] || 0), nota: notaCambio.trim() || (nuevo ? 'Alta inicial' : null), changed_by: user?.id, changed_by_nombre: user?.nombre }));
    if (cambios.length) await supabase.from('empleado_sueldo_historial').insert(cambios);

    toast.success(nuevo ? 'Empleado creado' : 'Cambios guardados');
    setEditando(null); setSaving(false); fetchEmpleados();
  }

  async function toggleActivo(e: any) {
    const { error } = await supabase.from('empleados').update({ activo: !e.activo }).eq('id', e.id);
    if (error) { toast.error(error.message); return; }
    fetchEmpleados();
  }

  async function verHistorial(e: any) {
    setHistEmp(e); setHistData([]);
    const { data } = await supabase.from('empleado_sueldo_historial').select('*').eq('empleado_id', e.id).order('changed_at', { ascending: false });
    setHistData(data || []);
  }

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const edad = calcEdad(form.fecha_nacimiento);
  const orig = (!nuevo && editando) ? (empleados.find((e) => e.id === editando) || {}) : { sd_fiscal: 0, sd_real: 0, infonavit: 0 };
  const sueldoCambio = Object.keys(CAMPOS_SUELDO).some((c) => +(orig[c] || 0) !== +(form[c] || 0));

  return (
    <PageEnter>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">{empleados.filter((e) => e.activo).length} activos · {empleados.length} en total</p>
        </div>
        <div className="hstack" style={{ gap: 10 }}>
          <div className="search-box">
            <Icon name="search" size={15} style={{ color: 'var(--ink-400)' }} />
            <input placeholder="Buscar nombre, puesto, RFC…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          {canEdit && <button className="btn btn-primary" onClick={abrirNuevo}><Icon name="user-plus" size={15} /> Agregar</button>}
        </div>
      </div>

      <div className="hstack" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
        <div className="segmented">
          {(['activos', 'bajas', 'todos'] as const).map((x) => (
            <button key={x} className={filtro === x ? 'active' : ''} onClick={() => setFiltro(x)} style={{ textTransform: 'capitalize' }}>{x}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nomex</th><th>Nombre</th><th>Área</th><th>Puesto</th><th>Esquema</th>
                <th className="right">S. fiscal</th><th className="right">S. real</th><th className="right">Infonavit</th>
                <th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.id} className={!e.activo ? 'row-inactive' : ''}>
                  <td className="mono">{e.id_nomex || e.id_toka || '—'}</td>
                  <td>
                    <div className="fw-600">{e.nombre}</div>
                    <div className="text-xs muted">{e.correo || ''}</div>
                  </td>
                  <td><span className="badge badge-gray">{e.area || '—'}</span></td>
                  <td className="muted">{e.puesto || '—'}</td>
                  <td className="muted">{e.esquema_pago || '—'}</td>
                  <td className="right mono">{fmt(e.sd_fiscal)}</td>
                  <td className="right mono">{fmt(e.sd_real)}</td>
                  <td className="right mono">{fmt(e.infonavit)}</td>
                  <td><span className={`badge ${e.activo ? 'badge-green' : 'badge-gray'}`}><span className="dot" />{e.activo ? 'Activo' : 'Baja'}</span></td>
                  <td>
                    <div className="hstack" style={{ gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => verHistorial(e)} title="Historial de sueldo"><Icon name="history" size={14} /></button>
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => abrirEdicion(e)} title="Editar"><Icon name="edit" size={14} /></button>}
                      {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => toggleActivo(e)} title={e.activo ? 'Dar de baja' : 'Reactivar'}>{e.activo ? 'Baja' : 'Alta'}</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length === 0 && <tr><td colSpan={10}><div className="empty"><div className="empty-title">Sin empleados</div></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal edición */}
      {editando && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditando(null)}>
          <div className="modal modal-lg page-enter">
            <div className="modal-header">
              <h3 className="modal-title">{nuevo ? 'Nuevo empleado' : 'Editar empleado'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Identificadores</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">ID Nomex</label><input className="field-input" type="number" value={form.id_nomex ?? ''} onChange={(e) => f('id_nomex', e.target.value)} /></div>
                <div><label className="field-label">ID Banco</label><input className="field-input" type="number" value={form.id_banco ?? ''} onChange={(e) => f('id_banco', e.target.value)} /></div>
                <div><label className="field-label">ID Toka</label><input className="field-input" type="number" value={form.id_toka ?? ''} onChange={(e) => f('id_toka', e.target.value)} /></div>
              </div>

              <div className="form-section-title">Datos generales</div>
              <div className="form-grid"><div><label className="field-label">Nombre completo *</label><input className="field-input" value={form.nombre || ''} onChange={(e) => f('nombre', e.target.value)} /></div></div>
              <div className="form-grid form-grid-2" style={{ marginTop: 14 }}>
                <div><label className="field-label">Puesto</label><input className="field-input" value={form.puesto || ''} onChange={(e) => f('puesto', e.target.value)} /></div>
                <div><label className="field-label">Área</label>
                  <select className="field-input" value={form.area || ''} onChange={(e) => f('area', e.target.value)}>
                    <option value="">—</option>{AREAS.map((a) => <option key={a}>{a}</option>)}{form.area && !AREAS.includes(form.area) && <option>{form.area}</option>}
                  </select>
                </div>
              </div>
              <div className="form-grid form-grid-2" style={{ marginTop: 14 }}>
                <div><label className="field-label">Jefe inmediato</label><input className="field-input" value={form.jefe_inmediato || ''} onChange={(e) => f('jefe_inmediato', e.target.value)} /></div>
                <div><label className="field-label">Fecha de ingreso</label><input className="field-input" type="date" value={form.fecha_ingreso || ''} onChange={(e) => f('fecha_ingreso', e.target.value)} /></div>
              </div>
              <div className="form-grid form-grid-3" style={{ marginTop: 14 }}>
                <div><label className="field-label">Turno</label><select className="field-input" value={form.turno ?? ''} onChange={(e) => f('turno', e.target.value)}><option value="">—</option>{TURNOS.map((t) => <option key={t} value={t}>Turno {t}</option>)}</select></div>
                <div><label className="field-label">Horario</label><input className="field-input" value={form.horario || ''} placeholder="7:00 am - 3:00 pm" onChange={(e) => f('horario', e.target.value)} /></div>
                <div><label className="field-label">Esquema de pago</label><select className="field-input" value={form.esquema_pago || ''} onChange={(e) => f('esquema_pago', e.target.value)}><option value="">—</option>{ESQUEMAS.map((s) => <option key={s}>{s}</option>)}</select></div>
              </div>

              <div className="form-section-title">Datos personales</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">Nacimiento{edad != null ? ` (${edad} años)` : ''}</label><input className="field-input" type="date" value={form.fecha_nacimiento || ''} onChange={(e) => f('fecha_nacimiento', e.target.value)} /></div>
                <div><label className="field-label">Sexo</label><select className="field-input" value={form.sexo || ''} onChange={(e) => f('sexo', e.target.value)}><option value="">—</option>{SEXOS.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label className="field-label">Estado civil</label><select className="field-input" value={form.estado_civil || ''} onChange={(e) => f('estado_civil', e.target.value)}><option value="">—</option>{ESTADO_CIVIL.map((s) => <option key={s}>{s}</option>)}{form.estado_civil && !ESTADO_CIVIL.includes(form.estado_civil) && <option>{form.estado_civil}</option>}</select></div>
              </div>
              <div className="form-grid" style={{ marginTop: 14 }}><div><label className="field-label">Escolaridad</label><select className="field-input" value={form.escolaridad || ''} onChange={(e) => f('escolaridad', e.target.value)}><option value="">—</option>{ESCOLARIDAD.map((s) => <option key={s}>{s}</option>)}{form.escolaridad && !ESCOLARIDAD.includes(form.escolaridad) && <option>{form.escolaridad}</option>}</select></div></div>

              <div className="form-section-title">Datos fiscales</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">RFC</label><input className="field-input mono" value={form.rfc || ''} onChange={(e) => f('rfc', e.target.value.toUpperCase())} /></div>
                <div><label className="field-label">CURP</label><input className="field-input mono" value={form.curp || ''} onChange={(e) => f('curp', e.target.value.toUpperCase())} /></div>
                <div><label className="field-label">NSS</label><input className="field-input mono" value={form.nss || ''} onChange={(e) => f('nss', e.target.value)} /></div>
              </div>

              <div className="form-section-title">Domicilio</div>
              <div className="form-grid"><div><label className="field-label">Domicilio</label><input className="field-input" value={form.domicilio || ''} onChange={(e) => f('domicilio', e.target.value)} /></div></div>
              <div className="form-grid form-grid-3" style={{ marginTop: 14 }}>
                <div><label className="field-label">Colonia</label><input className="field-input" value={form.colonia || ''} onChange={(e) => f('colonia', e.target.value)} /></div>
                <div><label className="field-label">Municipio</label><input className="field-input" value={form.municipio || ''} onChange={(e) => f('municipio', e.target.value)} /></div>
                <div><label className="field-label">C.P.</label><input className="field-input" value={form.codigo_postal || ''} onChange={(e) => f('codigo_postal', e.target.value)} /></div>
              </div>

              <div className="form-section-title">Contacto</div>
              <div className="form-grid form-grid-2">
                <div><label className="field-label">Teléfono</label><input className="field-input" value={form.telefono || ''} onChange={(e) => f('telefono', e.target.value)} /></div>
                <div><label className="field-label">Correo</label><input className="field-input" type="email" value={form.correo || ''} onChange={(e) => f('correo', e.target.value)} /></div>
              </div>

              <div className="form-section-title">Contacto de emergencia</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">Nombre</label><input className="field-input" value={form.contacto_nombre || ''} onChange={(e) => f('contacto_nombre', e.target.value)} /></div>
                <div><label className="field-label">Parentesco</label><input className="field-input" value={form.contacto_parentesco || ''} onChange={(e) => f('contacto_parentesco', e.target.value)} /></div>
                <div><label className="field-label">Teléfono</label><input className="field-input" value={form.contacto_telefono || ''} onChange={(e) => f('contacto_telefono', e.target.value)} /></div>
              </div>

              <div className="form-section-title">Nómina (sueldos e Infonavit)</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">Sueldo semanal fiscal</label><input className="field-input mono" type="number" step="0.01" value={form.sd_fiscal ?? 0} onChange={(e) => f('sd_fiscal', e.target.value)} /></div>
                <div><label className="field-label">Sueldo semanal real</label><input className="field-input mono" type="number" step="0.01" value={form.sd_real ?? 0} onChange={(e) => f('sd_real', e.target.value)} /></div>
                <div><label className="field-label">Infonavit</label><input className="field-input mono" type="number" step="0.01" value={form.infonavit ?? 0} onChange={(e) => f('infonavit', e.target.value)} /></div>
              </div>
              {sueldoCambio && (
                <div style={{ marginTop: 12, background: '#FFF8E6', border: '1px solid #F4D88A', borderRadius: 'var(--r-md)', padding: 12 }}>
                  <label className="field-label">Motivo del cambio de sueldo/infonavit (se guarda en el historial)</label>
                  <input className="field-input" value={notaCambio} placeholder="Ej. Aumento anual, ajuste de infonavit…" onChange={(e) => setNotaCambio(e.target.value)} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving || !form.nombre}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial */}
      {histEmp && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setHistEmp(null)}>
          <div className="modal page-enter">
            <div className="modal-header">
              <h3 className="modal-title">Historial de sueldo — {histEmp.nombre}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setHistEmp(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              {histData.length === 0 ? (
                <div className="empty"><div className="empty-title">Sin cambios registrados</div></div>
              ) : (
                <table className="tbl">
                  <thead><tr><th>Fecha</th><th>Concepto</th><th className="right">Anterior</th><th className="right">Nuevo</th><th>Usuario</th><th>Nota</th></tr></thead>
                  <tbody>
                    {histData.map((h) => (
                      <tr key={h.id}>
                        <td className="muted text-xs">{fmtFechaHora(h.changed_at)}</td>
                        <td><span className="badge badge-gray">{CAMPOS_SUELDO[h.campo] || h.campo}</span></td>
                        <td className="right mono">{fmt(h.valor_anterior)}</td>
                        <td className={`right mono ${(h.valor_nuevo || 0) >= (h.valor_anterior || 0) ? 'pos' : 'neg'}`}>{fmt(h.valor_nuevo)}</td>
                        <td className="muted text-xs">{h.changed_by_nombre || '—'}</td>
                        <td className="muted text-xs">{h.nota || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setHistEmp(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </PageEnter>
  );
}
