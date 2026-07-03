import assert from 'node:assert/strict'
import { parserFixtures } from './parserFixtures'
import { parseComprobante } from '../src/services/parserService'
import { normalizarMonedaExtranjera, validarReglasContables } from '../src/services/validatorService'

function assertClose(actual: unknown, expected: number, field: string, fixtureName: string) {
  assert.equal(typeof actual, 'number', `${fixtureName}.${field} should be a number`)
  assert.ok(
    Math.abs((actual as number) - expected) < 0.01,
    `${fixtureName}.${field}: expected ${expected}, got ${actual}`,
  )
}

for (const fixture of parserFixtures) {
  const parsed = parseComprobante(fixture.text, `${fixture.name}.txt`)

  for (const [field, expected] of Object.entries(fixture.expected)) {
    const actual = parsed[field as keyof typeof parsed]
    if (typeof expected === 'number') {
      assertClose(actual, expected, field, fixture.name)
      continue
    }

    assert.equal(actual, expected, `${fixture.name}.${field}`)
  }

  assert.ok(parsed.createdAt, `${fixture.name}.createdAt should be present`)
}

console.log(`Parser fixtures OK: ${parserFixtures.length}`)

const totalInconsistente = validarReglasContables({
  tipo: 'Factura A',
  cuit: '30711111118',
  fecha: '15/06/2026',
  puntoVenta: 4,
  numero: 1234,
  cae: '76234567890123',
  categoria: 'compra',
  netoGravado: 10000,
  iva: 2100,
  total: 13000,
  ivaDetalle: [{ alicuota: '21%', neto: 10000, iva: 2100 }],
})
assert.ok(
  totalInconsistente.some((v) => v.tipo === 'total_inconsistente'),
  'Debe advertir total inconsistente',
)

const facturaSinCae = validarReglasContables({
  tipo: 'Factura A',
  categoria: 'compra',
  puntoVenta: 4,
  numero: 1234,
  netoGravado: 10000,
  iva: 2100,
  total: 12100,
})
assert.ok(
  facturaSinCae.some((v) => v.tipo === 'cae_faltante'),
  'Factura fiscal sin CAE debe ser error',
)

const reciboSinCae = validarReglasContables({
  tipo: 'Recibo',
  categoria: 'gasto_no_computable',
  observaciones: 'Comprobante de pago sin datos fiscales de factura',
  total: 43107,
  netoGravado: 43107,
  iva: 0,
})
assert.ok(
  !reciboSinCae.some((v) => v.tipo === 'cae_faltante' || v.tipo === 'numeracion_fiscal_faltante'),
  'Recibo/pago sin factura no debe exigir CAE ni punto de venta',
)

const notaCreditoMalSigno = validarReglasContables({
  tipo: 'Nota de Credito B',
  categoria: 'nota_credito',
  signoFiscal: 1,
  puntoVenta: 3,
  numero: 456,
  cae: '76234567890125',
  netoGravado: 5000,
  iva: 1050,
  total: 6050,
  ivaDetalle: [{ alicuota: '21%', neto: 5000, iva: 1050 }],
})
assert.ok(
  notaCreditoMalSigno.some((v) => v.tipo === 'signo_nota_credito'),
  'Nota de credito con signo positivo debe advertirse',
)

const comprobanteUsdInflado = normalizarMonedaExtranjera({
  tipo: 'Factura A',
  categoria: 'venta',
  moneda: 'USD',
  tipoCambio: 13127,
  netoGravado: 121973327.33,
  iva: 25614453,
  total: 14758778,
  netoGravadoMonedaOriginal: 9291.79,
  ivaMonedaOriginal: 1951.28,
  totalMonedaOriginal: 11243.07,
  totalPesos: 14758778,
  ivaDetalle: [{ alicuota: '21%', neto: 121973327.33, iva: 25614453 }],
})
assertClose(comprobanteUsdInflado.tipoCambio, 131.27, 'tipoCambio', 'normalizar-usd-inflado')
assertClose(comprobanteUsdInflado.netoGravado, 1219733.27, 'netoGravado', 'normalizar-usd-inflado')
assertClose(comprobanteUsdInflado.iva, 256144.53, 'iva', 'normalizar-usd-inflado')
assertClose(comprobanteUsdInflado.total, 1475877.80, 'total', 'normalizar-usd-inflado')
assert.ok(
  !validarReglasContables(comprobanteUsdInflado).some((v) =>
    ['total_inconsistente', 'iva_alicuota_inconsistente'].includes(v.tipo),
  ),
  'Comprobante USD normalizado no debe disparar inconsistencias de total/IVA',
)

console.log('Accounting validations OK')
