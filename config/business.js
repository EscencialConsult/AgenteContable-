export const CATEGORIA_LABELS = {
  venta: 'Venta',
  compra: 'Compra',
  gasto_deducible: 'Gasto Deducible',
  gasto_no_computable: 'Gasto No Computable',
  percepcion: 'Percepción',
  retencion: 'Retención',
  nota_credito: 'Nota de Crédito',
  nota_debito: 'Nota de Débito',
  con_iva: 'Con IVA',
  sin_iva: 'Sin IVA',
  sin_clasificar: 'Sin Clasificar',
}

export const CATEGORIA_OPTIONS = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'gasto_deducible', label: 'Gasto Deducible' },
  { value: 'gasto_no_computable', label: 'Gasto No Computable' },
  { value: 'percepcion', label: 'Percepción' },
  { value: 'retencion', label: 'Retención' },
  { value: 'nota_credito', label: 'Nota de Crédito' },
  { value: 'nota_debito', label: 'Nota de Débito' },
  { value: 'sin_clasificar', label: 'Sin Clasificar' },
]

export const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'validado', label: 'Validado' },
  { value: 'observado', label: 'Observado' },
  { value: 'listo', label: 'Listo' },
]

export const TIPO_OPTIONS = [
  { value: 'Factura A', label: 'Factura A' },
  { value: 'Factura B', label: 'Factura B' },
  { value: 'Factura C', label: 'Factura C' },
  { value: 'Nota de Crédito', label: 'Nota de Crédito' },
  { value: 'Nota de Débito', label: 'Nota de Débito' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'Recibo', label: 'Recibo' },
]

export const CONDITION_MAP = {
  RI: 'Responsable Inscripto',
  'RESPONSABLE INSCRIPTO': 'Responsable Inscripto',
  MONOTRIBUTO: 'Monotributista',
  EXENTO: 'Exento',
  'CONSUMIDOR FINAL': 'Consumidor Final',
  'IVA NO RESPONSABLE': 'IVA No Responsable',
}

export const CATEGORY_MAP = {
  'factura a': 'venta',
  'factura b': 'venta',
  'factura c': 'compra',
  'nota de credito': 'nota_credito',
  'nota de debito': 'nota_debito',
  ticket: 'gasto_deducible',
  recibo: 'gasto_deducible',
}

export const ALICUOTAS = ['21%', '10.5%', '27%', '0%']

export const ALICUOTA_TOLERANCE = 0.03

export const VALIDACION = {
  ANIOS_MAX: 5,
  IVA_DIFF_THRESHOLD: 5,
  IMPORTE_ELEVADO: 500000,
  CAE_LENGTH: 14,
}
