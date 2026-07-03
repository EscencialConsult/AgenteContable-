# Arquitectura - ONE Agente Contable

_Actualizado: 3 de julio de 2026_

## Resumen

ONE es una app contable local-first orientada a carga, clasificacion, revision y preliquidacion de comprobantes.
Combina:

- frontend React con persistencia local en IndexedDB
- backend Express para desarrollo local
- funciones serverless para Vercel y Netlify
- OCR en cliente para extraer texto de imagenes y PDFs
- integracion con OpenAI para consultas contables por chat

La decision estructural mas importante sigue siendo esta: los datos operativos viven en el navegador del usuario, mientras que el backend se usa para autenticacion y chat IA.

## Stack

| Capa | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS v4 |
| Routing | react-router-dom 7 |
| Persistencia local | IndexedDB via Dexie |
| Backend local | Express 5 |
| Serverless | Vercel Functions (`api/`) + Netlify Functions (`netlify/functions/`) |
| IA | OpenAI SDK, Assistants API (threads/runs) con fallback a chat completions |
| OCR | Tesseract.js, pdfjs-dist |
| Auth | Google Apps Script para validar DNI + JWT con `jose` |
| Exportacion | `xlsx` + `xlsx-js-style` |
| UI | lucide-react, contexto de tema, toasts propios |
| Calidad | oxlint + tests de parser (`npm run test:parser`) |

## Principios actuales

1. **Local-first para los datos de negocio**
   Los comprobantes, periodos, lotes y mensajes locales se guardan en IndexedDB.

2. **Backend chico y enfocado**
   El servidor no administra comprobantes ni base relacional. Se concentra en login, autorizacion y chat IA.

3. **Runtime compartido**
   La logica de negocio de backend se comparte entre Express, Vercel y Netlify para evitar divergencias.

4. **Procesamiento pesado en cliente**
   OCR, parseo, validaciones y armado de preliquidacion ocurren mayormente del lado del frontend.

5. **MVP orientado a operacion real**
   La app prioriza flujo util sobre infraestructura compleja: cargar, revisar, guardar, exportar y respaldar.

## Mapa del repositorio

```text
/
|-- api/                          Vercel Functions
|   |-- auth/login.ts
|   `-- chat.ts
|
|-- config/                       Config compartida JS
|   |-- business.js
|   |-- constants.js
|   |-- index.js
|   `-- ui.js
|
|-- netlify/
|   `-- functions/                Netlify Functions
|       |-- auth-login.mjs
|       `-- chat.mjs
|
|-- public/                       Logos, favicon y assets publicos
|
|-- scripts/
|   `-- run-parser-tests.mjs
|
|-- server/                       Backend compartido
|   |-- clients/
|   |   `-- openaiClient.js
|   |-- controllers/
|   |   `-- chatController.js
|   |-- middleware/
|   |   |-- auth.js
|   |   |-- errorHandler.js
|   |   `-- validate.js
|   |-- routes/
|   |   |-- auth.js
|   |   `-- chat.js
|   `-- services/
|       |-- authService.js
|       |-- googleSheetsService.js
|       `-- openaiService.js
|
|-- src/
|   |-- components/
|   |-- config/
|   |-- context/
|   |-- db/
|   |   |-- database.ts
|   |   `-- repositories/
|   |-- hooks/
|   |-- pages/
|   |-- services/
|   |-- types/
|   `-- utils/
|
|-- tests/                        Fixtures y pruebas de parser
|-- server.js                     Entry point Express
|-- netlify.toml                  Config de deploy Netlify
|-- vercel.json                   Config de deploy Vercel
`-- vite.config.ts
```

## Frontend

### Shell de aplicacion

La app arranca en `src/App.tsx` con estos providers principales:

- `AuthProvider`
- `ThemeProvider`
- `ToastProvider`

Las rutas se cargan lazy y hoy exponen estas pantallas protegidas:

- `/chat`
- `/bandeja`
- `/upload`
- `/preliquidacion`
- `/backup`

`/login` queda como ruta publica.

### Estado global

#### Auth

`src/context/AuthContext.tsx`

- guarda `token` y `user` en `localStorage`
- expone `login`, `logout` e `isAuthenticated`
- protege rutas desde `ProtectedRoute`

#### Tema

`src/context/ThemeContext.tsx`

