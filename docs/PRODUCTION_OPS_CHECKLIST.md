# Checklist operativo — Producción abierta (BarberShifts)

Estado técnico (2026-11-07): migración `20260710` **aplicada y verificada**, P0 corregido,
DB endurecida (RLS/RPCs/grants/constraint), deps prod sin advisories, build/lint/tests OK.
Falta completar lo operativo/infra siguiente.

## Inmediato
- [x] Aplicar `20260710` + registrar historial + verificaciones post-aplicación.
- [ ] **Desplegar frontend** del branch `audit-final` al hosting (build `npm run build` OK).
  - Vite SPA: publicar `dist/`. Configs incluidas: `vercel.json`, `netlify.toml`.
  - Variables en hosting: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
  - Desplegar **después** de la migración (ya aplicada) — seguro.
- [ ] **Redesplegar Edge Function** `admin-super` si aplica el hardening de CORS configurable:
  ```bash
  supabase functions deploy admin-super --project-ref mrktwxjlltqqxkvktkku
  supabase secrets set ALLOWED_ORIGINS=https://TU-DOMINIO.com --project-ref mrktwxjlltqqxkvktkku
  ```
  (Sin `ALLOWED_ORIGINS` mantiene `*` por compatibilidad; con él, restringe al origen.)

## Verificación funcional (post-deploy)
- [ ] E2E navegador (usuarios reales): reserva pública crea turno, TV muestra cola, login admin/barbero, completar turno, ajuste de stock.
  - Suite lista: `npm run test:e2e` (requiere `E2E_BASE_URL`, `E2E_BUSINESS_SLUG`, y para admin `E2E_ADMIN_EMAIL/PASSWORD`). Instalar navegador: `npx playwright install chromium`.
- [ ] Concurrencia HTTP al mismo slot (esperado: 1 OK, resto rechazado): `npm run test:load -- --url https://<ref>.supabase.co --key <ANON_KEY> --business <uuid> --branch <uuid> --service <uuid> --barber <uuid> --date YYYY-MM-DD --time HH:MM --n 10`. *Puede persistir 1 reserva de prueba; usar slot controlado y limpiar.*
- [ ] Smoke DB ya verificado (2026-11-07, rolled back): booking atómico OK, anon sin acceso a `clients`, grants/RLS correctos.

## Operación sostenida
- [ ] Monitoreo/uptime + alertas (errores 5xx, fallos Edge Function, latencia DB). Revisar logs Supabase.
- [ ] Backup real del proveedor + **simulacro de restore** verificado. Referencia de metadatos: `docs/pre_20260710_backup_snapshot.json` (no sustituye backup completo).
- [ ] Restringir CORS `admin-super` al dominio real (`ALLOWED_ORIGINS`).
- [ ] Revisar: alcance `barber_read_notifications`; `barber_services.price_override/duration_override` sin uso; tablas `audit_log`/`audit_logs` duplicadas; 12 advisories dev-only (`npm audit`).
- [ ] Rotar cualquier token expuesto en chats/logs y guardar secretos solo en env/secret manager.