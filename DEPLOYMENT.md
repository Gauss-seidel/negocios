# Deployment — BarberShifts

> Cómo hacer deploy del frontend en Render.

## Stack

- **Frontend**: React + Vite (SPA estática)
- **Host**: Render (Static Site)
- **DB + Auth**: Supabase (manejado aparte)
- **No hay backend propio** — todo via Supabase (Auth, DB, Edge Functions)

## Variables de entorno

| Variable | Dónde conseguirla |
|----------|-------------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon public key |

## Build

```bash
cd frontend
npm run build   # → dist/
```

El build produce una carpeta `dist/` con archivos estáticos.

## Deploy en Render

### Opción 1: Static Site (recomendada)

1. En Render Dashboard > New > Static Site
2. Conectar repo de GitHub (`negocios`)
3. Configurar:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Agregar variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
5. Crear

### Opción 2: Deploy manual

```bash
npm run build
# Subir dist/ a cualquier hosting estático
```

## Post-deploy

- Verificar que las rutas funcionan (React Router en SPA necesita configurar redirect de 404 → index.html en Render, se hace automático con Static Site)
- Verificar login
- Verificar que el PWA funciona (Service Worker)
- Verificar que las fonts de Google cargan (CSP)

## Supabase (no requiere deploy)

- Las migraciones SQL se aplican manualmente via `supabase db query --linked`
- Las Edge Functions se deployan con `supabase functions deploy admin-super`
- La config de Auth (CAPTCHA, rate limits) se maneja desde Supabase Dashboard

## URLs

- **Producción**: `https://barbershifts.onrender.com` (cuando esté deployado)
- **Supabase project**: `https://mrktwxjlltqqxkvktkku.supabase.co`
