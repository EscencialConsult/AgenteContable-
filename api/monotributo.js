import { CATEGORIAS_MONOTRIBUTO, MONOTRUBUTO_ANIO } from '../config/monotributo.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    res.json({
      anio: MONOTRUBUTO_ANIO,
      categorias: CATEGORIAS_MONOTRIBUTO,
      actualizado: new Date().toISOString(),
      fuente: 'ARCA - Actualización semestral 2026',
    })
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' })
  }
}
