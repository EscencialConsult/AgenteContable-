export function formatCurrency(val: number): string {
  return val.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function parseNumber(str: string): number {
  return parseFloat(str.replace(',', '.')) || 0
}
