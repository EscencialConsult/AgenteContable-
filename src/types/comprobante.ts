export interface Comprobante {
  id?: number
  tipo: string
  cuit: string
  razonSocial: string
  fecha: string
  puntoVenta: number
  numero: number
  condicionIVA: string
  netoGravado: number
  iva: number
  percepciones: number
  retenciones: number
  total: number
  cae: string
  fechaVencimiento: string
  categoria: Categoria
  estado: EstadoComprobante
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
