// ============================================================
// Lógica de cálculo de nómina (portada del sistema anterior).
// NOTA: hallazgos pendientes de revisión (ver CLAUDE.md → "Revisión de cálculos"):
//  - Retardos: hoy usa salario diario en vez de por-hora.
//  - Quincenal: usa matemática semanal (÷7 y séptimo min(,6)/6).
// Se corregirán en la fase F6.
// ============================================================

export const CODIGOS_ASISTENCIA = ['A', 'F', 'D', 'V', 'PSG', 'PCG', 'TXT', 'SUS'];
export const MOTIVOS_TE = ['Inventario', 'Descarga', 'Entregas local', 'Entregas 34', 'Entregas Higuerillas', 'Frigoríficos', 'Acomodo cámaras', 'Facturación'];
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const TAB_CHOFER = [200, 400, 500, 600];
export const TAB_ACOMP = [100, 200, 300, 400];

export function getTramo(horaStr?: string | null): number | null {
  if (!horaStr) return null;
  const [h, m] = horaStr.split(':').map(Number);
  const t = h * 60 + m;
  if (t >= 7 * 60 && t < 15 * 60) return 0;
  if (t >= 15 * 60 && t < 19 * 60) return 1;
  if (t >= 19 * 60 && t < 23 * 60) return 2;
  return 3;
}

export function calcIncentivos(horaLlegada?: string | null, dormir?: boolean) {
  if (dormir) return { chofer: TAB_CHOFER[3] + TAB_CHOFER[0], acomp: TAB_ACOMP[3] + TAB_ACOMP[0] };
  const t = getTramo(horaLlegada);
  if (t === null) return { chofer: 0, acomp: 0 };
  return { chofer: TAB_CHOFER[t], acomp: TAB_ACOMP[t] };
}

export function descuentoPrestamoMonto(monto: number, tipo: string): number {
  return tipo === 'semanal' ? monto * 0.1 : monto * 0.2;
}

export function calcularNomina(empleado: any, nomina: any, asistencias: any[], incentivosViaje: number, descuentoPrestamo: number) {
  const sdFiscal = empleado.sd_fiscal || 0;
  const sdReal = empleado.sd_real || 0;
  const dDR = sdReal / 7;
  const dDF = sdFiscal / 7;
  const vales = sdFiscal * 0.1;
  const prevSocial = sdFiscal * 0.1;

  const dias = asistencias || [];
  const diasA = dias.filter((d) => d.codigo === 'A').length;
  const diasCuentan = dias.filter((d) => ['A', 'V', 'PCG'].includes(d.codigo)).length;
  const diasV = dias.filter((d) => d.codigo === 'V').length;
  const diasF = dias.filter((d) => ['F', 'PSG', 'SUS'].includes(d.codigo)).length;
  const totalTEHrs = dias.reduce((s, d) => s + (parseFloat(d.te_horas) || 0), 0);
  const totalRetHrs = dias.reduce((s, d) => s + (parseFloat(d.retardo_min) || 0) / 60, 0);

  const asistMonto = diasA * dDR;
  const septimo = dDR * (Math.min(diasCuentan, 6) / 6);
  const te = totalTEHrs * (dDR / 8) * 2;
  const primaFiscal = diasV > 0 ? dDF * diasV * 0.25 : 0;
  const primaEfectivo = diasV > 0 ? dDR * diasV * 0.25 : 0;
  const incentivos = incentivosViaje || 0;
  const retardoMonto = totalRetHrs * dDR;
  const prestDesc = descuentoPrestamo || 0;

  const totalPerc = asistMonto + septimo + te + primaEfectivo + incentivos
    + (nomina?.comisiones || 0) + (nomina?.retroactivos || 0) + (nomina?.evaluacion || 0);

  const infonavit = parseFloat(nomina?.infonavit || empleado.infonavit || 0);
  const comedor = parseFloat(nomina?.comedor || 0);
  const totalDed = infonavit + comedor + retardoMonto + prestDesc;

  const neto = totalPerc - totalDed;
  const deposito = parseFloat(nomina?.deposito_total || 0);
  const depositoBanco = Math.max(0, deposito - vales);
  const efectivo = Math.max(0, neto - deposito);

  return {
    dDR, dDF, vales, prevSocial,
    diasA, diasCuentan, diasV, diasF, totalTEHrs, totalRetHrs,
    asistMonto, septimo, te, primaFiscal, primaEfectivo,
    incentivos, retardoMonto, prestDesc,
    totalPerc, totalDed, neto, deposito, depositoBanco, efectivo,
    infonavit, comedor,
    isr: parseFloat(nomina?.isr || 0),
    imss: parseFloat(nomina?.imss || 0),
    comisiones: parseFloat(nomina?.comisiones || 0),
    retroactivos: parseFloat(nomina?.retroactivos || 0),
  };
}

// ---- Utilidades de antigüedad / vacaciones (LFT 2023), para fase F4 ----
export function antiguedadAnios(fechaIngreso?: string | null): number {
  if (!fechaIngreso) return 0;
  const ing = new Date(fechaIngreso + 'T12:00:00');
  if (isNaN(ing.getTime())) return 0;
  const hoy = new Date();
  let a = hoy.getFullYear() - ing.getFullYear();
  const m = hoy.getMonth() - ing.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < ing.getDate())) a--;
  return Math.max(0, a);
}

// Días de vacaciones por año cumplido según LFT (reforma 2023).
export function diasVacacionesLFT(aniosCumplidos: number): number {
  if (aniosCumplidos < 1) return 12; // tabla nueva: 12 desde el primer año
  if (aniosCumplidos === 1) return 12;
  if (aniosCumplidos <= 5) return 12 + (aniosCumplidos - 1) * 2; // 14,16,18,20
  // a partir del 6º: +2 por cada bloque de 5 años
  return 20 + Math.floor((aniosCumplidos - 1) / 5) * 2;
}

// Factor de integración IMSS: (365 + aguinaldo(15) + díasVac*primaVac(25%)) / 365.
export function factorIntegracionSDI(aniosCumplidos: number): number {
  const diasVac = diasVacacionesLFT(aniosCumplidos);
  const aguinaldo = 15;
  const primaVac = 0.25;
  return Math.round(((365 + aguinaldo + diasVac * primaVac) / 365) * 10000) / 10000;
}

// SDI a partir del sueldo diario fiscal y la antigüedad.
export function calcSDI(sueldoDiarioFiscal: number, aniosCumplidos: number): number {
  return Math.round(sueldoDiarioFiscal * factorIntegracionSDI(aniosCumplidos) * 100) / 100;
}
