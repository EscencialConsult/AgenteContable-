export function formatCurrency(val: number): string {
  return val.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseNumber(str: string): number {
  const normalized = str
    .trim()
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '')

  return parseFloat(normalized) || 0
}
