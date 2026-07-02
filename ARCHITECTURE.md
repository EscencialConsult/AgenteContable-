# Arquitectura — Agente Contable

## Stack

| Capa        | Tecnología                                                                 |
|-------------|---------------------------------------------------------------------------|
| Frontend    | React 19, TypeScript 6, Vite 8, Tailwind CSS v4                          |
| Backend     | Express 5 (Node.js) + Vercel Edge Functions (dual runtime)               |
| AI          | OpenAI Assistants API (Assistants v2)                                    |
| OCR         | Tesseract.js (imágenes), pdfjs-dist (PDFs)                               |
| Auth        | Google Apps Script Web App (validación DNI) + JWT (HS256, jose)          |
| Base datos  | IndexedDB via Dexie (local-first), Google Sheet (usuarios)               |
| Exportación | SheetJS (XLSX)                                                           |
| Iconos      | lucide-react                                                             |

## Estructura de directorios

```
/
├── config/                          ★ Configuración compartida (JS barrel)
│   ├── constants.js                   OpenAI, puerto, límites
│   ├── business.js                    Reglas de negocio (categorías, alícuotas, validaciones)
│   ├── ui.js                          Textos, URLs de UI
│   ├── index.js                       Barrel: re-exporta todo
│   ├── *.d.ts                         Declaraciones de tipos para consumo TS
│
├── server/                          ★ Backend Express (JS, Node.js)
│   ├── clients/
│   │   └── openaiClient.js            Singleton HTTP client para OpenAI (fetch)
│   ├── services/
│   │   ├── openaiService.js           Lógica: thread → message → run → poll → response
│   │   ├── authService.js             JWT: createSessionJWT / verifySessionJWT (jose)
│   │   └── googleSheetsService.js     Valida DNI contra Apps Script
│   ├── controllers/
│   │   └── chatController.js          Orquesta: extrae input, llama a openaiService
│   ├── middleware/
│   │   ├── auth.js                    authMiddleware (Express) + authEdgeMiddleware (Edge)
│   │   └── errorHandler.js            errorHandler + formatEdgeError
│   └── routes/
│       ├── auth.js                    POST / → valida DNI, devuelve JWT
│       └── chat.js                    POST / → authMiddleware, llama a chatController
│
├── server.js                        ★ Entry point Express: cors, routes, listen
│
├── api/                             ★ Edge Functions (Vercel, TypeScript)
│   ├── chat.ts                        POST → authEdgeMiddleware + handleChat
│   └── auth/
│       └── login.ts                   POST → validateDNI + createSessionJWT
│
├── src/                             ★ Frontend React
│   ├── main.tsx                       Entry point: BrowserRouter + StrictMode
│   ├── App.tsx                        AuthProvider + route definitions
│   │
│   ├── types/
│   │   └── comprobante.ts             Interfaces: Comprobante, ChatMessage, Validacion, Categoria...
│   │
│   ├── config/
│   │   └── index.ts                   Barrel TS: re-exporta desde config/*.js
│   │
│   ├── context/
│   │   └── AuthContext.tsx            Estado global de auth (user, token, login, logout)
│   │
│   ├── hooks/
│   │   └── useAuth.ts                Hook para consumir AuthContext
│   │
│   ├── services/
│   │   ├── apiClient.ts               Cliente HTTP base con ApiError e inyección de token
│   │   ├── authService.ts             login() → POST /api/auth/login
│   │   ├── chatService.ts             sendMessage() → POST /api/chat
│   │   ├── ocrService.ts              extractTextFromImage / extractTextFromPDF
│   │   ├── parserService.ts           parseComprobante() texto extraído → estructura
│   │   ├── validatorService.ts        validarComprobante() + getNivelGeneral()
│   │   └── exportService.ts           calcularPreliquidacion() + exportToExcel()
│   │
│   ├── utils/
│   │   └── format.ts                  formatCurrency() + parseNumber()
│   │
│   ├── db/
│   │   ├── database.ts                Dexie: tablas comprobantes + chatMessages
│   │   └── repositories/
│   │       ├── chatRepository.ts       getAllMessages, saveMessage
│   │       └── comprobanteRepository.ts CRUD completo
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx             Botón reutilizable (variants, sizes, loading)
│   │   │   ├── Input.tsx              Input con label + glassmorphism
│   │   │   └── Select.tsx             Select con label + dark
│   │   ├── Layout.tsx                 Sidebar + Outlet
│   │   ├── Sidebar.tsx               Navegación + logo + logout
│   │   ├── Modal.tsx                  Modal reutilizable (backdrop, scroll-lock, close)
│   │   ├── EstadoBadge.tsx            Badge de estado coloreado con ícono
│   │   ├── FilterBar.tsx              Filtros: search + categoria + tipo + estado
│   │   ├── ChatInput.tsx              Textarea + attach image + send
│   │   ├── MessageBubble.tsx          Burbuja de chat (user/assistant)
│   │   ├── LoadingDots.tsx            Indicador de carga animado
│   │   └── ComprobanteForm.tsx        Formulario completo de comprobante
│   │
│   └── pages/
│       ├── LoginPage.tsx              Login con DNI
│       ├── ChatPage.tsx               Chat con IA + historial IndexedDB
│       ├── BandejaPage.tsx            Tabla de comprobantes + filtros + CRUD modals
│       ├── UploadPage.tsx             Wizard: upload → OCR → review → save
│       └── PreliquidacionPage.tsx     Preliquidación IVA mensual + Excel
│
├── public/
│   ├── logoEscencial.png              Logo versión oscura / favicon
│   ├── logoEscencial-light.png        Logo versión clara / favicon
│   ├── favicon.svg                    Favicon original (fallback)
│   └── icons.svg                      Íconos SVG
│
├── vite.config.ts                    Proxy /api → localhost:3001
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── vercel.json                       Deploy config
└── .env                              OPENAI_API_KEY, JWT_SECRET, APPS_SCRIPT_URL
```

