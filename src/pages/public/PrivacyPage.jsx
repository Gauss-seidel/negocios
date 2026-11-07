import LegalLayout from './LegalLayout'

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad" updated="2026-11-07">
      <p><strong>Plantilla informativa — no constituye asesoría legal.</strong> Debe ser revisada y adaptada por un profesional legal conforme a la normativa aplicable (p. ej. Ley N.º 6534/2020 de Protección de Datos Personales de Paraguay y normas complementarias) y a tus prácticas reales antes de vender el servicio.</p>

      <h2>1. Responsable y contacto</h2>
      <p>Responsable del tratamiento en la operación de la plataforma: <strong>[completar razón social/titular]</strong>. Contacto de privacidad/soporte: <strong>[completar email]</strong>.</p>

      <h2>2. Datos que tratamos</h2>
      <ul>
        <li><strong>Clientes finales (reservas):</strong> nombre, teléfono y, opcionalmente, correo; datos de la reserva (servicio, fecha/hora, sucursal, profesional, estado, productos).</li>
        <li><strong>Negocios y personal:</strong> datos de cuenta (correo/autenticación), nombre del negocio, sucursales, servicios, agenda, caja e inventario; datos operativos del personal (nombre, contacto interno) según configuración del negocio.</li>
        <li><strong>Datos técnicos:</strong> registros técnicos mínimos necesarios para seguridad, operación y diagnóstico (p. ej. errores). No vendemos datos personales.</li>
      </ul>

      <h2>3. Finalidades y base</h2>
      <p>Gestionar reservas y la operación del negocio; prestar soporte; mantener la seguridad y prevenir fraude/abuso; cumplir obligaciones legales cuando correspondan. La base se sustenta en la ejecución del servicio solicitado, el interés legítimo operativo y/o el consentimiento cuando aplique.</p>

      <h2>4. Encargados e infraestructura</h2>
      <p>La plataforma utiliza infraestructura de terceros para alojamiento/base de datos/autenticación/funciones (p. ej. Supabase) y hosting del frontend (p. ej. Render). Estos proveedores tratan datos en nuestro nombre conforme a sus condiciones y medidas de seguridad. <strong>[completar listado vigente de encargados/transferencias, si aplica]</strong>.</p>

      <h2>5. Conservación</h2>
      <p>Conservamos los datos mientras sean necesarios para la prestación del servicio, la operación del negocio y el cumplimiento de obligaciones legales. Los registros históricos operativos/facturación se preservan según las reglas del servicio. <strong>[definir plazos concretos]</strong>.</p>

      <h2>6. Seguridad</h2>
      <p>Aplicamos controles de acceso, aislamiento por negocio (RLS/validación en servidor), y transporte cifrado (HTTPS). Ningún sistema es infalible; ante incidentes actuaremos conforme a la normativa aplicable.</p>

      <h2>7. Derechos</h2>
      <p>Según la normativa aplicable, podés solicitar acceso, rectificación, actualización o supresión, y oponerte/revocar el consentimiento cuando corresponda, escribiendo a <strong>[email de privacidad]</strong>. También podés acudir a la autoridad competente en Paraguay.</p>

      <h2>8. Cambios</h2>
      <p>Podemos actualizar esta política; publicaremos la versión vigente con su fecha de actualización.</p>
    </LegalLayout>
  )
}