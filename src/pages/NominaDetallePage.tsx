import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fmtPeriodo } from '@/lib/format';
import { calcularNomina } from '@/lib/calc';
import { Icon } from '@/components/Icon';
import { TabResumen } from './tabs/TabResumen';
import { TabAsistencias } from './tabs/TabAsistencias';
import { TabComedor } from './tabs/TabComedor';
import { TabFiscal } from './tabs/TabFiscal';
import { TabPrestamosResumen } from './tabs/TabPrestamosResumen';
import { ViajesPanel } from './ViajesPage';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'asistencias', label: 'Asistencias' },
  { key: 'viajes', label: 'Viajes' },
  { key: 'comedor', label: 'Comedor' },
  { key: 'prestamos', label: 'Préstamos' },
  { key: 'fiscal', label: 'Fiscal' },
];

export function NominaDetallePage() {
  const { semanaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.rol !== 'viewer';

  const [semana, setSemana] = useState<any>(null);
  const [tab, setTab] = useState('resumen');
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [nominas, setNominas] = useState<Record<string, any>>({});
  const [asistencias, setAsistencias] = useState<Record<string, any[]>>({});
  const [incentivos, setIncentivos] = useState<Record<string, number>>({});
  const [prestamosDesc, setPrestamosDesc] = useState<Record<string, number>>({});
  const [prestamosData, setPrestamosData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlock, setUnlock] = useState(false);
  const [pin, setPin] = useState('');

  const timbrada = semana?.status === 'timbrada';

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data: sem } = await supabase.from('semanas').select('*').eq('id', semanaId).single();
    if (!sem) { setLoading(false); return; }
    setSemana(sem);

    const esquema = sem.tipo === 'semanal' ? 'Semanal' : 'Quincenal';
    const [empRes, nomRes, viajesRes, prestRes] = await Promise.all([
      supabase.from('empleados').select('*').eq('activo', true).eq('esquema_pago', esquema).order('nombre'),
      supabase.from('nominas').select('*').eq('semana_id', sem.id),
      supabase.from('viajes').select('*').eq('semana_id', sem.id),
      supabase.from('prestamos').select('*, empleado:empleado_id(nombre,area)').eq('activo', true),
    ]);
    setEmpleados(empRes.data || []);
    const nomMap: any = {}; (nomRes.data || []).forEach((n) => (nomMap[n.empleado_id] = n)); setNominas(nomMap);

    const nomIds = (nomRes.data || []).map((n) => n.id);
    const aMap: any = {};
    if (nomIds.length) {
      const { data: aData } = await supabase.from('asistencias').select('*').in('nomina_id', nomIds);
      (aData || []).forEach((a) => { (aMap[a.nomina_id] ||= []).push(a); });
    }
    setAsistencias(aMap);

    const iMap: any = {};
    (viajesRes.data || []).forEach((v) => {
      if (v.chofer_id) iMap[v.chofer_id] = (iMap[v.chofer_id] || 0) + (v.incent_chofer || 0);
      if (v.acompanante_id) iMap[v.acompanante_id] = (iMap[v.acompanante_id] || 0) + (v.incent_acompanante || 0);
    });
    setIncentivos(iMap);

    const fechaIni = new Date(sem.fecha_inicio + 'T12:00:00');
    const dMap: any = {};
    const activos = (prestRes.data || []).filter((p) => {
      if (p.saldo <= 0) return false;
      const fp = new Date(p.fecha_prestamo + 'T12:00:00');
      const espera = p.tipo === 'semanal' ? 7 : 15;
      const primera = new Date(fp); primera.setDate(fp.getDate() + espera);
      return fechaIni >= primera;
    });
    activos.forEach((p) => { const d = p.tipo === 'semanal' ? p.monto * 0.1 : p.monto * 0.2; dMap[p.empleado_id] = (dMap[p.empleado_id] || 0) + Math.min(d, p.saldo); });
    setPrestamosDesc(dMap); setPrestamosData(activos);
    setLoading(false);
  }, [semanaId]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (!confirm('¿Guardar y cerrar la nómina? Ya no podrá editarse.')) return;
    const ops: any[] = [];
    prestamosData.forEach((p) => {
      const bruto = p.tipo === 'semanal' ? p.monto * 0.1 : p.monto * 0.2;
      const real = parseFloat(Math.min(bruto, p.saldo).toFixed(2));
      if (real <= 0) return;
      const nuevo = parseFloat((p.saldo - real).toFixed(2));
      const nomId = nominas[p.empleado_id]?.id;
      ops.push(supabase.from('prestamos').update({ saldo: nuevo, activo: nuevo > 0 }).eq('id', p.id));
      if (nomId) ops.push(supabase.from('prestamo_descuentos').insert({ prestamo_id: p.id, nomina_id: nomId, semana_id: semana.id, monto_descontado: real, saldo_anterior: p.saldo, saldo_posterior: nuevo }));
    });
    await Promise.all(ops);
    await supabase.from('semanas').update({ status: 'timbrada', timbrada_at: new Date().toISOString() }).eq('id', semana.id);
    toast.success('Nómina guardada');
    navigate('/app/nominas');
  }

  async function desbloquear() {
    const maestro = import.meta.env.VITE_MASTER_PIN || '1424798';
    if (pin !== maestro) { toast.error('PIN incorrecto'); setPin(''); return; }
    if (!confirm('¿Desbloquear? Se revertirán los descuentos de préstamos de esta semana.')) return;
    const { data: descs } = await supabase.from('prestamo_descuentos').select('*').eq('semana_id', semana.id);
    if (descs?.length) {
      await Promise.all(descs.map((d) => supabase.from('prestamos').update({ saldo: d.saldo_anterior, activo: true }).eq('id', d.prestamo_id)));
      await supabase.from('prestamo_descuentos').delete().eq('semana_id', semana.id);
    }
    await supabase.from('semanas').update({ status: 'abierta', timbrada_at: null }).eq('id', semana.id);
    toast.success('Nómina desbloqueada');
    setUnlock(false); setPin(''); cargar();
  }

  if (loading) return <div className="loading-screen"><span className="spinner" /></div>;
  if (!semana) return <div className="empty"><div className="empty-title">Nómina no encontrada</div></div>;

  const calcData = empleados.map((e) => {
    const nom = nominas[e.id];
    const asist = nom ? (asistencias[nom.id] || []) : [];
    return { empleado: e, nomina: nom, asistencias: asist, calc: calcularNomina(e, nom, asist, incentivos[e.id] || 0, prestamosDesc[e.id] || 0) };
  });

  return (
    <div className="page-enter">
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="hstack" style={{ gap: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/nominas')}><Icon name="arrow-left" size={14} /> Nóminas</button>
          <div>
            <div className="fw-700">{fmtPeriodo(semana.fecha_inicio, semana.fecha_fin)}</div>
            <div className="text-xs muted" style={{ textTransform: 'capitalize' }}>{semana.tipo}</div>
          </div>
          <span className={`badge ${timbrada ? 'badge-green' : 'badge-blue'}`}><span className="dot" />{timbrada ? 'Guardada' : 'Abierta'}</span>
        </div>
        {canEdit && (timbrada
          ? <button className="btn btn-danger btn-sm" onClick={() => setUnlock(true)}><Icon name="lock" size={14} /> Desbloquear</button>
          : <button className="btn btn-primary" onClick={guardar}><Icon name="check" size={15} /> Guardar nómina</button>)}
      </div>

      <div className="tabs">
        {TABS.map((t) => <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'resumen' && <TabResumen calcData={calcData} semana={semana} />}
      {tab === 'asistencias' && <TabAsistencias semana={semana} nominas={nominas} empleados={empleados} asistencias={asistencias} canEdit={canEdit && !timbrada} />}
      {tab === 'viajes' && <ViajesPanel semana={semana} canEdit={canEdit && !timbrada} />}
      {tab === 'comedor' && <TabComedor nominas={nominas} empleados={empleados} canEdit={canEdit && !timbrada} />}
      {tab === 'prestamos' && <TabPrestamosResumen prestamos={prestamosData} descMap={prestamosDesc} semana={semana} />}
      {tab === 'fiscal' && <TabFiscal calcData={calcData} nominas={nominas} semana={semana} canEdit={canEdit && !timbrada} />}

      {unlock && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setUnlock(false)}>
          <div className="modal page-enter" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h3 className="modal-title">Autorización requerida</h3><button className="btn btn-ghost btn-sm" onClick={() => setUnlock(false)}><Icon name="x" size={16} /></button></div>
            <div className="modal-body">
              <p className="muted" style={{ marginTop: 0 }}>Ingresa el PIN maestro para desbloquear esta nómina.</p>
              <input className="field-input" type="password" autoFocus value={pin} placeholder="PIN" style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18 }} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && desbloquear()} />
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setUnlock(false)}>Cancelar</button><button className="btn btn-danger" onClick={desbloquear}>Autorizar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
