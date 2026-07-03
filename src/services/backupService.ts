import { db } from '../db/database'
import type { ChatMessage, Comprobante, LoteCarga, PeriodoFiscal } from '../types/comprobante'

const BACKUP_VERSION = 1

export interface BackupManifest {
  app: 'agente-contable'
  version: number
  exportedAt: string
  scope: 'full' | 'periodo'
  periodoId?: number
  counts: {
    comprobantes: number
    periodos: number
    lotesCarga: number
    chatMessages: number
  }
  includesAdjuntos: boolean
}

export interface BackupPayload {
  manifest: BackupManifest
  data: {
    comprobantes: Comprobante[]
    periodos: PeriodoFiscal[]
    lotesCarga: LoteCarga[]
    chatMessages: ChatMessage[]
  }
}

export interface StorageInfo {
  usage?: number
  quota?: number
  percent?: number
}

function makeManifest(
  scope: BackupManifest['scope'],
  data: BackupPayload['data'],
  periodoId?: number,
): BackupManifest {
  return {
    app: 'agente-contable',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    scope,
    periodoId,
    counts: {
      comprobantes: data.comprobantes.length,
      periodos: data.periodos.length,
      lotesCarga: data.lotesCarga.length,
      chatMessages: data.chatMessages.length,
    },
    includesAdjuntos: data.comprobantes.some((c) => Boolean(c.archivoBase64)),
  }
}

function downloadJson(payload: BackupPayload, fileName: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '')
}

export async function buildFullBackup(): Promise<BackupPayload> {
  const data = {
    comprobantes: await db.comprobantes.toArray(),
    periodos: await db.periodos.toArray(),
    lotesCarga: await db.lotesCarga.toArray(),
    chatMessages: await db.chatMessages.toArray(),
  }
  return {
    manifest: makeManifest('full', data),
    data,
  }
}

export async function buildPeriodoBackup(periodoId: number): Promise<BackupPayload> {
  const comprobantes = await db.comprobantes.where('periodoId').equals(periodoId).toArray()
  const loteIds = new Set(comprobantes.map((c) => c.loteId).filter(Boolean))
  const periodos = await db.periodos.where('id').equals(periodoId).toArray()
  const lotesCarga = (await db.lotesCarga.toArray()).filter((lote) =>
    lote.periodoId === periodoId || (lote.id ? loteIds.has(lote.id) : false),
  )
  const data = {
    comprobantes,
    periodos,
    lotesCarga,
    chatMessages: [],
  }
  return {
    manifest: makeManifest('periodo', data, periodoId),
    data,
  }
}

export function downloadBackup(payload: BackupPayload) {
  const stamp = new Date(payload.manifest.exportedAt)
    .toISOString()
    .slice(0, 19)
    .replace(/[-:T]/g, '')
  const scope = payload.manifest.scope === 'periodo'
    ? `periodo_${payload.manifest.periodoId || 'sin_id'}`
    : 'completo'
  downloadJson(payload, `backup_agente_contable_${sanitizeFilePart(scope)}_${stamp}.json`)
}

export function parseBackupFile(file: File): Promise<BackupPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '')) as BackupPayload
        validateBackupPayload(parsed)
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

export function validateBackupPayload(payload: BackupPayload) {
  if (payload?.manifest?.app !== 'agente-contable') {
    throw new Error('El archivo no parece ser un backup valido de Agente Contable')
  }
  if (!payload.data || !Array.isArray(payload.data.comprobantes) || !Array.isArray(payload.data.periodos)) {
    throw new Error('Backup incompleto o corrupto')
  }
  if (payload.manifest.version > BACKUP_VERSION) {
    throw new Error('El backup fue creado con una version mas nueva de la aplicacion')
  }
}

export async function restoreBackup(payload: BackupPayload, mode: 'replace' | 'merge') {
  validateBackupPayload(payload)

  await db.transaction('rw', db.comprobantes, db.periodos, db.lotesCarga, db.chatMessages, async () => {
    if (mode === 'replace') {
      await db.comprobantes.clear()
      await db.periodos.clear()
      await db.lotesCarga.clear()
      await db.chatMessages.clear()
    }

    await db.periodos.bulkPut(payload.data.periodos)
    await db.lotesCarga.bulkPut(payload.data.lotesCarga)
    await db.comprobantes.bulkPut(payload.data.comprobantes)
    if (payload.data.chatMessages.length) {
      await db.chatMessages.bulkPut(payload.data.chatMessages)
    }
  })
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (!navigator.storage?.estimate) return {}
  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage || 0
  const quota = estimate.quota || 0
  return {
    usage,
    quota,
    percent: quota ? Math.round((usage / quota) * 1000) / 10 : undefined,
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return 'No disponible'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}
