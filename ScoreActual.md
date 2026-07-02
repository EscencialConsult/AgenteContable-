# Agente Contable — Escencial

App contable con chat IA (OpenAI Assistants), OCR de comprobantes (Tesseract.js), bandeja de gestión y preliquidación de IVA.

**Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie (IndexedDB) + Express + Vercel Edge

---

## Diagnóstico General

| Categoría | Score | Prioridad |
|---|---|---|
| Arquitectura | **8.5/10** | Baja |
| Frontend | **9/10** | Baja |
| Backend | **8.5/10** | Baja |
| UI | **9/10** | Baja |
| UX | **8.5/10** | Baja |
| Seguridad | **7/10** | Baja |
| Rendimiento | **7/10** | Baja |
| Escalabilidad | 4/10 | Alta |
| Mantenibilidad | **8/10** | Baja |
| Calidad del código | **7.5/10** | Baja |
| Reutilización | **7.5/10** | Baja |
| Accesibilidad | **8/10** | Baja |
| Preparación producción | 5/10 | Alta |
| **Promedio** | **7.5/10** | |

---

## Por Categoría

### Arquitectura (8.5/10) ↑

**Bien**
- Separación en capas clara: `clients/` → `services/` → `controllers/` → `routes/`
- Lógica de negocio compartida entre Express y Edge runtimes (openaiService, chatController)
- Config centralizada en `config/` (JS vanilla compatible con todos los runtimes)
- API client abstraction en frontend (`apiClient.ts`, `chatService.ts`)
- Base de datos local con capa repository (`repositories/`)
- ✅ **Error Boundaries** por ruta — un error no tumba toda la app
- ✅ **Lazy loading** de rutas completas con `React.lazy` + `Suspense`

**Por mejorar**
- (sin items pendientes)

### Frontend (9/10) ↑

**Bien**
- React 19 con hooks modernos y componentes modulares
- TypeScript estricto en toda la app
- Uso correcto de `useMemo` y `useEffect`
- Llamadas a API abstraídas en service layer (`chatService`, `authService`, `apiClient`)
- Operaciones de IndexedDB abstraídas en repositorios
- ✅ **Paginación** en tabla de comprobantes (componente Pagination reutilizable)
- ✅ **OCR en Web Worker** — pdfjs-dist y tesseract.js fuera del bundle principal
- ✅ **Lazy loading** de todas las rutas con `React.lazy` + `Suspense`
- ✅ **`React.memo`** en filas de tabla con validaciones (compara por id)

**Por mejorar**
- (sin items pendientes)

### Backend (8.5/10) ↑

**Bien**
- Express + Vercel Edge Function con código compartido
- Manejo de errores centralizado (`errorHandler.js`, `formatEdgeError`)
- Autenticación JWT real con middleware en ambos runtimes
- ✅ **OpenAI SDK con `createAndPoll`** — polling eficiente con backoff automático (vs while + sleep fijo)
- ✅ **Cleanup de threads** — se eliminan post-respuesta (try/finally, best-effort)
- ✅ **Rate limiting** en login (20 intentos/15min, express-rate-limit)
- ✅ **Health check** en `GET /api/health`
- ✅ **Compresión gzip** (compression middleware)
- ✅ **Validación de schema** en requests (middleware validateBody)

**Por mejorar**
- Sin tests automatizados

### UI (9/10) ↑

**Bien**
- Diseño glass-morphism cuidado y coherente
- Paleta consistente (teal / navy)
- Animaciones sutiles y transiciones suaves
- ✅ **Sidebar responsive** — se colapsa en mobile con overlay y botón hamburguesa
- ✅ **Tablas con scroll horizontal** en pantallas chicas (overflow-x-auto)
- ✅ **Tema claro/oscuro** con toggle en sidebar, persistencia en localStorage
- ✅ **Logos y Favicon adaptativos** — logos e íconos cambian dinámicamente según el tema seleccionado (claro/oscuro) para garantizar máxima legibilidad y contraste.

### UX (8.5/10) ↑

**Bien**
- Flujo de subida progresivo claro (upload → processing → review → done)
- Navegación limpia con sidebar y estados activos
- ✅ **Paginación** en la bandeja con selector de filas por página
- ✅ **Toast notifications** con auto-dismiss para feedback de acciones (guardar/eliminar)
- ✅ **Confirmación al salir** de formularios sin guardar (useBlocker + beforeunload)
- ✅ **Debounce** de 300ms en búsqueda de la bandeja
- ✅ **Banner offline** que informa cuando no hay conexión

**Por mejorar**
- (sin items pendientes)

### Seguridad (7/10) ↑

**Bien**
- API key en `.env`, `.gitignore` configurado
- CORS configurado en backend
- ✅ **Autenticación JWT real** con `jose` (HS256, 24h de expiración)
- ✅ **Token verificado en backend** (`authMiddleware`, `authEdgeMiddleware`)
- ✅ **DNIs ya no están hardcodeados en frontend** — se validan contra Google Apps Script
- Sesión almacenada en localStorage + Authorization header

