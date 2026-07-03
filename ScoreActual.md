# ONE - Agente Contable

_Analisis actualizado: 3 de julio de 2026_

App contable con chat IA, OCR de comprobantes, bandeja operativa, preliquidacion de IVA, backup local y branding renovado.

**Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Dexie (IndexedDB) + Express + Edge Functions + Netlify Functions

---

## Diagnostico General

| Categoria | Score | Prioridad |
|---|---|---|
| Arquitectura | **8.5/10** | Baja |
| Frontend | **8.5/10** | Baja |
| Backend | **8/10** | Media |
| UI | **8.5/10** | Baja |
| UX | **8.5/10** | Baja |
| Seguridad | **7.5/10** | Media |
| Rendimiento | **7.5/10** | Media |
| Escalabilidad | **4.5/10** | Alta |
| Mantenibilidad | **8.5/10** | Baja |
| Calidad del codigo | **8/10** | Baja |
| Reutilizacion | **8/10** | Baja |
| Accesibilidad | **8/10** | Baja |
| Preparacion produccion | **6/10** | Alta |
| **Promedio** | **7.8/10** | |

---

## Por Categoria

### Arquitectura (8.5/10)

**Bien**
- Separacion clara entre frontend, backend Express y funciones edge.
- Config compartida en `config/` y barrel TS en `src/config/index.ts`.
- Rutas lazy-loaded con `React.lazy` + `Suspense`.
- La logica de preliquidacion fue extraida a `src/services/preliquidacionService.ts`, lo que reduce acoplamiento con la exportacion Excel.
- El proyecto ya contempla dos targets de deploy: Vercel y Netlify.

**Por mejorar**
- Siguen conviviendo varios targets de runtime y deploy, lo que suma complejidad operativa.
- Conviene mantener sincronizados `README.md`, `ARCHITECTURE.md` y `ScoreActual.md` para que la documentacion no vuelva a quedar atrasada.

### Frontend (8.5/10)

**Bien**
- Componentizacion razonable y rutas protegidas/publicas bien separadas.
- OCR en Web Worker con `tesseract.js` y `pdfjs-dist`.
- Estado local consistente para auth, tema, toasts y datos de negocio.
- Flujo de carga, validacion y preliquidacion bien conectado.

**Por mejorar**
- Hay bastante logica de pagina dentro de componentes grandes como `BandejaPage` y `PreliquidacionPage`.
- Faltan hooks de dominio tipo `useComprobantes`, `useBackup`, `usePreliquidacion`.

### Backend (8/10)

**Bien**
- Express y edge functions comparten servicios y middleware clave.
- `compression`, `express-rate-limit`, health check y validacion de body ya estan incorporados.
- JWT con `jose` y validacion de DNI via Google Apps Script.
- Se agregaron funciones para Netlify compatibles con las rutas actuales `/api/...`.

**Por mejorar**
- No hay tests automatizados de rutas, auth o integracion backend.
- La superficie de deploy quedo mejor, pero todavia no hay un flujo CI que la verifique en ambos targets.

### UI (8.5/10)

**Bien**
- La app ya tiene identidad visual de marca con la nueva paleta y logos por tema.
- Sidebar, login y superficies principales mantienen una direccion consistente.
- El sistema visual sigue siendo bastante uniforme aun despues del rebrand.

**Por mejorar**
- El estilo general todavia depende mucho del mismo patron glassmorphism.
- Hay pantallas densas como Preliquidacion y Bandeja que podrian ganar jerarquia visual.

### UX (8.5/10)

**Bien**
- Flujo de upload claro: subir, procesar, revisar, guardar.
- La preliquidacion ahora es mas segura: excluye comprobantes sin clasificar y los hace visibles.
- Backup fue simplificado para usuarios no tecnicos.
- Paginacion, toasts, modo offline y confirmacion de salida siguen siendo puntos fuertes.

**Por mejorar**
- Algunos textos y decisiones importantes siguen dependiendo de `window.confirm`.
- Hay conceptos fiscales complejos que todavia se apoyan en lectura manual del usuario final.

### Seguridad (7.5/10)

**Bien**
- Variables sensibles fuera del repo.
- JWT valido en frontend y backend.
- Rate limiting en login.
- Validacion de shape y longitudes en requests de login/chat.

**Por mejorar**
- No hay CSRF ni endurecimiento extra para sesion web.
- Sigue faltando validacion mas estricta de tamano y tipo real de adjuntos mas alla del flujo de UI.
- Los backups y datos siguen siendo locales y potencialmente sensibles si el equipo no esta controlado.

### Rendimiento (7.5/10)

**Bien**
- OCR aislado del hilo principal.
- Lazy loading de paginas.
- Paginacion en bandeja.
- El bundle principal sigue razonable para la app, aunque pesado.

