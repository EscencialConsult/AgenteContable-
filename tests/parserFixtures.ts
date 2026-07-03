import type { Comprobante } from '../src/types/comprobante'

export interface ParserFixture {
  name: string
  text: string
  expected: Partial<Comprobante>
}

export const parserFixtures: ParserFixture[] = [
  {
    name: 'factura-a-afip-con-iva',
    text: `
FACTURA A
COD. 001
Punto de Venta: 00004 Comp. Nro: 00001234
Fecha de Emision: 15/06/2026
Razon Social: ACME SERVICIOS SA
CUIT: 30-71111111-8
Condicion frente al IVA: Responsable Inscripto
Importe Neto Gravado: $ 10.000,00
IVA 21%: $ 2.100,00
Importe Otros Tributos: $ 0,00
Importe Total: $ 12.100,00
CAE Nro: 76234567890123
Fecha de Vto. de CAE: 25/06/2026
`,
    expected: {
      tipo: 'Factura A',
      cuit: '30711111118',
      razonSocial: 'ACME SERVICIOS SA',
      fecha: '15/06/2026',
      puntoVenta: 4,
      numero: 1234,
      condicionIVA: 'Responsable Inscripto',
      netoGravado: 10000,
      iva: 2100,
      total: 12100,
      cae: '76234567890123',
      fechaVencimiento: '25/06/2026',
      categoria: 'sin_clasificar',
      signoFiscal: 1,
    },
  },
  {
    name: 'factura-c-monotributo-sin-iva',
    text: `
FACTURA C
COD. 011
Punto de Venta: 00007 Comp. Nro: 00000089
Fecha: 02/06/2026
Razon Social: DISEÑO Y WEB MONOTRIBUTO
CUIT: 20-12345678-3
Condicion frente al IVA: Monotributo
Subtotal: $ 15.500,00
Importe Total: $ 15.500,00
CAE Nro: 76234567890124
Vto.: 12/06/2026
`,
    expected: {
      tipo: 'Factura C',
      cuit: '20123456783',
      razonSocial: 'DISEÑO Y WEB MONOTRIBUTO',
      fecha: '02/06/2026',
      puntoVenta: 7,
      numero: 89,
      condicionIVA: 'Monotributista',
      netoGravado: 15500,
      iva: 0,
      total: 15500,
      cae: '76234567890124',
      fechaVencimiento: '12/06/2026',
      categoria: 'sin_clasificar',
      signoFiscal: 1,
    },
  },
  {
    name: 'nota-credito-b-resta',
    text: `
NOTA DE CREDITO B
COD. 008
Punto de Venta: 00003 Comp. Nro: 00000456
Fecha de Emision: 18/06/2026
Razon Social: PROVEEDOR RETAIL SRL
CUIT: 30-65555555-4
Importe Neto Gravado: $ 5.000,00
IVA 21%: $ 1.050,00
Importe Total: $ 6.050,00
CAE Nro: 76234567890125
Fecha de Vencimiento: 28/06/2026
`,
    expected: {
      tipo: 'Nota de Credito B',
      cuit: '30655555554',
      razonSocial: 'PROVEEDOR RETAIL SRL',
      fecha: '18/06/2026',
      puntoVenta: 3,
      numero: 456,
      netoGravado: 5000,
      iva: 1050,
      total: 6050,
      cae: '76234567890125',
      categoria: 'nota_credito',
      signoFiscal: -1,
    },
  },
  {
    name: 'recibo-mercado-pago-pago-facil',
    text: `
Comprobante de pago
Martes, 30 de junio de 2026, 12:20.
Federacion Patronal
$ 43.10700
Numero de operacion de Mercado Pago
166485226454
Numero de transaccion
164187977
Referencia
17494831
Vencimiento
29/06/2026
Persona que pago
SANTIAGO NAVARRO
*** SISTEMA SEPSA - PAGO FACIL ***
Comprobante de pago de:
FEDERACION PATRONAL
Av. La Plata 51 Nro 770 (1900) La Plata
N CUIT 33-70736658-9
040345681910000 $$$$$$$$43107,00
8CU 8CU FEDERACION PATRONAL
MODALIDAD DE PAGO SIN FACTURA
`,
    expected: {
      tipo: 'Recibo',
      cuit: '33707366589',
      razonSocial: 'FEDERACION PATRONAL',
      fecha: '30/06/2026',
      fechaVencimiento: '29/06/2026',
      puntoVenta: 0,
      numero: 166485226454,
      netoGravado: 43107,
      iva: 0,
      total: 43107,
      categoria: 'gasto_no_computable',
      signoFiscal: 1,
    },
  },
  {
    name: 'factura-a-imagen-usd',
    text: `
ORIGINAL
A
COD. 01
FACTURA
Punto de Venta: 00001 Comp. Nro: 00000047
Fecha de Emision: 01/08/2022
CUIT:
Condicion frente al IVA: IVA Responsable Inscripto
Periodo Facturado Desde: 01/08/2022 Hasta: 01/08/2022
Moneda: USD - Dolar Estadounidense
Importe Otros Tributos: USD 0,00
Importe Neto Gravado: USD 9291,79
IVA 21%: USD 1951,28
IVA 10.5%: USD 0,00
IVA 0%: USD 0,00
Importe Total: USD 11243,07
El total de este comprobante expresado en moneda de curso legal - Pesos Argentinos - considerandose un tipo de cambio consignado es 131.270000 asciende a $ 1475877,80
`,
    expected: {
      tipo: 'Factura A',
      cuit: '',
      fecha: '01/08/2022',
      puntoVenta: 1,
      numero: 47,
      condicionIVA: 'Responsable Inscripto',
      netoGravado: 1219733.27,
      iva: 256144.53,
      total: 1475877.80,
      moneda: 'USD',
      tipoCambio: 131.27,
      netoGravadoMonedaOriginal: 9291.79,
      ivaMonedaOriginal: 1951.28,
      totalMonedaOriginal: 11243.07,
      totalPesos: 1475877.80,
      categoria: 'sin_clasificar',
      signoFiscal: 1,
    },
  },
  {
    name: 'factura-b-imagen-comp-n',
    text: `
ORIGINAL
EJEMPLO B
B
COD. 01
FACTURA
Razon Social: EJEMPLO B
Punto de Venta: 00002 Comp. N 00000001
Fecha de Emision: 05/09/2023
CUIT: 20010203047
Ingresos Brutos: 20010203047
Fecha Inicio Actividades: 10/20/2004
CUIT: 27050607089
Apellido y Nombre/Razon Social: receptor de factura
Condicion frente al IVA: Consumidor Final
Producto Servicio Subtotal
pan $ 1,000.00
agua $ 6,000.00
manzana $ 1,500.00
Subtotal: $ 8,500.00
Importe Otros tributos: $ 0.00
Importe Total: $ 8,500.00
CAE N: 71164199718364
Fecha de Vto. de CAE: 21/09/2023
`,
    expected: {
      tipo: 'Factura B',
      cuit: '20010203047',
      razonSocial: 'EJEMPLO B',
      fecha: '05/09/2023',
      puntoVenta: 2,
      numero: 1,
      condicionIVA: 'Consumidor Final',
      netoGravado: 8500,
      iva: 0,
      total: 8500,
      cae: '71164199718364',
      fechaVencimiento: '21/09/2023',
      categoria: 'sin_clasificar',
      signoFiscal: 1,
    },
  },
  {
    name: 'factura-a-usd-total-ars-ocr-factor-10',
    text: `
ORIGINAL
A
COD. 01
FACTURA
Punto de Venta: 00001 Comp. Nro: 00000047
Fecha de Emision: 01/08/2022
Condicion frente al IVA: IVA Responsable Inscripto
Moneda: USD - Dolar Estadounidense
Importe Neto Gravado: USD 9291,79
IVA 21%: USD 1951,28
Importe Total: USD 11243,07
El total de este comprobante expresado en moneda de curso legal - Pesos Argentinos - considerando un tipo de cambio consignado es 131.270000 asciende a $ 14.758.778,00
`,
    expected: {
      tipo: 'Factura A',
      fecha: '01/08/2022',
      puntoVenta: 1,
      numero: 47,
      netoGravado: 1219733.27,
      iva: 256144.53,
      total: 1475877.80,
      moneda: 'USD',
      tipoCambio: 131.27,
      totalMonedaOriginal: 11243.07,
      totalPesos: 1475877.80,
      categoria: 'sin_clasificar',
      signoFiscal: 1,
    },
  },
  {
    name: 'factura-a-usd-rate-y-total-ocr-desplazados',
    text: `
ORIGINAL
A
FACTURA
Punto de Venta: 00001 Comp. Nro: 00000047
Fecha de Emision: 01/08/2022
Moneda: USD
Importe Neto Gravado: USD 9291,79
IVA 21%: USD 1951,28
Importe Total: USD 11243,07
El total de este comprobante expresado en moneda de curso legal - Pesos Argentinos - considerando un tipo de cambio consignado es 13127 asciende a $ 14.758.778,00
`,
    expected: {
      tipo: 'Factura A',
      fecha: '01/08/2022',
      puntoVenta: 1,
      numero: 47,
      netoGravado: 1219733.27,
      iva: 256144.53,
      total: 1475877.80,
      moneda: 'USD',
      tipoCambio: 131.27,
      totalMonedaOriginal: 11243.07,
      totalPesos: 1475877.80,
      categoria: 'sin_clasificar',
      signoFiscal: 1,
    },
  },
]
