# Portal Bancario IA (Next.js + Prisma)

Portal web con dos roles:
- `CAPTURADOR`: da de alta operaciones, cliente y documentos (facturas/identidad), con extracción de datos por IA.
- `ANALISTA`: consulta con un agente experto en búsqueda sobre operaciones y documentos.

Incluye:
- Alta de operación con documentos y análisis IA.
- Buscador IA con respuesta en lenguaje natural + miniaturas y link a documento.
- Listado de operaciones + vista detalle con datos cliente y documentos asociados.
- Arquitectura compatible con despliegue en Vercel.

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- OpenAI o Gemini para agentes IA
- Vercel Blob (opcional) para almacenar archivos

## 1) Configurar variables

Copia `.env.example` a `.env` y completa valores.

## 2) Instalar dependencias

```bash
npm install
```

## 3) Base de datos

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

## 4) Ejecutar

```bash
npm run dev
```

## Usuarios por defecto
- Capturador: `capturador` / `capturador123`
- Analista: `analista` / `analista123`

(Puedes cambiarlos vía variables de entorno.)

## Deploy en Vercel
1. Subir repo a GitHub.
2. Importar proyecto en Vercel.
3. Definir variables de entorno (`DATABASE_URL`, `AUTH_SECRET`, API keys, etc).
4. Ejecutar migraciones en tu DB de producción.
5. Deploy.

Nota: para almacenamiento persistente de archivos en Vercel, configura `BLOB_READ_WRITE_TOKEN`.
