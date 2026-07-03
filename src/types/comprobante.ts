export interface Comprobante {
  id?: number
  clienteId?: number
  periodoId?: number
  loteId?: number
  tipo: string
  cuit: string
  razonSocial: string
  fecha: string
  puntoVenta: number
  numero: number
  condicionIVA: string
  netoGravado: number
  iva: number
  noGravado?: number
  exento?: number
  ivaDetalle?: IVADetalle[]
  impuestosDetalle?: ImpuestoDetalle[]
  signoFiscal?: 1 | -1
  percepciones: number
  retenciones: number
  total: number
  moneda?: string
  tipoCambio?: number
  netoGravadoMonedaOriginal?: number
  ivaMonedaOriginal?: number
  noGravadoMonedaOriginal?: number
  exentoMonedaOriginal?: number
  percepcionesMonedaOriginal?: number
  retencionesMonedaOriginal?: number
  totalMonedaOriginal?: number
  totalPesos?: number
  cae: string
  fechaVencimiento: string
  categoria: Categoria
  estado: EstadoComprobante
  estadoRevision?: EstadoRevision
  validaciones?: Validacion[]
  nivelValidacion?: NivelValidacion
  clasificacionFiscal?: ClasificacionFiscal
  validatedAt?: string
  origen?: OrigenComprobante
  confidence?: number
  observaciones: string
  archivoBase64?: string
  fileName?: string
  createdAt: string
}

export type Categoria =
  | 'venta'
  | 'compra'
  | 'gasto_deducible'
  | 'gasto_no_computable'
  | 'con_iva'
  | 'sin_iva'
  | 'percepcion'
  | 'retencion'
  | 'nota_credito'
  | 'nota_debito'
  | 'sin_clasificar'

export type EstadoComprobante =
  | 'pendiente'
  | 'validado'
  | 'observado'
  | 'listo'

export type EstadoRevision =
  | 'pendiente'
  | 'observado'
  | 'validado'
  | 'listo'

export type NivelValidacion = 'error' | 'warning' | 'success'

export type OrigenComprobante =
  | 'manual'
  | 'gmail'
  | 'drive'
  | 'whatsapp'
  | 'formulario'
  | 'carpeta'
  | 'importacion'

export interface IVADetalle {
  alicuota: string
  neto: number
  iva: number
}

export interface ImpuestoDetalle {
  tipo: 'percepcion' | 'retencion' | 'interno' | 'otro'
  jurisdiccion?: string
  descripcion?: string
  importe: number
}

export interface ClasificacionFiscal {
  categoria: Categoria
  tratamientoIVA: 'debito_fiscal' | 'credito_fiscal' | 'no_computable' | 'sin_iva'
  requiereCAE: boolean
  requierePuntoVentaNumero: boolean
  afectaPreliquidacion: boolean
  confianza: number
  motivos: string[]
}

export interface Cliente {
  id?: number
  razonSocial: string
  cuit: string
  condicionIVA: string
  email?: string
  telefono?: string
  contacto?: string
  activo: boolean
  observaciones?: string
  createdAt: string
  updatedAt?: string
}

export type EstadoPeriodo =
  | 'abierto'
  | 'en_revision'
  | 'observado'
  | 'listo'
  | 'cerrado'

export interface PeriodoFiscal {
  id?: number
  clienteId?: number
  mes: number
  anio: number
  estado: EstadoPeriodo
  observaciones?: string
  createdAt: string
  updatedAt?: string
}

export interface LoteCarga {
  id?: number
  clienteId?: number
  periodoId: number
  origen: OrigenComprobante
  estado: 'procesando' | 'procesado' | 'observado'
  cantidadArchivos: number
  createdAt: string
  updatedAt?: string
}

export interface Validacion {
  tipo: string
  mensaje: string
  nivel: 'error' | 'warning' | 'success'
}

export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant'
  content: string
  imageBase64?: string
  fileName?: string
  createdAt?: string
}