## Arquitectura por capas

### Backend

```
HTTP (Express/Edge)
       │
       ▼
   routes/                    ← Define endpoints, aplica middleware
       │
       ▼
   middleware/                ← auth (JWT), errorHandler
       │
       ▼
   controllers/               ← Orquesta: recibe input, llama servicios, devuelve resultado
       │
       ▼
   services/                  ← Lógica de negocio pura
       │
       ▼
   clients/                   ← HTTP clients (OpenAI)
```

#### Dual runtime

Cada endpoint tiene dos implementaciones que comparten los mismos `services/`, `controllers/` y `config/`:

| Endpoint         | Express (server.js)              | Edge (api/)              |
|------------------|----------------------------------|--------------------------|
| POST /api/chat   | `server/routes/chat.js`          | `api/chat.ts`            |
| POST /api/auth/login | `server/routes/auth.js`      | `api/auth/login.ts`      |

- Express se usa en desarrollo local (`node server.js`)
- Edge functions se usan en producción Vercel
- Los módulos compartidos son JS plano (compatible con ambos runtimes)
- Los middlewares tienen variantes Express (`req, res, next`) y Edge (`Request → Response`)

### Frontend

```
Pages                        ← Composición de componentes + lógica de página
  │
  ├── components/            ← UI reutilizable (atómicos y moleculares)
  ├── services/              ← API calls (chatService, authService)
  ├── db/repositories/       ← Abstracción sobre Dexie (chatRepository, comprobanteRepository)
  ├── context/               ← Estado global (AuthContext)
  ├── hooks/                 ← Hooks React (useAuth)
  ├── utils/                 ← Funciones puras (formatCurrency, parseNumber)
  └── types/                 ← Interfaces compartidas
```

### Config (compartida)

Los archivos en `config/*.js` son JS vanilla (sin imports pesados) para ser consumidos tanto desde Node.js como desde el Edge runtime y el frontend:

- `config/constants.js` → `src/config/index.ts` (TS barrel)
- `config/constants.js` → `server/` (ECMAScript modules)

## Flujo de datos

### Chat

```
Usuario escribe mensaje
       │
       ▼
ChatPage (src/pages/ChatPage.tsx)
  │  └─ chatRepository.saveMessage(userMsg)
  │  └─ chatService.sendMessage(text, image, token)
  │       └─ apiClient.apiPost('/api/chat', body, token)
  │            └─ POST /api/chat
  │
  ▼ (Express o Edge)
authMiddleware / authEdgeMiddleware
  │  └─ verifySessionJWT(token) → payload.dni
  │
  ▼
chatController.handleChat({ message, image })
  │  └─ openaiService.sendChatMessage(text, image)
  │       └─ openaiClient (singleton)
  │            └─ POST /v1/threads
  │            └─ POST /v1/threads/{id}/messages
  │            └─ POST /v1/threads/{id}/runs
  │            └─ GET /v1/threads/{id}/runs/{runId} (polling)
  │            └─ GET /v1/threads/{id}/messages
  │
  ▼
{ reply } → response
  │
  ▼
ChatPage guarda assistant message en IndexedDB y lo muestra
```

### Login

```
Usuario ingresa DNI
       │
       ▼
LoginPage → useAuth().login(dni)
  │  └─ authService.login(dni)
  │       └─ POST /api/auth/login { dni }
  │
  ▼ (Express o Edge)
validateDNI(dni)
  │  └─ POST (axios) → Google Apps Script Web App
  │  └─ Apps Script busca DNI en columna B del sheet "usuarios"
  │
  ▼
createSessionJWT(dni)
  │  └─ SignJWT (HS256) con exp: 24h
  │
  ▼
{ token, user: { dni } } → response
  │
  ▼
AuthContext guarda en localStorage → isAuthenticated = true
```

### Upload → OCR → Parse → Save

```
Usuario arrastra/sube archivo
       │
       ▼
UploadPage (4 pasos)
  1. File selection (drag-drop o input)
  2. Processing:
       └─ Si es imagen → Tesseract OCR (español)
       └─ Si es PDF → pdfjs-dist renderiza cada página a canvas → Tesseract OCR
  3. Review:
       └─ parserService.parseComprobante(rawText, fileName)
       └─ Usuario corrige en ComprobanteForm
  4. Save:
       └─ comprobanteRepository.addComprobante(data)
```

## Decisiones técnicas clave

| Decisión | Justificación |
|----------|---------------|
| **JS compartido (no TS)** para server/ | Edge runtime y Node.js pueden importar JS plano sin compilación. TS requeriría build step extra. |
| **axios en vez de fetch nativo** en googleSheetsService | Apps Script responde 302 redirect; Node.js 20 cambia POST a GET en redirect. axios preserva el método. |
| **Dos middlewares de auth** (Express + Edge) | Misma lógica de verificación JWT, distinta firma (req/res vs Request/Response). Comparten `verifySessionJWT`. |
| **IndexedDB via Dexie** para datos de usuario | Sin servidor de base de datos. Datos 100% offline. Comprobantes y mensajes persisten localmente. |
| **JWT sin refresh token** | Sesión simple de 24h. El login es vía DNI (baja sensibilidad). Se puede agregar refresh si es necesario. |
| **Apps Script en vez de Google Sheets API** | Sin OAuth, sin service account. Lee columna B del sheet vía POST simple. Ya existía el sheet. |
| **Singleton de openaiClient** | Reusa la misma instancia con headers pre-configurados. Thread-safe en Node.js. |

## Scripts de desarrollo

```bash
npm run dev              # Frontend Vite (con proxy /api → localhost:3001)
npm run dev:api          # Backend Express en puerto 3001
npm run dev:all          # Ambos simultáneamente
npm run build            # tsc -b && vite build
npm run preview          # Vista previa del build
npm run lint             # Oxlint
```