- soporta `dark` y `light`
- persiste el tema en `localStorage`
- actualiza `data-theme` en `document.documentElement`
- cambia favicon/logo segun modo usando `logoOne-dark.png` y `logoOne-light.png`

#### Toasts

`ToastProvider` centraliza feedback no bloqueante para acciones de carga, backup, errores y validaciones.

### Persistencia local

`src/db/database.ts` define la base Dexie `agenteContable`.

Tablas actuales:

- `comprobantes`
- `clientes`
- `periodos`
- `lotesCarga`
- `chatMessages`

La version actual del schema es la 5 y ya incluye migraciones para:

- periodos sin `clienteId`
- `estadoRevision`
- `nivelValidacion`
- `origen`
- `signoFiscal`
- `ivaDetalle`
- `impuestosDetalle`

### Paginas principales

#### Chat

- UI en `src/pages/ChatPage.tsx`
- usa `chatService` para llamar a `/api/chat`
- persiste historial local en `chatRepository`
- el backend usa OpenAI y devuelve una respuesta final ya resuelta

#### Bandeja

- lista y filtra comprobantes guardados
- concentra bastante logica de vista y edicion
- se apoya en componentes compartidos y repositorios Dexie

#### Upload

Es el flujo operativo mas importante del MVP:

1. seleccion de archivo
2. OCR
3. parseo del comprobante
4. correccion manual
5. guardado local

#### Preliquidacion

- UI en `src/pages/PreliquidacionPage.tsx`
- calculo extraido a `src/services/preliquidacionService.ts`
- exportacion Excel apoyada en `src/services/exportService.ts`
- contempla comprobantes computables, observados, pendientes, no computables y sin clasificar

#### Backup

- UI simplificada para usuario no tecnico en `src/pages/BackupPage.tsx`
- permite exportar copia completa o por periodo
- permite restaurar en modo `merge` o `replace`
- usa `navigator.storage.estimate()` para mostrar uso de espacio cuando el navegador lo soporta

## Servicios frontend

### `src/services/ocrService.ts`

- OCR de imagenes con Tesseract
- OCR de PDFs renderizando paginas con `pdfjs-dist`

### `src/services/parserService.ts`

- transforma texto OCR en un `Comprobante`
- ya no depende de una heuristica simple por letra de factura para compra/venta
- delega parte de la clasificacion en la capa fiscal actual

### `src/services/fiscalClassifierService.ts`

- determina tratamiento fiscal
- permite distinguir mejor entre debito fiscal, credito fiscal y no computable
- reduce el riesgo de clasificacion incorrecta sin contexto suficiente

### `src/services/validatorService.ts`

- ejecuta validaciones contables y de consistencia
- asigna `nivelValidacion`
- genera observaciones para revision

### `src/services/preliquidacionService.ts`

- concentra el calculo de resumen IVA
- separa ventas, compras computables y no computables
- usa `clasificacionFiscal` cuando existe
- evita que la pagina de preliquidacion concentre demasiada logica de negocio

### `src/services/backupService.ts`

- arma payloads de backup
- valida archivos de backup
- restaura datos con transacciones Dexie
- soporta copias completas o por periodo

## Backend

### Entry point local

`server.js` monta:

- `compression()`
- `cors()`
- `express.json()`
- rate limit para `/api/auth/login`
- health check en `/api/health`
- rutas `/api/auth/login` y `/api/chat`
- `errorHandler`

### Rutas

#### `server/routes/auth.js`

- valida body con `validateBody`
- requiere `dni` y `nombre`
- consulta autorizacion en Google Apps Script
- devuelve `token` JWT y `user`

#### `server/routes/chat.js`

- exige JWT via `authMiddleware`
- valida body (`message`, `image`)
- llama a `handleChat`

### Middleware

#### `server/middleware/auth.js`

Contiene dos variantes:

- `authMiddleware` para Express
- `authEdgeMiddleware` para runtimes tipo Fetch/Response

Ambas comparten verificacion de JWT.

#### `server/middleware/validate.js`

- valida shape basico del request
- se usa en login y chat

#### `server/middleware/errorHandler.js`

- normaliza errores de Express
- tambien expone `formatEdgeError` para serverless

### Servicios backend

#### `authService.js`

- firma y verifica JWT con `jose`

#### `googleSheetsService.js`

