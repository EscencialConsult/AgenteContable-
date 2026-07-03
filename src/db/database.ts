import Dexie, { type EntityTable } from 'dexie'
import type {
  ChatMessage,
  Cliente,
  Comprobante,
  LoteCarga,
  PeriodoFiscal,
} from '../types/comprobante'

const db = new Dexie('agenteContable') as Dexie & {
  comprobantes: EntityTable<Comprobante, 'id'>
  clientes: EntityTable<Cliente, 'id'>
  periodos: EntityTable<PeriodoFiscal, 'id'>
  lotesCarga: EntityTable<LoteCarga, 'id'>
  chatMessages: EntityTable<ChatMessage, 'id'>
}

db.version(1).stores({
  comprobantes: '++id, tipo, cuit, fecha, categoria, estado, createdAt',
  chatMessages: '++id, role, createdAt',
})

db.version(2).stores({
  comprobantes:
    '++id, clienteId, periodoId, loteId, tipo, cuit, fecha, categoria, estado, estadoRevision, origen, createdAt',
  clientes: '++id, cuit, razonSocial, activo, createdAt',
  periodos: '++id, clienteId, [clienteId+anio+mes], estado, anio, mes, createdAt',
  lotesCarga: '++id, clienteId, periodoId, origen, estado, createdAt',
  chatMessages: '++id, role, createdAt',
}).upgrade((tx) =>
  tx
    .table('comprobantes')
    .toCollection()
    .modify((comprobante: Comprobante) => {
      comprobante.estadoRevision = comprobante.estadoRevision || comprobante.estado
      comprobante.origen = comprobante.origen || 'manual'
    }),
)

db.version(3).stores({
  comprobantes:
    '++id, clienteId, periodoId, loteId, tipo, cuit, fecha, categoria, estado, estadoRevision, nivelValidacion, origen, createdAt, validatedAt',
  clientes: '++id, cuit, razonSocial, activo, createdAt',
  periodos: '++id, clienteId, [clienteId+anio+mes], estado, anio, mes, createdAt',
  lotesCarga: '++id, clienteId, periodoId, origen, estado, createdAt',
  chatMessages: '++id, role, createdAt',
}).upgrade((tx) =>
  tx
    .table('comprobantes')
    .toCollection()
    .modify((comprobante: Comprobante) => {
      comprobante.estadoRevision = comprobante.estadoRevision || comprobante.estado
      comprobante.origen = comprobante.origen || 'manual'
      comprobante.validaciones = comprobante.validaciones || []
      comprobante.nivelValidacion = comprobante.nivelValidacion || 'success'
    }),
)

db.version(4).stores({
  comprobantes:
    '++id, clienteId, periodoId, loteId, tipo, cuit, fecha, categoria, estado, estadoRevision, nivelValidacion, origen, createdAt, validatedAt',
  clientes: '++id, cuit, razonSocial, activo, createdAt',
  periodos: '++id, clienteId, [clienteId+anio+mes], estado, anio, mes, createdAt',
  lotesCarga: '++id, clienteId, periodoId, origen, estado, createdAt',
  chatMessages: '++id, role, createdAt',
}).upgrade((tx) =>
  tx
    .table('comprobantes')
    .toCollection()
    .modify((comprobante: Comprobante) => {
      comprobante.noGravado = comprobante.noGravado || 0
      comprobante.exento = comprobante.exento || 0
      comprobante.signoFiscal = comprobante.signoFiscal || (
        comprobante.categoria === 'nota_credito' ? -1 : 1
      )
      comprobante.ivaDetalle = comprobante.ivaDetalle?.length
        ? comprobante.ivaDetalle
        : [{
            alicuota: comprobante.iva === 0 ? '0%' : '21%',
            neto: comprobante.netoGravado || 0,
            iva: comprobante.iva || 0,
          }]
      comprobante.impuestosDetalle = comprobante.impuestosDetalle || [
        ...(comprobante.percepciones
          ? [{
              tipo: 'percepcion' as const,
              descripcion: 'Percepciones registradas',
              importe: comprobante.percepciones,
            }]
          : []),
        ...(comprobante.retenciones
          ? [{
              tipo: 'retencion' as const,
              descripcion: 'Retenciones registradas',
              importe: comprobante.retenciones,
            }]
          : []),
      ]
    }),
)

db.version(5).stores({
  comprobantes:
    '++id, periodoId, loteId, tipo, cuit, fecha, categoria, estado, estadoRevision, nivelValidacion, origen, createdAt, validatedAt',
  clientes: '++id, cuit, razonSocial, activo, createdAt',
  periodos: '++id, [anio+mes], estado, anio, mes, createdAt',
  lotesCarga: '++id, periodoId, origen, estado, createdAt',
  chatMessages: '++id, role, createdAt',
}).upgrade((tx) =>
  tx
    .table('periodos')
    .toCollection()
    .modify((periodo: PeriodoFiscal) => {
      delete periodo.clienteId
    }),
)

export { db }
