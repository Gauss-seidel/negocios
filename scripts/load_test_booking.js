#!/usr/bin/env node
/* global process, console */
/**
 * Prueba de concurrencia controlada contra el RPC de reservas.
 * NO crea reservas persistentes si se usa contra un entorno con la migración 20260710
 * (la constraint EXCLUDE rechazará solapamientos) — pero UNA reserva SÍ puede persistir
 * si el slot está libre. Usar un slot de prueba/hora futura y limpiar después.
 *
 * Uso:
 *   node scripts/load_test_booking.js --url https://<ref>.supabase.co --key <ANON_KEY> \
 *     --business <uuid> --branch <uuid> --service <uuid> --barber <uuid> --date 2026-12-01 --time 09:00 --n 10
 *
 * Esperado con 20260710: exactamente 1 éxito, N-1 rechazos por solapamiento/lock.
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), [])
)
const required = ['url', 'key', 'business', 'service', 'date', 'time']
for (const k of required) if (!args[k]) { console.error('Falta --' + k); process.exit(2) }
const N = Number(args.n || 8)

async function book(i) {
  const res = await fetch(`${args.url}/rest/v1/rpc/create_appointment_atomic`, {
    method: 'POST',
    headers: { apikey: args.key, Authorization: `Bearer ${args.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_business_id: args.business,
      p_branch_id: args.branch || null,
      p_service_id: args.service,
      p_client_name: `LoadTest ${i}`,
      p_client_phone: `+59598100${String(1000 + i)}`,
      p_client_email: '',
      p_date: args.date,
      p_start_time: args.time,
      p_barber_id: args.barber || null,
      p_product_ids: [],
      p_product_quantities: [],
    }),
  })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = { raw: text } }
  return { i, status: res.status, json }
}

;(async () => {
  console.log(`Lanzando ${N} reservas concurrentes al mismo slot...`)
  const results = await Promise.all(Array.from({ length: N }, (_, i) => book(i + 1)))
  const ok = results.filter((r) => r.json && r.json.success)
  const no = results.filter((r) => !(r.json && r.json.success))
  console.log(`OK: ${ok.length}  RECHAZADAS: ${no.length}  (esperado: 1 OK con 20260710)`)
  for (const r of results) console.log(r.i, r.status, r.json?.success, r.json?.error || r.json?.total || r.json?.code)
  if (ok.length > 1) { console.error('FALLO: más de una reserva aceptada (riesgo de solapamiento)'); process.exit(1) }
})()