- valida DNI contra una Google Sheet via Apps Script
- evita OAuth complejo para este MVP

#### `openaiService.js`

- usa OpenAI SDK
- intenta flujo principal con Assistants API (`threads`, `messages`, `runs`)
- si el assistant falla con ciertos errores, cae a un fallback con `chat.completions`
- soporta texto y adjuntos de imagen en base64 o URL

## Serverless y deploy

### Vercel

Implementaciones en `api/`:

- `api/auth/login.ts`
- `api/chat.ts`

Estas funciones reutilizan servicios y middleware del backend compartido.

### Netlify

Implementaciones en `netlify/functions/`:

- `auth-login.mjs`
- `chat.mjs`

`netlify.toml` redirige:

- `/api/auth/login` -> `/.netlify/functions/auth-login`
- `/api/chat` -> `/.netlify/functions/chat`
- `/*` -> `/index.html`

### Desarrollo local

Durante desarrollo, Vite proxea `/api` al backend Express en `localhost:3001`.

## Flujos clave

### 1. Login

```text
LoginPage
  -> authService.login(dni, nombre)
  -> POST /api/auth/login
  -> validateDNI() en Apps Script
  -> createSessionJWT()
  -> AuthContext guarda token y user en localStorage
```

### 2. Chat IA

```text
ChatPage
  -> chatRepository guarda mensaje local
  -> chatService.sendMessage()
  -> POST /api/chat con JWT
  -> handleChat()
  -> openaiService.sendChatMessage()
  -> respuesta final
  -> chatRepository guarda respuesta local
```

### 3. Carga de comprobantes

```text
UploadPage
  -> usuario sube archivo
  -> OCR (imagen o PDF)
  -> parserService.parseComprobante()
  -> validatorService.validarComprobante()
  -> usuario revisa/corrige
  -> comprobanteRepository.addComprobante()
```

### 4. Preliquidacion

```text
PreliquidacionPage
  -> obtiene comprobantes del periodo
  -> calcularPreliquidacion()
  -> resume IVA, percepciones, retenciones y observaciones
  -> exportService genera Excel
```

### 5. Backup y restore

```text
BackupPage
  -> buildFullBackup() o buildPeriodoBackup()
  -> descarga JSON
  -> parseBackupFile()
  -> restoreBackup(merge|replace)
  -> Dexie transaction
```

## Decisiones tecnicas importantes

| Decision | Motivo |
|---|---|
| Datos operativos en IndexedDB | Permite modo local-first, baja complejidad y uso simple sin backend de datos |
| Backend sin CRUD de comprobantes | El negocio principal vive en cliente y no requiere base remota en esta etapa |
| Config compartida en JS | Facilita consumo desde frontend, Node y runtimes serverless |
| Doble target Vercel/Netlify | Da flexibilidad comercial y operativa para deploy |
| OCR en cliente | Evita costo de servidor y simplifica privacidad basica de documentos |
| JWT simple sin refresh tokens | Suficiente para un MVP con login liviano por DNI |
| Backup en JSON | Portable, simple de inspeccionar y restaurar |
| Preliquidacion extraida a servicio | Reduce acoplamiento y mejora mantenibilidad |

## Riesgos vigentes

1. **Persistencia local solamente**
   Si el usuario cambia de navegador o equipo sin backup, pierde continuidad operativa.

2. **Sin multiusuario real**
   No hay sincronizacion ni fuente compartida de verdad.

3. **Cobertura de testing parcial**
   Existen pruebas de parser, pero faltan integracion backend, UI y flujo end-to-end.

4. **Paginas grandes**
   `BandejaPage` y `PreliquidacionPage` siguen concentrando bastante logica y render.

5. **Chunking y carga inicial**
   Hay margen para recortar peso en preliquidacion y limitar historial de chat cargado.

## Scripts utiles

```bash
npm run dev
npm run dev:api
npm run dev:all
npm run build
npm run preview
npm run lint
npm run test:parser
```

## Proximas mejoras recomendadas

1. Agregar tests de integracion para login, chat y backup.
2. Definir si la estrategia final seguira siendo local-first o tendra persistencia remota.
3. Extraer mas logica de `BandejaPage` y `PreliquidacionPage`.
4. Medir contraste y accesibilidad del rebrand en ambos temas.
5. Incorporar observabilidad minima para deploy productivo.
