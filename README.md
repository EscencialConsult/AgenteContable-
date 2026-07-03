# ONE - Agente Contable

App contable local-first para cargar comprobantes, extraer datos con OCR, revisarlos, clasificarlos, generar una preliquidacion de IVA y consultar por chat con IA.

## Que resuelve hoy

- carga manual y asistida de comprobantes
- OCR para imagenes y PDFs
- validaciones contables y revision
- bandeja operativa con filtros
- preliquidacion de IVA con exportacion a Excel
- backup local completo o por periodo
- chat contable con OpenAI

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Dexie sobre IndexedDB
- Express 5 para desarrollo local
- Vercel Functions y Netlify Functions para deploy
- Tesseract.js + pdfjs-dist para OCR
- OpenAI SDK para chat

## Como correrlo localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crea un `.env` con al menos:

```env
OPENAI_API_KEY=tu_api_key
JWT_SECRET=tu_secreto
APPS_SCRIPT_URL=tu_url_de_google_apps_script
ASSISTANT_ID=tu_assistant_id
```

Si usas fallback de chat con un modelo especifico, tambien puedes definir:

```env
OPENAI_CHAT_MODEL=gpt-4.1-mini
```

### 3. Levantar frontend y backend

En dos terminales:

```bash
npm run dev
npm run dev:api
```

O juntos:

```bash
npm run dev:all
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3001`

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

## Deploy

El proyecto ya esta preparado para dos destinos:

- `Vercel` usando `vercel.json` y `api/`
- `Netlify` usando `netlify.toml` y `netlify/functions/`

En ambos casos el frontend compila a `dist` y las rutas `/api/...` quedan resueltas por funciones serverless.

## Arquitectura resumida

- los datos operativos viven en IndexedDB del navegador
- el backend se usa para autenticacion y chat IA
- la logica de preliquidacion vive en `src/services/preliquidacionService.ts`
- los backups se exportan y restauran como JSON

Para mas detalle:

- [Arquitectura](C:/Users/santi/Desktop/agenteC/ARCHITECTURE.md)
- [Score actual](C:/Users/santi/Desktop/agenteC/ScoreActual.md)

## Limitaciones actuales

- los datos no se sincronizan entre equipos
- no hay persistencia remota de comprobantes
- faltan tests de integracion y end-to-end
- la app esta pensada hoy para uso local o de oficina chica
