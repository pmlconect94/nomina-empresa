import { fmt } from '@/lib/format';
import { Icon } from '@/components/Icon';

export function TabResumen({ calcData }: { calcData: any[]; semana: any }) {
  const t = calcData.reduce((acc, d) => {
    acc.perc += d.calc.totalPerc; acc.ded += d.calc.totalDed; acc.neto += d.calc.neto;
    acc.dep += d.calc.deposito; acc.vales += d.calc.vales; acc.depBanco += d.calc.depositoBanco; acc.efectivo += d.calc.efectivo;
    return acc;
  }, { perc: 0, ded: 0, neto: 0, dep: 0, vales: 0, depBanco: 0, efectivo: 0 });

  return (
    <div>
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 className="card-title">Resumen de nómina</h3>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon name="printer" size={14} /> Imprimir</button>
      </div>
      <div className="grid grid-4" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(5,1fr)' }}>
        <div className="kpi"><span className="kpi-label">Percepciones</span><span className="kpi-value">{fmt(t.perc)}</span></div>
        <div className="kpi"><span className="kpi-label">Deducciones</span><span className="kpi-value neg">{fmt(t.ded)}</span></div>
        <div className="kpi"><span className="kpi-label">Neto a pagar</span><span className="kpi-value pos">{fmt(t.neto)}</span></div>
        <div className="kpi"><span className="kpi-label">Depósito banco</span><span className="kpi-value orange">{fmt(t.depBanco)}</span></div>
        <div className="kpi"><span className="kpi-label">Efectivo</span><span className="kpi-value blue">{fmt(t.efectivo)}</span></div>
      </div>
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Empleado</th><th className="right">Asist.</th><th className="right">7mo día</th><th className="right">T. extra</th><th className="right">Viajes</th>
              <th className="right">Infonavit</th><th className="right">Comedor</th><th className="right">Retardos</th><th className="right">Préstamos</th>
              <th className="right">Neto</th><th className="right">Dep. banco</th><th className="right">Vales</th><th className="right">Efectivo</th>
            </tr>
          </thead>
          <tbody>
            {calcData.map(({ empleado: e, calc: c }) => {
              const descPrestamo = c.totalDed - c.infonavit - c.comedor - c.retardoMonto;
              return (
                <tr key={e.id}>
                  <td><div className="fw-600">{e.nombre}</div><div className="text-xs muted">{e.area}</div></td>
                  <td className="right mono">{fmt(c.asistMonto)}</td>
                  <td className="right mono">{fmt(c.septimo)}</td>
                  <td className="right mono">{c.te > 0 ? fmt(c.te) : '—'}</td>
                  <td className="right mono">{c.incentivos > 0 ? fmt(c.incentivos) : '—'}</td>
                  <td className="right mono">{c.infonavit > 0 ? '-' + fmt(c.infonavit) : '—'}</td>
                  <td className="right mono">{c.comedor > 0 ? '-' + fmt(c.comedor) : '—'}</td>
                  <td className="right mono">{c.retardoMonto > 0 ? '-' + fmt(c.retardoMonto) : '—'}</td>
                  <td className="right mono">{descPrestamo > 0 ? '-' + fmt(descPrestamo) : '—'}</td>
                  <td className="right mono fw-700">{fmt(c.neto)}</td>
                  <td className="right mono orange">{fmt(c.depositoBanco)}</td>
                  <td className="right mono orange">{fmt(c.vales)}</td>
                  <td className="right mono blue">{fmt(c.efectivo)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--ink-50)', fontWeight: 700 }}>
              <td>Totales</td><td colSpan={8}></td>
              <td className="right mono">{fmt(t.neto)}</td><td className="right mono orange">{fmt(t.depBanco)}</td><td className="right mono orange">{fmt(t.vales)}</td><td className="right mono blue">{fmt(t.efectivo)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