**Por mejorar**
- Sin HTTPS forzado en local
- Sin CSRF
- Sin sanitización de inputs en API (más allá de regex básico)
- Imágenes en base64 viajan sin validación de tamaño

### Rendimiento (7/10) ↑

**Bien**
- IndexedDB (Dexie) para datos locales
- `useMemo` para filtros en frontend
- Chunking de build con Vite
- ✅ **OCR en Web Worker** — tesseract.js y pdfjs-dist corren fuera del hilo principal
- ✅ **Paginación** en bandeja — solo se renderizan 25 filas por vez
- ✅ **Bundle principal reducido** — pdfjs-dist y tesseract.js van solo en el worker chunk (423KB menos en el bundle crítico)

**Por mejorar**
- Chat carga todos los mensajes de IndexedDB sin límite

### Escalabilidad (4/10)

**Bien**
- Arquitectura modular permite extensión
- Capas backend ya separadas para agregar DB real

**Por mejorar**
- IndexedDB = un solo usuario, sin sincronización
- Sin backend de base de datos (todo en el browser)
- Sin multi-tenencia (todos comparten el mismo assistant de OpenAI)
- Sin paginación server-side
- OCR en cliente = limitado por dispositivo del usuario

### Mantenibilidad (8/10) ↑

**Bien**
- Tipos TypeScript claros y completos
- Nombres consistentes en archivos y funciones
- ✅ **Lógica duplicada eliminada**: openaiService compartido entre Express y Edge
- ✅ **ASSISTANT_ID y constantes** centralizados en `config/`
- ✅ **Error handling unificado** en Express y Edge
- Estructura de proyecto predecible

**Por mejorar**
- Sin tests unitarios ni de integración
- Sin Storybook / documentación de componentes

### Calidad del código (7.5/10) ↑

**Bien**
- TypeScript en toda la codebase
- Async/await consistente, patrones claros
- Componentes con interfaces Props tipadas
- ✅ `api/chat.ts` simplificado drásticamente (~30 líneas vs 166 originales)
- ✅ Error handling centralizado (ya no repetido en cada handler)
- ✅ `parseNumber` extraído elimina duplicación de `parseFloat(x.replace(',', '.'))`

**Por mejorar**
- `console.warn` para errores esperados (deberían manejarse mejor)
- Parámetro `_fileName` no usado en parserService
- Sin lint config extendido (oxlint apenas configurado)

### Reutilización (7.5/10) ↑

**Bien**
- Componentes UI: `Button`, `Modal`, `Input`, `Select`, `Pagination`, `LoadingDots`, `EstadoBadge`
- Utilidades: `formatCurrency`, `parseNumber`
- Repositorios: `chatRepository`, `comprobanteRepository`
- Servicios: `apiClient`, `chatService`, `authService`
- ✅ **Pagination** componente reutilizable con navegación, ellipsis y selector de page size

**Por mejorar**
- `DetailView` definido dentro de `BandejaPage` (no extraído a componente propio)
- PreliquidacionPage tiene su propia versión inline del detalle (duplicación)
- Sin custom hooks (`useComprobantes`, `useChat`)
- `FilterBar` acoplado a la interfaz de BandejaPage
- Lógica de validación de CUIT no extraída como util independiente

### Accesibilidad (8/10) ↑

**Bien**
- Formularios con `<label>` correctos
- HTML semántico básico
- ✅ **`aria-label`** en todos los botones de íconos (modal close, acciones de tabla, detalle)
- ✅ **Focus trap** en Modal con `role="dialog"` + `aria-modal`
- ✅ **Roles ARIA** en elementos interactivos (`role="navigation"`, `role="main"`, `role="row"`)
- ✅ **Estado con texto `sr-only`** para screen readers (badge de validaciones)
- ✅ **Skip-to-content link** visible al hacer focus
- ✅ **Soporte de teclado** en filas de tabla (`tabIndex={0}` + Enter para ver detalle)
- ✅ **`aria-live`** en regiones dinámicas (loading `role="status"`, toast `role="status"`, offline `role="alert"`)

**Por mejorar**
- (sin items pendientes)

### Preparación producción (5/10)

**Bien**
- Configuración de build para Vercel (`vercel.json`)
- `.env` + `.gitignore` correcto

**Por mejorar**
- Sin CI/CD pipeline
- Sin tests configurados en `package.json`
- Sin Docker / docker-compose
- Sin monitoreo de errores (Sentry, LogRocket, etc.)
- Sin estrategia de backup para IndexedDB
- Sin Service Worker / PWA
- Sin analytics

---

## Próximos Pasos Recomendados

1. **Alta** — Agregar tests (unitarios + integración)
2. **Media** — Extraer DetailView a componente compartido
3. **Media** — Agregar sanitización de inputs en API
4. **Baja** — Implementar paginación server-side
5. **Baja** — Agregar validación de tamaño en imágenes base64
6. **Baja** — Mejorar focus visible indicators en todos los elementos interactivos