**Por mejorar**
- El build sigue avisando chunks grandes, especialmente en Preliquidacion.
- Chat sigue cargando todo el historial local sin limite.
- OCR en cliente depende del hardware del usuario.

### Escalabilidad (4.5/10)

**Bien**
- La estructura modular deja una base decente para migrar a backend con persistencia real.
- El proyecto ya tiene abstracciones que facilitarian mover datos fuera del navegador.

**Por mejorar**
- IndexedDB sigue siendo monousuario y local por navegador.
- No hay sincronizacion entre dispositivos ni multi-tenant real.
- La app sigue siendo fuerte como herramienta local/oficina chica, no como plataforma multiusuario.

### Mantenibilidad (8.5/10)

**Bien**
- La extraccion de `preliquidacionService` fue una mejora clara.
- Tipos bien definidos en `src/types/comprobante.ts`.
- Servicios especializados por dominio: parser, validador, OCR, backup, exportacion.
- El parser ahora es mas conservador y menos riesgoso al clasificar compra/venta.

**Por mejorar**
- `ScoreActual.md` y `ARCHITECTURE.md` quedaron atrasados con frecuencia; falta disciplina de documentacion viva.
- Siguen existiendo bloques grandes y algo repetidos en algunas paginas.

### Calidad del codigo (8/10)

**Bien**
- TypeScript fuerte en frontend.
- Validaciones contables mas robustas.
- Tests de parser cubren OCR, moneda extranjera, notas de credito y la nueva regla de clasificacion fiscal pendiente.
- El codigo nuevo fue razonablemente bien encapsulado.

**Por mejorar**
- Persisten `console.error` y manejo algo basico de errores en varias paginas.
- No hay suite de tests de UI ni integracion.

### Reutilizacion (8/10)

**Bien**
- UI basica reutilizable: `Button`, `Input`, `Select`, `Modal`, `Pagination`, `EstadoBadge`.
- Servicios reutilizables de backup, OCR, parser, validacion y preliquidacion.
- La exportacion Excel consume ahora un resultado de negocio ya calculado.

**Por mejorar**
- `DetailView` de `BandejaPage` sigue inline.
- Algunas superficies de estadisticas y tarjetas se repiten con variantes similares.

### Accesibilidad (8/10)

**Bien**
- Labels, roles, `aria-live`, skip link y soporte de teclado siguen presentes.
- El trabajo previo de modal y badges accesibles se mantiene.

**Por mejorar**
- No hay evidencia de tests de accesibilidad automatizados.
- Con el rebrand convendria revisar contraste real en ambos temas con tooling dedicado.

### Preparacion produccion (6/10)

**Bien**
- Build estable.
- Deploy preparado para Vercel y Netlify.
- Backup/export local ya existe, lo que reduce riesgo operativo para un uso simple.

**Por mejorar**
- No hay CI/CD.
- No hay monitoreo, analytics ni captura centralizada de errores.
- No hay persistencia remota de datos de negocio.
- No hay pruebas automatizadas del flujo completo de deploy.

---

## Hallazgos Relevantes

### Lo mas valioso hoy

- El MVP 2 esta bastante mejor parado que antes: OCR, validaciones, preliquidacion y exportacion ya forman un flujo util.
- La clasificacion fiscal dejo de asumir compra/venta por letra de factura, lo cual era uno de los riesgos funcionales mas serios.
- El producto se siente mas presentable para usuarios finales gracias al rebrand y a la simplificacion de la pantalla de backup.

### Riesgos que siguen abiertos

- Persistencia local: todo lo importante vive en el navegador.
- Sincronizacion y multiusuario: siguen fuera del alcance actual.
- Testing: hay tests de parser, pero falta cobertura de UI, rutas y flujos integrados.

### Lectura ejecutiva

- Hoy el producto se ve y se siente mas cercano a una app utilizable en un entorno real de trabajo chico.
- El mayor salto pendiente no esta en UI sino en operacion: persistencia remota, observabilidad y pruebas de punta a punta.
- Si la decision sigue siendo mantener un enfoque local-first, el siguiente foco deberia ser resiliencia, respaldo y soporte operativo. Si la idea es escalar, conviene empezar por una estrategia de datos compartidos.

---

## Proximos Pasos Recomendados

1. **Alta** - Agregar tests de integracion para login, chat y backup.
2. **Alta** - Definir si el producto seguira siendo local-first o si migrara a persistencia remota.
3. **Media** - Reducir tamano del chunk de Preliquidacion y revisar carga inicial de Chat.
4. **Media** - Extraer vistas inline grandes de `BandejaPage` y `PreliquidacionPage`.
5. **Media** - Mantener `README.md`, `ARCHITECTURE.md` y `ScoreActual.md` sincronizados en cada cambio estructural.
6. **Baja** - Revisar contraste final y pulir consistencia visual del nuevo sistema de marca.
