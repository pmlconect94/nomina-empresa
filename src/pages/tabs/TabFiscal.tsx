import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, nomexLabel } from '@/lib/format';

export function TabFiscal({ calcData, nominas, canEdit }: any) {
  const [vals, setVals] = useState<Record<string, any>>({});
  const [sortNomex, setSortNomex] = useState<1 | -1 | 0>(1); // 1 = ID NOMEX ascendente por defecto

  // Valor "crudo" del campo: lo editado en memoria, o lo que viene de la nómina.
  const getRaw = (empId: string, campo: string) => {
    const k = `${empId}_${campo}`;
    if (vals[k] !== undefined) return vals[k];
    return nominas[empId]?.[campo];
  };
  const getNum = (empId: string, campo: string) => parseFloat(getRaw(empId, campo)) || 0;

  async function update(empId: string, campo: string, valor: string | number | null) {
    const n = valor === null || valor === '' ? null : (parseFloat(String(valor)) || 0);
    setVals((v) => ({ ...v, [`${empId}_${campo}`]: n }));
    const nom = nominas[empId];
    if (nom) {
      nom[campo] = n; // sincroniza el objeto en memoria (sobrevive al cambiar de pestaña)
      await supabase.from('nominas').update({ [campo]: n }).eq('id', nom.id);
    }
  }

  // Depósito fiscal calculado EN VIVO (usa ISR/IMSS actuales de la tabla).
  const depFiscalDe = (e: any, c: any) => {
    const isr = getNum(e.id, 'isr'), imss = getNum(e.id, 'imss');
    return c.sueldoFiscalPeriodo + c.vales + c.prevSocial - (c.totalDed + isr + imss);
  };
  // Depósito corregido mostrado: el capturado, o el fiscal por defecto.
  const corregidoDe = (e: any, c: any) => {
    const raw = getRaw(e.id, 'deposito_corregido');
    const tiene = raw !== null && raw !== undefined && raw !== '';
    return tiene ? (parseFloat(String(raw)) || 0) : depFiscalDe(e, c);
  };
  const esCorregido = (e: any) => {
    const raw = getRaw(e.id, 'deposito_corregido');
    return raw !== null && raw !== undefined && raw !== '';
  };

  const rows = useMemo(() => {
    if (!sortNomex) return calcData;
    return [...calcData].sort((a, b) => {
      const va = a.empleado.id_nomex ?? Number.MAX_SAFE_INTEGER, vb = b.empleado.id_nomex ?? Number.MAX_SAFE_INTEGER;
      return (va - vb) * sortNomex;
    });
  }, [calcData, sortNomex]);

  const totISR = calcData.reduce((s: number, d: any) => s + getNum(d.empleado.id, 'isr'), 0);
  const totIMSS = calcData.reduce((s: number, d: any) => s + getNum(d.empleado.id, 'imss'), 0);
  const totDep = calcData.reduce((s: number, d: any) => s + (d.calc.altaImss ? corregidoDe(d.empleado, d.calc) : 0), 0);
  const totVales = calcData.reduce((s: number, d: any) => s + (d.calc.vales || 0), 0);

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi"><span className="kpi-label">Total ISR</span><span className="kpi-value neg">{fmt(totISR)}</span></div>
        <div className="kpi"><span className="kpi-label">Total IMSS</span><span className="kpi-value neg">{fmt(totIMSS)}</span></div>
        <div className="kpi"><span className="kpi-label">Total depósito</span><span className="kpi-value orange">{fmt(totDep)}</span></div>
        <div className="kpi"><span className="kpi-label">Total vales</span><span className="kpi-value orange">{fmt(totVales)}</span></div>
      </div>
      <p className="text-xs muted" style={{ marginTop: 0, marginBottom: 8 }}>
        El <strong>Depósito fiscal</strong> se calcula (sueldo fiscal + vales + previsión − todas las deducciones, ISR e IMSS incluidos).
        Si no coincide con el sistema de timbrado, captura el <strong>Dep. corregido</strong> (se usa para banco y efectivo). Empleados <strong>sin Alta IMSS</strong> en gris: todo a efectivo.
      </p>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th onClick={() => setSortNomex((s) => (s === 1 ? -1 : 1))} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ID NOMEX <span style={{ opacity: sortNomex ? 1 : 0.25 }}>{sortNomex === 1 ? '▲' : sortNomex === -1 ? '▼' : '↕'}</span>
              </th>
              <th>Empleado</th>
              <th className="right">Sueldo fiscal</th><th className="right">ISR</th><th className="right">IMSS</th>
              <th className="right">Dep. fiscal</th><th className="right">Dep. corregido</th><th className="right">Vales</th><th className="right">Dep. banco</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ empleado: e, calc: c }: any) => {
              const sinImss = !c.altaImss;
              const vales = c.vales || 0;
              const isr = getNum(e.id, 'isr'), imss = getNum(e.id, 'imss');
              const depFiscal = depFiscalDe(e, c);
              const corregido = corregidoDe(e, c);
              const tiene = esCorregido(e);
              return (
                <tr key={e.id} className={sinImss ? 'row-inactive' : ''}>
                  <td className="mono fw-600">{nomexLabel(e)}</td>
                  <td><div className="fw-600">{e.nombre}</div><div className="text-xs muted">{e.area}</div></td>
                  {sinImss ? (
                    <td className="center muted" colSpan={5}>Sin Alta IMSS — todo a efectivo</td>
                  ) : (
                    <>
                      <td className="right mono orange">{fmt(c.sueldoFiscalPeriodo)}</td>
                      <td className="right">{canEdit ? <input className="field-input mono" type="number" value={isr || ''} placeholder="0" onChange={(ev) => update(e.id, 'isr', ev.target.value)} style={{ width: 90, textAlign: 'right' }} /> : <span className="mono">{fmt(isr)}</span>}</td>
                      <td className="right">{canEdit ? <input className="field-input mono" type="number" value={imss || ''} placeholder="0" onChange={(ev) => update(e.id, 'imss', ev.target.value)} style={{ width: 90, textAlign: 'right' }} /> : <span className="mono">{fmt(imss)}</span>}</td>
                      <td className="right mono" title="Depósito fiscal calculado">{fmt(depFiscal)}</td>
                      <td className="right">
                        {canEdit ? (
                          <div className="hstack" style={{ gap: 4, justifyContent: 'flex-end' }}>
                            <input
                              className="field-input mono"
                              type="number"
                              value={tiene ? (getRaw(e.id, 'deposito_corregido') ?? '') : Math.round(corregido * 100) / 100}
                              onChange={(ev) => update(e.id, 'deposito_corregido', ev.target.value)}
                              title={tiene ? 'Valor corregido (manual)' : 'Default = depósito fiscal. Edita para corregir.'}
                              style={{ width: 110, textAlign: 'right', fontWeight: tiene ? 700 : 400, color: tiene ? 'var(--red-500)' : undefined, borderColor: tiene ? 'var(--red-500)' : undefined, background: tiene ? '#FEF2F2' : undefined }}
                            />
                            {tiene && <button className="btn btn-ghost btn-sm" title="Quitar corrección (volver al fiscal)" onClick={() => update(e.id, 'deposito_corregido', null)} style={{ padding: '2px 6px' }}>↺</button>}
                          </div>
                        ) : <span className="mono" style={{ color: tiene ? 'var(--red-500)' : undefined, fontWeight: tiene ? 700 : 400 }}>{fmt(corregido)}</span>}
                      </td>
                    </>
                  )}
                  <td className="right mono orange">{sinImss ? '—' : fmt(vales)}</td>
                  <td className="right mono orange">{sinImss ? '—' : fmt(corregido - vales)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
