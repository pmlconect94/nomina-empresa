import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { calcEdad, fmtFecha } from '@/lib/format';
import { Icon } from '@/components/Icon';
import { PageEnter } from '@/components/motion';
import { SueldoModal } from './SueldoModal';

const AREAS = ['Administración', 'Cobranza', 'Contabilidad', 'Logistica/Almacen', 'Recursos Humanos', 'Ventas'];
const ESQUEMAS = ['Semanal', 'Quincenal'];
const SEXOS = ['Masculino', 'Femenino'];
const ESTADO_CIVIL = ['Soltero', 'Soltera', 'Casado', 'Casada', 'Union libre', 'Viudo', 'Viuda', 'Divorciado', 'Divorciada'];
const ESCOLARIDAD = ['Primaria', 'Secundaria', 'Preparatoria', 'Licenciatura', 'Maestría', 'Universidad', 'Doctorado'];
const TURNOS = [1, 2, 3];

function Campo({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs muted" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div>{value || <span className="zero">—</span>}</div>
    </div>
  );
}

export function EmpleadosPage() {
  const { user, reauth } = useAuth();
  const canEdit = user?.rol === 'admin';
  const canSueldo = user?.rol === 'admin' || user?.rol === 'editor';
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'activos' | 'bajas' | 'todos'>('activos');
  const [editando, setEditando] = useState<any>(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [verEmp, setVerEmp] = useState<any>(null);          // tarjeta de detalle
  const [sueldoEmp, setSueldoEmp] = useState<any>(null);    // pantalla SUELDO

  // Candado de contraseña genérico { emp, action: 'sueldo' | 'imss-off' }
  const [gate, setGate] = useState<any>(null);
  const [gatePass, setGatePass] = useState('');
  const [gateBusy, setGateBusy] = useState(false);

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
      r = r.filter((e) => [e.nombre, e.puesto, e.area, e.rfc, e.id_nomex, e.id_toka].some((v) => v && String(v).toLowerCase().includes(t)));
    }
    return r;
  }, [empleados, filtro, busqueda]);

  function abrirNuevo() {
    setForm({ activo: true, alta_imss: false, ubicacion: 'Matriz', razon_social: 'Productos Marinos Lizarraga, S. de R.L. de C.V.', esquema_pago: 'Semanal' });
    setNuevo(true); setEditando('nuevo');
  }
  function abrirEdicion(e: any) { setForm({ ...e }); setNuevo(false); setVerEmp(null); setEditando(e.id); }

  async function guardar() {
    if (!form.nombre) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    const num = (v: any) => (v === '' || v == null ? null : Number(v));
    const txt = (v: any) => (v === '' || v == null ? null : v);
    const data: any = {
      id_nomex: num(form.id_nomex), id_banco: num(form.id_banco), id_toka: num(form.id_toka),
      nombre: form.nombre, activo: form.activo !== false, alta_imss: form.alta_imss === true,
      fecha_ingreso: txt(form.fecha_ingreso), puesto: txt(form.puesto), area: txt(form.area),
      jefe_inmediato: txt(form.jefe_inmediato), ubicacion: txt(form.ubicacion), razon_social: txt(form.razon_social),
      turno: num(form.turno), horario: txt(form.horario), esquema_pago: txt(form.esquema_pago),
      fecha_nacimiento: txt(form.fecha_nacimiento), sexo: txt(form.sexo), estado_civil: txt(form.estado_civil),
      escolaridad: txt(form.escolaridad), rfc: txt(form.rfc), curp: txt(form.curp), nss: txt(form.nss),
      domicilio: txt(form.domicilio), colonia: txt(form.colonia), municipio: txt(form.municipio), codigo_postal: txt(form.codigo_postal),
      telefono: txt(form.telefono), correo: txt(form.correo),
      contacto_nombre: txt(form.contacto_nombre), contacto_parentesco: txt(form.contacto_parentesco), contacto_telefono: txt(form.contacto_telefono),
    };
    const { error } = nuevo
      ? await supabase.from('empleados').insert(data)
      : await supabase.from('empleados').update(data).eq('id', editando);
    if (error) { toast.error('Error: ' + error.message); setSaving(false); return; }
    toast.success(nuevo ? 'Empleado creado' : 'Cambios guardados');
    setEditando(null); setSaving(false); fetchEmpleados();
  }

  async function setImss(e: any, val: boolean) {
    setEmpleados((prev) => prev.map((x) => x.id === e.id ? { ...x, alta_imss: val } : x));
    const { error } = await supabase.from('empleados').update({ alta_imss: val }).eq('id', e.id);
    if (error) { toast.error(error.message); fetchEmpleados(); }
  }
  function onToggleImss(e: any) {
    if (!canEdit) return;
    if (!e.alta_imss) setImss(e, true);                 // off → on: libre
    else { setGate({ emp: e, action: 'imss-off' }); setGatePass(''); }  // on → off: requiere autorización
  }

  async function confirmarGate() {
    if (!gatePass) return;
    setGateBusy(true);
    const ok = await reauth(gatePass);
    setGateBusy(false);
    if (!ok) { toast.error('Contraseña incorrecta'); setGatePass(''); return; }
    const g = gate; setGate(null); setGatePass('');
    if (g.action === 'sueldo') setSueldoEmp(g.emp);
    else if (g.action === 'imss-off') setImss(g.emp, false);
  }

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const edad = calcEdad(form.fecha_nacimiento);

  return (
    <PageEnter>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empleados</h1>
          <p className="page-subtitle">{empleados.filter((e) => e.activo).length} activos · {empleados.length} en total</p>
        </div>
        <div className="hstack" style={{ gap: 10 }}>
          {/* form con autoComplete off para que el navegador no rellene la búsqueda */}
          <form className="search-box" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <Icon name="search" size={15} style={{ color: 'var(--ink-400)' }} />
            <input name="buscar_empleado_x" autoComplete="off" placeholder="Buscar nombre, puesto, RFC…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </form>
          {canEdit && <button className="btn btn-primary" onClick={abrirNuevo}><Icon name="user-plus" size={15} /> Agregar</button>}
        </div>
      </div>

      <div className="hstack" style={{ marginBottom: 12 }}>
        <div className="segmented">
          {(['activos', 'bajas', 'todos'] as const).map((x) => (
            <button key={x} className={filtro === x ? 'active' : ''} onClick={() => setFiltro(x)} style={{ textTransform: 'capitalize' }}>{x}</button>
          ))}
        </div>
      </div>

      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Nomex</th><th>Nombre</th><th>Área</th><th>Puesto</th><th>Esquema</th>
              <th className="center">Alta IMSS</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr key={e.id} className={!e.activo ? 'row-inactive' : ''}>
                <td className="mono">{e.id_nomex || e.id_toka || '—'}</td>
                <td><div className="fw-600">{e.nombre}</div><div className="text-xs muted">{e.correo || ''}</div></td>
                <td><span className="badge badge-gray">{e.area || '—'}</span></td>
                <td className="muted">{e.puesto || '—'}</td>
                <td className="muted">{e.esquema_pago || '—'}</td>
                <td className="center">
                  <div className="hstack" style={{ gap: 8, justifyContent: 'center' }}>
                    <button className={`switch ${e.alta_imss ? 'on' : ''}`} onClick={() => onToggleImss(e)} disabled={!canEdit} title={e.alta_imss ? 'Apagar requiere autorización' : 'Activar alta IMSS'} />
                    <span className={`text-xs ${e.alta_imss ? 'pos' : 'muted'}`}>{e.alta_imss ? 'Transf. + vales' : 'Efectivo'}</span>
                  </div>
                </td>
                <td><span className={`badge ${e.activo ? 'badge-green' : 'badge-gray'}`}><span className="dot" />{e.activo ? 'Activo' : 'Baja'}</span></td>
                <td>
                  <div className="hstack" style={{ gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setVerEmp(e)} title="Ver tarjeta"><Icon name="file-text" size={14} /></button>
                    {canSueldo && <button className="btn btn-outline btn-sm" onClick={() => { setGate({ emp: e, action: 'sueldo' }); setGatePass(''); }} title="Sueldo (protegido)"><Icon name="lock" size={13} /> Sueldo</button>}
                  </div>
                </td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={8}><div className="empty"><div className="empty-title">Sin empleados</div></div></td></tr>}
          </tbody>
        </table>
      </div>

      {/* Tarjeta de detalle (solo lectura) */}
      {verEmp && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setVerEmp(null)}>
          <div className="modal page-enter" style={{ maxWidth: 900, width: '92vw' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{verEmp.nombre}</h3>
                <div className="text-xs muted">{verEmp.puesto || '—'} · {verEmp.area || '—'} · {verEmp.activo ? 'Activo' : 'Baja'}</div>
              </div>
              <div className="hstack" style={{ gap: 6 }}>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => abrirEdicion(verEmp)}><Icon name="edit" size={13} /> Editar</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => setVerEmp(null)}><Icon name="x" size={16} /></button>
              </div>
            </div>
            <div className="modal-body">
              <div className="form-section-title">Identificadores</div>
              <div className="grid grid-3"><Campo label="ID Nomex" value={verEmp.id_nomex} /><Campo label="ID Banco" value={verEmp.id_banco} /><Campo label="ID Toka" value={verEmp.id_toka} /></div>
              <div className="form-section-title">Datos generales</div>
              <div className="grid grid-3">
                <Campo label="Jefe inmediato" value={verEmp.jefe_inmediato} /><Campo label="Fecha de ingreso" value={fmtFecha(verEmp.fecha_ingreso)} /><Campo label="Esquema" value={verEmp.esquema_pago} />
                <Campo label="Turno" value={verEmp.turno ? `Turno ${verEmp.turno}` : null} /><Campo label="Horario" value={verEmp.horario} /><Campo label="Alta IMSS" value={verEmp.alta_imss ? 'Sí (transf. + vales)' : 'No (efectivo)'} />
                <Campo label="Ubicación" value={verEmp.ubicacion} /><Campo label="Razón social" value={verEmp.razon_social} />
              </div>
              <div className="form-section-title">Datos personales</div>
              <div className="grid grid-3">
                <Campo label="Nacimiento" value={verEmp.fecha_nacimiento ? `${fmtFecha(verEmp.fecha_nacimiento)} (${calcEdad(verEmp.fecha_nacimiento)} años)` : null} />
                <Campo label="Sexo" value={verEmp.sexo} /><Campo label="Estado civil" value={verEmp.estado_civil} /><Campo label="Escolaridad" value={verEmp.escolaridad} />
              </div>
              <div className="form-section-title">Fiscales</div>
              <div className="grid grid-3"><Campo label="RFC" value={verEmp.rfc} /><Campo label="CURP" value={verEmp.curp} /><Campo label="NSS" value={verEmp.nss} /></div>
              <div className="form-section-title">Domicilio</div>
              <div className="grid grid-3" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                <Campo label="Domicilio" value={verEmp.domicilio} /><Campo label="Colonia" value={verEmp.colonia} /><Campo label="Municipio / CP" value={[verEmp.municipio, verEmp.codigo_postal].filter(Boolean).join(' · ')} />
              </div>
              <div className="form-section-title">Contacto</div>
              <div className="grid grid-3">
                <Campo label="Teléfono" value={verEmp.telefono} /><Campo label="Correo" value={verEmp.correo} />
                <Campo label="Emergencia" value={verEmp.contacto_nombre ? `${verEmp.contacto_nombre} (${verEmp.contacto_parentesco || '—'}) ${verEmp.contacto_telefono || ''}` : null} />
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setVerEmp(null)}>Cerrar</button></div>
          </div>
        </div>
      )}

      {/* Crear / Editar */}
      {editando && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setEditando(null)}>
          <div className="modal page-enter" style={{ maxWidth: 1180, width: '96vw' }}>
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
              <div className="form-grid form-grid-2" style={{ marginTop: 10 }}>
                <div><label className="field-label">Puesto</label><input className="field-input" value={form.puesto || ''} onChange={(e) => f('puesto', e.target.value)} /></div>
                <div><label className="field-label">Área</label><select className="field-input" value={form.area || ''} onChange={(e) => f('area', e.target.value)}><option value="">—</option>{AREAS.map((a) => <option key={a}>{a}</option>)}{form.area && !AREAS.includes(form.area) && <option>{form.area}</option>}</select></div>
              </div>
              <div className="form-grid form-grid-2" style={{ marginTop: 10 }}>
                <div><label className="field-label">Jefe inmediato</label><input className="field-input" value={form.jefe_inmediato || ''} onChange={(e) => f('jefe_inmediato', e.target.value)} /></div>
                <div><label className="field-label">Fecha de ingreso</label><input className="field-input" type="date" value={form.fecha_ingreso || ''} onChange={(e) => f('fecha_ingreso', e.target.value)} /></div>
              </div>
              <div className="form-grid form-grid-3" style={{ marginTop: 10 }}>
                <div><label className="field-label">Turno</label><select className="field-input" value={form.turno ?? ''} onChange={(e) => f('turno', e.target.value)}><option value="">—</option>{TURNOS.map((t) => <option key={t} value={t}>Turno {t}</option>)}</select></div>
                <div><label className="field-label">Horario</label><input className="field-input" value={form.horario || ''} placeholder="7:00 am - 3:00 pm" onChange={(e) => f('horario', e.target.value)} /></div>
                <div><label className="field-label">Esquema de pago</label><select className="field-input" value={form.esquema_pago || ''} onChange={(e) => f('esquema_pago', e.target.value)}><option value="">—</option>{ESQUEMAS.map((s) => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="form-grid form-grid-2" style={{ marginTop: 10 }}>
                <div><label className="field-label">Ubicación</label><input className="field-input" value={form.ubicacion || ''} onChange={(e) => f('ubicacion', e.target.value)} /></div>
                <div><label className="field-label">Razón social</label><input className="field-input" value={form.razon_social || ''} onChange={(e) => f('razon_social', e.target.value)} /></div>
              </div>
              <div className="form-section-title">Datos personales</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">Nacimiento{edad != null ? ` (${edad} años)` : ''}</label><input className="field-input" type="date" value={form.fecha_nacimiento || ''} onChange={(e) => f('fecha_nacimiento', e.target.value)} /></div>
                <div><label className="field-label">Sexo</label><select className="field-input" value={form.sexo || ''} onChange={(e) => f('sexo', e.target.value)}><option value="">—</option>{SEXOS.map((s) => <option key={s}>{s}</option>)}</select></div>
                <div><label className="field-label">Estado civil</label><select className="field-input" value={form.estado_civil || ''} onChange={(e) => f('estado_civil', e.target.value)}><option value="">—</option>{ESTADO_CIVIL.map((s) => <option key={s}>{s}</option>)}{form.estado_civil && !ESTADO_CIVIL.includes(form.estado_civil) && <option>{form.estado_civil}</option>}</select></div>
              </div>
              <div className="form-grid" style={{ marginTop: 10 }}><div><label className="field-label">Escolaridad</label><select className="field-input" value={form.escolaridad || ''} onChange={(e) => f('escolaridad', e.target.value)}><option value="">—</option>{ESCOLARIDAD.map((s) => <option key={s}>{s}</option>)}{form.escolaridad && !ESCOLARIDAD.includes(form.escolaridad) && <option>{form.escolaridad}</option>}</select></div></div>
              <div className="form-section-title">Datos fiscales</div>
              <div className="form-grid form-grid-3">
                <div><label className="field-label">RFC</label><input className="field-input mono" value={form.rfc || ''} onChange={(e) => f('rfc', e.target.value.toUpperCase())} /></div>
                <div><label className="field-label">CURP</label><input className="field-input mono" value={form.curp || ''} onChange={(e) => f('curp', e.target.value.toUpperCase())} /></div>
                <div><label className="field-label">NSS</label><input className="field-input mono" value={form.nss || ''} onChange={(e) => f('nss', e.target.value)} /></div>
              </div>
              <div className="form-section-title">Domicilio</div>
              <div className="form-grid"><div><label className="field-label">Domicilio</label><input className="field-input" value={form.domicilio || ''} onChange={(e) => f('domicilio', e.target.value)} /></div></div>
              <div className="form-grid form-grid-3" style={{ marginTop: 10 }}>
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
              <p className="text-xs muted" style={{ marginTop: 14 }}>Sueldo, infonavit, descuentos y altas/bajas se gestionan en el botón <strong>Sueldo</strong> (protegido).</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving || !form.nombre}>{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Candado de contraseña */}
      {gate && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setGate(null)}>
          <div className="modal page-enter" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title"><Icon name="lock" size={15} /> {gate.action === 'sueldo' ? 'Acceso a sueldos' : 'Quitar Alta IMSS'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setGate(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="modal-body">
              <p className="muted text-sm" style={{ marginTop: 0 }}>
                {gate.action === 'sueldo'
                  ? <>Confirma tu contraseña para ver/editar el sueldo de <strong>{gate.emp.nombre}</strong>.</>
                  : <>Quitar la Alta IMSS de <strong>{gate.emp.nombre}</strong> requiere autorización. Confirma tu contraseña.</>}
              </p>
              <input type="text" name="usuario_ro" value={user?.email || ''} readOnly autoComplete="username" tabIndex={-1} style={{ position: 'absolute', left: '-9999px' }} />
              <label className="field-label">Contraseña</label>
              <input className="field-input" type="password" autoComplete="current-password" autoFocus value={gatePass} placeholder="Tu contraseña" onChange={(e) => setGatePass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmarGate()} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setGate(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarGate} disabled={gateBusy || !gatePass}>{gateBusy ? 'Verificando…' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {sueldoEmp && <SueldoModal empleado={sueldoEmp} onClose={() => setSueldoEmp(null)} onChanged={fetchEmpleados} />}
    </PageEnter>
  );
}
