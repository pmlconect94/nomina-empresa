import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { fmt, nomexLabel } from '@/lib/format';

export function TabFiscal({ calcData, nominas, canEdit }: any) {
  const [vals, setVals] = useState<Record<string, number>>({});
  const [sortNomex, setSortNomex] = useState<1 | -1 | 0>(1); // 1 = ID NOMEX ascendente por defecto

  const getVal = (empId: string, campo: string) => {
    const k = `${empId}_${campo}`;
    if (vals[k] !== undefined) return vals[k];
    return nominas[empId]?.[campo] ?? 0;
  };
  async function update(empId: string, campo: string, valor: string) {
    const n = parseFloat(valor) || 0;
    setVals((v) => ({ ...v, [`${empId}_${campo}`]: n }));
    const nom = nominas[empId];
    if (nom) await supabase.from('nominas').update({ [campo]: n }).eq('id', nom.id);
  }

  const rows = useMemo(() => {
    if (!sortNomex) return calcData;
    return [...calcData].sort((a, b) => {
      const va = a.empleado.id_nomex ?? Number.MAX_SAFE_INTEGER, vb = b.empleado.id_nomex ?? Number.MAX_SAFE_INTEGER;
      return (va - vb) * sortNomex;
    });
  }, [calcData, sortNomex]);

  const totISR = calcData.reduce((s: number, d: any) => s + (+getVal(d.empleado.id, 'isr') || 0), 0);
  const totIMSS = calcData.reduce((s: number, d: any) => s + (+getVal(d.empleado.id, 'imss') || 0), 0);
  const totDep = calcData.reduce((s: number, d: any) => s + (d.calc.altaImss ? (+getVal(d.empleado.id, 'deposito_total') || 0) : 0), 0);
  const totVales = calcData.reduce((s: number, d: any) => s + (d.calc.vales || 0), 0);

  return (
    <div>
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="kpi"><span className="kpi-label">Total ISR</span><span className="kpi-value neg">{fmt(totISR)}</span></div>
        <div className="kpi"><span className="kpi-label">Total IMSS</span><span className="kpi-value neg">{fmt(totIMSS)}</span></div>
        <div className="kpi"><span className="kpi-label">Total depósito</span><span className="kpi-value orange">{fmt(totDep)}</span></div>
        <div className="kpi"><span className="kpi-label">Total vales</span><span className="kpi-value orange">{fmt(totVales)}</span></div>
      </div>
      <p className="text-xs muted" style={{ marginTop: 0, marginBottom: 8 }}>Los empleados <strong>sin Alta IMSS</strong> aparecen en gris: todo su pago va a efectivo (sin parte fiscal).</p>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th onClick={() => setSortNomex((s) => (s === 1 ? -1 : 1))} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ID NOMEX <span style={{ opacity: sortNomex ? 1 : 0.25 }}>{sortNomex === 1 ? '▲' : sortNomex === -1 ? '▼' : '↕'}</span>
              </th>
              <th>Empleado</th><th className="right">Sueldo fiscal</th><th className="right">Prev. social</th><th className="right">ISR</th><th className="right">IMSS</th><th className="right">Dep. total</th><th className="right">Vales</th><th className="right">Dep. banco</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ empleado: e, calc: c }: any) => {
              const sinImss = !c.altaImss;
              const vales = c.vales || 0;
              const isr = +getVal(e.id, 'isr') || 0, imss = +getVal(e.id, 'imss') || 0, dep = sinImss ? 0 : (+getVal(e.id, 'deposito_total') || 0);
              return (
                <tr key={e.id} className={sinImss ? 'row-inactive' : ''}>
                  <td className="mono fw-600">{nomexLabel(e)}</td>
                  <td><div className="fw-600">{e.nombre}</div><div className="text-xs muted">{e.area}</div></td>
                  {sinImss ? (
                    <td className="center muted" colSpan={6}>Sin Alta IMSS — todo a efectivo</td>
                  ) : (
                    <>
                      <td className="right mono orange">{fmt(c.sueldoFiscalPeriodo)}</td>
                      <td className="right mono orange">{fmt(c.prevSocial)}</td>
                      <td className="right">{canEdit ? <input className="field-input mono" type="number" value={isr} onChange={(ev) => update(e.id, 'isr', ev.target.value)} style={{ width: 90, textAlign: 'right' }} /> : <span className="mono">{fmt(isr)}</span>}</td>
                      <td className="right">{canEdit ? <input className="field-input mono" type="number" value={imss} onChange={(ev) => update(e.id, 'imss', ev.target.value)} style={{ width: 90, textAlign: 'right' }} /> : <span className="mono">{fmt(imss)}</span>}</td>
                      <td className="right">{canEdit ? <input className="field-input mono" type="number" value={dep} onChange={(ev) => update(e.id, 'deposito_total', ev.target.value)} style={{ width: 100, textAlign: 'right' }} /> : <span className="mono">{fmt(dep)}</span>}</td>
                    </>
                  )}
                  <td className="right mono orange">{sinImss ? '—' : fmt(vales)}</td>
                  <td className="right mono orange">{sinImss ? '—' : fmt(Math.max(0, dep - vales))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
