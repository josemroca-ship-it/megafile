# Deploy en Vercel (paso a paso)

## 1) Requisitos
- Proyecto en GitHub.
- Base de datos PostgreSQL productiva (Neon recomendado).
- Cuenta Vercel.

## 2) Variables de entorno en Vercel
En Project Settings > Environment Variables, define:

- `DATABASE_URL` (PostgreSQL de producción)
- `AUTH_SECRET` (secreto largo)
- `AI_PROVIDER` (`openai` o `gemini`)
- `OPENAI_API_KEY` (si usas OpenAI)
- `GEMINI_API_KEY` (si usas Gemini)
- `BLOB_READ_WRITE_TOKEN` (si usarás Vercel Blob)
- `CAPTURADOR_USER`, `CAPTURADOR_PASS`, `ANALISTA_USER`, `ANALISTA_PASS` (opcional)

## 3) Comandos de Prisma para producción
Antes de usar la app en producción, ejecuta migraciones en la DB productiva:

```bash
npx prisma migrate deploy
```

Y si quieres crear usuarios base:

```bash
npm run prisma:seed
```

## 4) Deploy por dashboard (recomendado)
1. Importa el repo en Vercel.
2. Configura variables.
3. Deploy.

## 5) Deploy por CLI (opcional)
Desde tu máquina local:

```bash
cd /Users/josemariaroca/Documents/codex
npm i -g vercel
vercel login
vercel --prod
```

## 6) Verificación post-deploy
- Login funciona.
- Alta de operación crea registros.
- Búsqueda y reportes responden.
- Miniaturas y apertura de documentos funcionan.
