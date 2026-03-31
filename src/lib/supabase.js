import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Constantes de nómina
export const CODIGOS_ASISTENCIA = ['A','F','D','V','PSG','PCG','TXT','SUS']
export const MOTIVOS_TE = ['Inventario','Descarga','Entregas local','Entregas 34','Entregas Higuerilla','Frigoríficos','Acomodo cámaras','Facturación']
export const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
export const TAB_CHOFER = [200, 400, 500, 600]
export const TAB_ACOMP  = [100, 200, 300, 400]

// Calcular tramo tabular según hora llegada
export function getTramo(horaStr) {
  if (!horaStr) return null
  const [h, m] = horaStr.split(':').map(Number)
  const t = h * 60 + m
  if (t >= 7*60 && t < 15*60) return 0
  if (t >= 15*60 && t < 19*60) return 1
  if (t >= 19*60 && t < 23*60) return 2
  return 3
}

export function calcIncentivos(horaLlegada, dormir) {
  let chofer = 0, acomp = 0
  if (dormir) {
    chofer = TAB_CHOFER[3] + TAB_CHOFER[0]
    acomp  = TAB_ACOMP[3]  + TAB_ACOMP[0]
  } else {
    const t = getTramo(horaLlegada)
    if (t !== null) { chofer = TAB_CHOFER[t]; acomp = TAB_ACOMP[t] }
  }
  return { chofer, acomp }
}

// Calcular nómina completa de un empleado
export function calcularNomina(empleado, nomina, asistencias, incentivosViaje) {
  const sdFiscal = empleado.sd_fiscal
  const sdReal   = empleado.sd_real
  const dDiarioFiscal = sdFiscal / 7
  const dDiarioReal   = sdReal   / 7
  const prevSocial = sdFiscal * 0.10
  const vales      = sdFiscal * 0.10

  const dias = asistencias || []
  const diasA       = dias.filter(d => d.codigo === 'A').length
  const diasCuentan = dias.filter(d => ['A','V','PCG'].includes(d.codigo)).length
  const diasV       = dias.filter(d => d.codigo === 'V').length
  const totalTEHrs  = dias.reduce((s, d) => s + (d.te_horas || 0), 0)

  const asistMonto  = diasA * dDiarioReal
  const septimo     = dDiarioReal * (diasCuentan / 6)
  const te          = totalTEHrs * (dDiarioReal / 8) * 2
  const primaFiscal = diasV > 0 ? (dDiarioFiscal * diasV) * 0.25 : 0
  const primaEfectivo = diasV > 0 ? (dDiarioReal * diasV) * 0.25 : 0
  const incentivos  = incentivosViaje || 0

  const totalPerc = asistMonto + septimo + te + primaEfectivo
    + (nomina?.comisiones || 0)
    + incentivos
    + (nomina?.retroactivos || 0)
    + (nomina?.evaluacion || 0)

  const totalDed = (nomina?.infonavit || empleado.infonavit || 0)
    + (nomina?.comedor || 0)
    + (nomina?.prestamos || 0)
    + (nomina?.desc_productos || 0)

  const neto = totalPerc - totalDed
  const deposito = nomina?.deposito_total || 0
  const depositoBanco = Math.max(0, deposito - vales)
  const efectivo = Math.max(0, neto - deposito)

  return {
    dDiarioFiscal, dDiarioReal, prevSocial, vales,
    diasA, diasCuentan, diasV, totalTEHrs,
    asistMonto, septimo, te, primaFiscal, primaEfectivo, incentivos,
    totalPerc, totalDed, neto,
    deposito, depositoBanco, efectivo,
    isr: nomina?.isr || 0,
    imss: nomina?.imss || 0
  }
}
