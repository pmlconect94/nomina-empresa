import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
)

export const CODIGOS_ASISTENCIA = ['A','F','D','V','PSG','PCG','TXT','SUS']
export const MOTIVOS_TE = ['Inventario','Descarga','Entregas local','Entregas 34','Entregas Higuerillas','Frigoríficos','Acomodo cámaras','Facturación']
export const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
export const TAB_CHOFER = [200,400,500,600]
export const TAB_ACOMP  = [100,200,300,400]
export const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export function fmt(n) {
  return '$' + (Math.round((n||0)*100)/100).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})
}

export function fmtFechaLarga(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']
  return `${dias[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export function getTramo(horaStr) {
  if (!horaStr) return null
  const [h,m] = horaStr.split(':').map(Number)
  const t = h*60+m
  if (t >= 7*60 && t < 15*60) return 0
  if (t >= 15*60 && t < 19*60) return 1
  if (t >= 19*60 && t < 23*60) return 2
  return 3
}

export function calcIncentivos(horaLlegada, dormir) {
  if (dormir) return { chofer: TAB_CHOFER[3]+TAB_CHOFER[0], acomp: TAB_ACOMP[3]+TAB_ACOMP[0] }
  const t = getTramo(horaLlegada)
  if (t === null) return { chofer: 0, acomp: 0 }
  return { chofer: TAB_CHOFER[t], acomp: TAB_ACOMP[t] }
}

// #6 El préstamo aplica a partir de UNA semana después de la fecha del préstamo
export function prestamoAplicaEnSemana(fechaPrestamo, semanaInicio) {
  if (!fechaPrestamo || !semanaInicio) return false
  const fp = new Date(fechaPrestamo + 'T12:00:00')
  const si = new Date(semanaInicio + 'T12:00:00')
  // Debe haber pasado al menos 7 días desde la fecha del préstamo
  const diff = (si - fp) / (1000 * 60 * 60 * 24)
  return diff >= 7
}

export function calcularNomina(empleado, nomina, asistencias, incentivosViaje, descuentoPrestamo) {
  const sdFiscal = empleado.sd_fiscal
  const sdReal   = empleado.sd_real
  const dDR = sdReal / 7
  const dDF = sdFiscal / 7
  const vales = sdFiscal * 0.10
  const prevSocial = sdFiscal * 0.10

  const dias = asistencias || []
  const diasA       = dias.filter(d => d.codigo === 'A').length
  const diasCuentan = dias.filter(d => ['A','V','PCG'].includes(d.codigo)).length
  const diasV       = dias.filter(d => d.codigo === 'V').length
  const diasF       = dias.filter(d => ['F','PSG','SUS'].includes(d.codigo)).length
  const totalTEHrs  = dias.reduce((s,d) => s + (parseFloat(d.te_horas)||0), 0)
  const totalRetHrs = dias.reduce((s,d) => s + (parseFloat(d.retardo_min)||0)/60, 0)

  const asistMonto    = diasA * dDR
  const septimo       = dDR * (Math.min(diasCuentan,6) / 6)
  const te            = totalTEHrs * (dDR/8) * 2
  const primaFiscal   = diasV > 0 ? (dDF * diasV) * 0.25 : 0
  const primaEfectivo = diasV > 0 ? (dDR * diasV) * 0.25 : 0
  const incentivos    = incentivosViaje || 0
  const retardoMonto  = totalRetHrs * dDR
  const prestDesc     = descuentoPrestamo || 0

  const totalPerc = asistMonto + septimo + te + primaEfectivo
    + incentivos
    + (nomina?.comisiones || 0)
    + (nomina?.retroactivos || 0)
    + (nomina?.evaluacion || 0)

  const infonavit = parseFloat(nomina?.infonavit || empleado.infonavit || 0)
  const comedor   = parseFloat(nomina?.comedor || 0)
  const totalDed  = infonavit + comedor + retardoMonto + prestDesc

  const neto = totalPerc - totalDed
  const deposito = parseFloat(nomina?.deposito_total || 0)
  const depositoBanco = Math.max(0, deposito - vales)
  const efectivo = Math.max(0, neto - deposito)

  return {
    dDR, dDF, vales, prevSocial,
    diasA, diasCuentan, diasV, diasF, totalTEHrs, totalRetHrs,
    asistMonto, septimo, te, primaFiscal, primaEfectivo,
    incentivos, retardoMonto, prestDesc,
    totalPerc, totalDed, neto,
    deposito, depositoBanco, efectivo,
    infonavit, comedor,
    isr: parseFloat(nomina?.isr || 0),
    imss: parseFloat(nomina?.imss || 0),
    comisiones: parseFloat(nomina?.comisiones || 0),
    retroactivos: parseFloat(nomina?.retroactivos || 0),
  }
}

export function getLunes(offset, base = new Date(2026,2,16)) {
  const d = new Date(base)
  d.setDate(d.getDate() + offset * 7)
  return d
}

export function toISO(d) {
  const pad = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
}

export function fmtPeriodo(ini, fin) {
  if (!ini || !fin) return ''
  const di = new Date(ini+'T12:00:00')
  const df = new Date(fin+'T12:00:00')
  if (di.getMonth() === df.getMonth())
    return `${di.getDate()} – ${df.getDate()} ${MESES[df.getMonth()]} ${df.getFullYear()}`
  return `${di.getDate()} ${MESES[di.getMonth()]} – ${df.getDate()} ${MESES[df.getMonth()]} ${df.getFullYear()}`
}

export function descuentoPrestamoMonto(monto, tipo) {
  return tipo === 'semanal' ? monto * 0.10 : monto * 0.20
}
