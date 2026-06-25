# Brochure BarberShifts — PDF para presentación a clientes

**Fecha:** 2026-06-21
**Estado:** Aprobado

## Objetivo

Brochure en PDF para presentar BarberShifts (SaaS de gestión de barberías) a dueños de barberías en Paraguay. Debe verse profesional en mobile (WhatsApp) e impreso.

## Formato

- PDF generado con jsPDF (ya disponible en `package.json`)
- Una hoja, doble cara (2 caras) o una sola cara con toda la info
- Listo para enviar por WhatsApp y para imprimir

## Paleta de colores

| Color | Hex | Uso |
|-------|-----|-----|
| Azul profundo | `#1B2A4A` | Títulos, fondos de sección destacada |
| Dorado | `#D4A843` | Acentos, precios, detalles |
| Fondo claro | `#F5F5F0` | Fondo general |
| Blanco | `#FFFFFF` | Fondos de tarjetas |
| Texto oscuro | `#111111` | Cuerpo de texto |
| Texto gris | `#666666` | Subtítulos, descripciones |

## Logo

Icono de tijera (`✂`) dentro de un cuadrado con fondo dorado, seguido del texto "BarberShifts" en azul, y debajo "Gestión para barberías" en gris claro.

## Estructura del PDF

### Cara 1 — Portada

```
┌──────────────────────────────────────────┐
│  [Logo ✂ BarberShifts]                   │
│  Gestión para barberías                  │
│                                          │
│  "Gestioná tu barbería                   │
│   desde un solo lugar"                   │
│                                          │
│  [Imagen de fondo: barbería suave]        │
│                                          │
│  [Botón dorado] → Ver Planes             │
│                                          │
│  WhatsApp | Web | @barbershifts          │
└──────────────────────────────────────────┘
```

### Cara 2 — Interior

Sección 1: **El problema que resuelve**
- "¿Perdés clientes por no tener una agenda digital?"
- Puntos de dolor: llamadas perdidas, papel y lápiz, sin reportes, clientes quieren reservar desde WhatsApp
- Cierre: "Todo esto se acaba con BarberShifts."

Sección 2: **Funcionalidades** (grid 3×2)
| Reservas | Agenda | Caja |
| Inventario | Reportes | Clientes |

Debajo del grid, texto pequeño: "+ Gestión de barberos, horarios, servicios, marketplace"

Sección 3: **Planes y precios** (3 columnas)

| Básico | Profesional | Premium |
|--------|-------------|---------|
| 3 barberos | 10 barberos | Ilimitado |
| 1 sucursal | 3 sucursales | Todo incluido |
| **100.000 Gs/mes** | **150.000 Gs/mes** | **200.000 Gs/mes** |

Plan del medio (Profesional) destacado con fondo azul.

Sección 4: **Llamado a la acción**
- "¿Listo para digitalizar tu barbería?"
- Contacto: WhatsApp | Web | Instagram

## Tecnología

- **jsPDF** + **jspdf-autotable** para generar el PDF desde el frontend React
- Fuentes: sistema (sans-serif) para compatibilidad en mobile
- El PDF se genera desde una página pública del proyecto (ej. `/brochure`)
- Botón de descarga directa

## Notas

- Solo incluir features que existen en el código actual del proyecto
- NO incluir: QR, pagos online, ni nada que no esté implementado
- Los precios están en guaraníes (Gs.)
