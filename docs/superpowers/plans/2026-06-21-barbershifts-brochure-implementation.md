# Brochure BarberShifts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear una página pública de brochure/landing para BarberShifts con descarga de PDF, usando jsPDF.

**Architecture:** Página React pública (`/brochure`) que muestra el brochure en HTML como preview visual y ofrece botón de descarga en PDF generado con jsPDF + jspdf-autotable.

**Tech Stack:** React 19, jsPDF 4.2.1, jspdf-autotable 5.0.8, Vite

---

### Task 1: Crear BrochurePage con preview HTML

**Files:**
- Create: `src/pages/public/BrochurePage.jsx`

**Diseño de la página (preview HTML):**

La página muestra el brochure en pantalla con estilo idéntico al PDF, más un botón de descarga.

- [ ] **Step 1: Crear el componente BrochurePage con la estructura base**

```jsx
import { useRef } from 'react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { PLANS } from '../../lib/constants'
import { fmtCurrency } from '../../utils/format'

// Paleta
const NAVY = '#1B2A4A'
const GOLD = '#D4A843'
const BG_LIGHT = '#F5F5F0'
const WHITE = '#FFFFFF'

const features = [
  { icon: '📅', label: 'Reservas online' },
  { icon: '📋', label: 'Agenda digital' },
  { icon: '💰', label: 'Caja diaria' },
  { icon: '📦', label: 'Inventario' },
  { icon: '📊', label: 'Reportes' },
  { icon: '👥', label: 'Clientes' },
]

const planKeys = ['BASIC', 'PROFESSIONAL', 'PREMIUM']
const planLabels = ['Básico', 'Profesional', 'Premium']
const planDesc = [
  'Hasta 3 barberos · 1 sucursal',
  'Hasta 10 barberos · 3 sucursales',
  'Ilimitado · Todo incluido',
]

export default function BrochurePage() {
  const contentRef = useRef(null)

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = 210
    const pageH = 297
    const margin = 20
    const contentW = pageW - margin * 2

    // ========== PÁGINA 1: PORTADA ==========
    // Fondo claro
    doc.setFillColor(245, 245, 240)
    doc.rect(0, 0, pageW, pageH, 'F')

    // Barra decorativa superior (azul)
    doc.setFillColor(27, 42, 74)
    doc.rect(0, 0, pageW, 8, 'F')

    // Logo: círculo dorado + tijera
    doc.setFillColor(212, 168, 67)
    doc.circle(105, 55, 14, 'F')
    doc.setFontSize(18)
    doc.setTextColor(255, 255, 255)
    doc.text('✂', 105, 59, { align: 'center' })

    // BarberShifts
    doc.setFontSize(28)
    doc.setTextColor(27, 42, 74)
    doc.text('BarberShifts', 105, 85, { align: 'center' })

    doc.setFontSize(12)
    doc.setTextColor(107, 114, 128)
    doc.text('Gestión para barberías', 105, 95, { align: 'center' })

    // Línea decorativa dorada
    doc.setDrawColor(212, 168, 67)
    doc.setLineWidth(1.5)
    doc.line(70, 102, 140, 102)

    // Título principal
    doc.setFontSize(24)
    doc.setTextColor(27, 42, 74)
    doc.text('Gestioná tu barbería', 105, 130, { align: 'center' })
    doc.setFontSize(20)
    doc.setTextColor(212, 168, 67)
    doc.text('desde un solo lugar', 105, 148, { align: 'center' })

    // Botón "Ver Planes"
    doc.setFillColor(212, 168, 67)
    doc.roundedRect(75, 170, 60, 14, 3, 3, 'F')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('Ver Planes →', 105, 179, { align: 'center' })

    // Imagen decorativa: unas barras simulando fondo de barbería
    doc.setFillColor(27, 42, 74)
    doc.globalAlpha = 0.05
    for (let i = 0; i < 20; i++) {
      doc.rect(20 + i * 9, 210, 4, 50, 'F')
    }
    doc.globalAlpha = 1

    // Info de contacto
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('WhatsApp | Web | @barbershifts', 105, 280, { align: 'center' })

    // ========== PÁGINA 2: INTERIOR ==========
    doc.addPage()
    doc.setFillColor(245, 245, 240)
    doc.rect(0, 0, pageW, pageH, 'F')

    // Barra superior
    doc.setFillColor(27, 42, 74)
    doc.rect(0, 0, pageW, 6, 'F')

    let y = 25

    // Sección: El Problema
    doc.setFontSize(14)
    doc.setTextColor(27, 42, 74)
    doc.text('❌ ¿Perdés clientes por no tener una agenda digital?', margin, y)
    y += 12

    const problemas = [
      '• Llamadas perdidas → clientes que no vuelven',
      '• Papel y lápiz → errores y overbooking',
      '• Sin reportes → no sabés si ganás o perdés',
      '• Tus clientes quieren reservar desde WhatsApp y no pueden',
    ]
    doc.setFontSize(10)
    doc.setTextColor(17, 17, 17)
    problemas.forEach((p) => {
      doc.text(p, margin + 5, y)
      y += 7
    })

    y += 4
    doc.setFontSize(11)
    doc.setTextColor(212, 168, 67)
    doc.text('Todo esto se acaba con BarberShifts.', margin, y)
    y += 16

    // Sección: Funcionalidades (grid 3x2)
    doc.setFontSize(14)
    doc.setTextColor(27, 42, 74)
    doc.text('✅ Todo lo que necesitás en un solo lugar', margin, y)
    y += 10

    const boxW = (contentW - 16) / 3
    const boxH = 22
    const gap = 8

    features.forEach((f, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = margin + col * (boxW + gap)
      const yBox = y + row * (boxH + gap)

      const isGold = i >= 3
      if (isGold) {
        doc.setFillColor(212, 168, 67)
        doc.setTextColor(27, 42, 74)
      } else {
        doc.setFillColor(27, 42, 74)
        doc.setTextColor(255, 255, 255)
      }
      doc.roundedRect(x, yBox, boxW, boxH, 3, 3, 'F')
      doc.setFontSize(9)
      doc.text(f.icon + '  ' + f.label, x + boxW / 2, yBox + boxH / 2 + 1.5, { align: 'center' })
    })

    y += 2 * (boxH + gap) + 14

    // Texto complementario
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('+ Gestión de barberos, horarios, servicios y marketplace', margin, y)
    y += 16

    // Sección: Planes
    doc.setFontSize(14)
    doc.setTextColor(27, 42, 74)
    doc.text('💰 Planes y precios', margin, y)
    y += 8

    // Tabla de planes con autoTable
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      head: [['', 'Básico', 'Profesional', 'Premium']],
      body: [
        ['Precio', '100.000 Gs/mes', '150.000 Gs/mes', '200.000 Gs/mes'],
        ['Barberos', 'Hasta 3', 'Hasta 10', 'Ilimitado'],
        ['Sucursales', '1', 'Hasta 3', 'Ilimitado'],
        ['Reservas/mes', 'Hasta 100', 'Hasta 500', 'Ilimitado'],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [27, 42, 74],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [17, 17, 17],
      },
      alternateRowStyles: {
        fillColor: [245, 245, 240],
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold', fillColor: [245, 245, 240] },
        1: { cellWidth: (contentW - 35) / 3, halign: 'center' },
        2: { cellWidth: (contentW - 35) / 3, halign: 'center', fillColor: [27, 42, 74], textColor: [255, 255, 255] },
        3: { cellWidth: (contentW - 35) / 3, halign: 'center' },
      },
    })

    // CTA final
    const finalY = doc.lastAutoTable.finalY + 16
    doc.setFontSize(13)
    doc.setTextColor(27, 42, 74)
    doc.text('¿Listo para digitalizar tu barbería?', margin, finalY)

    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.text('Contactanos por WhatsApp o visite nuestra web', margin, finalY + 9)
    doc.setTextColor(212, 168, 67)
    doc.text('@barbershifts', margin, finalY + 18)

    // Descargar
    doc.save('BarberShifts-Brochure.pdf')
  }

  return (
    <div style={{ minHeight: '100vh', background: BG_LIGHT }}>
      {/* Botón de descarga flotante */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: NAVY, padding: '12px 24px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: WHITE, fontWeight: 'bold', fontSize: 16 }}>📄 BarberShifts Brochure</span>
        <button
          onClick={generatePDF}
          style={{
            background: GOLD, color: NAVY, border: 'none',
            padding: '10px 24px', borderRadius: 8, fontWeight: 'bold',
            cursor: 'pointer', fontSize: 14
          }}
        >
          ⬇ Descargar PDF
        </button>
      </div>

      {/* Preview del brochure en HTML */}
      <div ref={contentRef} style={{
        maxWidth: 800, margin: '24px auto',
        background: WHITE, borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
      }}>
        {/* PORTADA */}
        <div style={{ background: BG_LIGHT, padding: '60px 40px', textAlign: 'center', position: 'relative' }}>
          <div style={{ height: 6, background: NAVY, margin: '-60px -40px 40px' }} />

          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: GOLD,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 36
          }}>
            ✂
          </div>

          <h1 style={{ fontSize: 36, color: NAVY, margin: 0 }}>BarberShifts</h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 16px' }}>Gestión para barberías</p>

          <div style={{ width: 80, height: 3, background: GOLD, margin: '0 auto 24px' }} />

          <h2 style={{ fontSize: 28, color: NAVY, margin: 0 }}>Gestioná tu barbería</h2>
          <h2 style={{ fontSize: 24, color: GOLD, margin: '4px 0 32px' }}>desde un solo lugar</h2>

          <div style={{
            background: GOLD, color: WHITE, padding: '10px 40px',
            borderRadius: 8, display: 'inline-block',
            fontWeight: 'bold', fontSize: 14
          }}>
            Ver Planes →
          </div>

          <p style={{ fontSize: 11, color: '#6B7280', marginTop: 80 }}>WhatsApp | Web | @barbershifts</p>
        </div>

        {/* INTERIOR */}
        <div style={{ background: BG_LIGHT, padding: '40px', marginTop: 2 }}>
          {/* Problema */}
          <h3 style={{ fontSize: 18, color: NAVY, marginBottom: 4 }}>❌ ¿Perdés clientes por no tener una agenda digital?</h3>
          <ul style={{ color: '#111', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Llamadas perdidas → clientes que no vuelven</li>
            <li>Papel y lápiz → errores y overbooking</li>
            <li>Sin reportes → no sabés si ganás o perdés</li>
            <li>Tus clientes quieren reservar desde WhatsApp y no pueden</li>
          </ul>
          <p style={{ color: GOLD, fontWeight: 'bold', fontSize: 14 }}>Todo esto se acaba con BarberShifts.</p>

          {/* Features */}
          <h3 style={{ fontSize: 18, color: NAVY, marginTop: 24, marginBottom: 12 }}>✅ Todo lo que necesitás en un solo lugar</h3>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8, marginBottom: 8
          }}>
            {features.map((f, i) => (
              <div key={f.label} style={{
                background: i < 3 ? NAVY : GOLD,
                color: i < 3 ? WHITE : NAVY,
                padding: '14px 8px', borderRadius: 8,
                textAlign: 'center', fontWeight: 500, fontSize: 13
              }}>
                {f.icon} {f.label}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#6B7280' }}>+ Gestión de barberos, horarios, servicios y marketplace</p>

          {/* Planes */}
          <h3 style={{ fontSize: 18, color: NAVY, marginTop: 24, marginBottom: 12 }}>💰 Planes y precios</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, background: NAVY, color: WHITE, textAlign: 'left' }}></th>
                <th style={{ ...thStyle, background: NAVY, color: WHITE }}>Básico</th>
                <th style={{ ...thStyle, background: NAVY, color: WHITE }}>Profesional</th>
                <th style={{ ...thStyle, background: NAVY, color: WHITE }}>Premium</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Precio', '100.000 Gs/mes', '150.000 Gs/mes', '200.000 Gs/mes'],
                ['Barberos', 'Hasta 3', 'Hasta 10', 'Ilimitado'],
                ['Sucursales', '1', 'Hasta 3', 'Ilimitado'],
                ['Reservas/mes', 'Hasta 100', 'Hasta 500', 'Ilimitado'],
              ].map((row, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, background: BG_LIGHT, fontWeight: 'bold' }}>{row[0]}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row[1]}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', background: NAVY, color: WHITE }}>{row[2]}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 32, padding: '24px', background: BG_LIGHT, borderRadius: 8 }}>
            <h3 style={{ fontSize: 18, color: NAVY, margin: 0 }}>¿Listo para digitalizar tu barbería?</h3>
            <p style={{ color: '#6B7280', fontSize: 13 }}>Contactanos por WhatsApp o visite nuestra web</p>
            <p style={{ color: GOLD, fontWeight: 'bold', fontSize: 16 }}>@barbershifts</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle = { padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 13 }
const tdStyle = { padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 13 }
```

- [ ] **Step 2: Verificar que importa correctamente**

Run: `npm run build`
Expected: Build exitoso sin errores de importación

---

### Task 2: Agregar ruta en App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Agregar import y ruta**

Agregar el import al inicio del archivo (junto a los otros imports de páginas públicas):

```jsx
import BrochurePage from './pages/public/BrochurePage'
```

Agregar la ruta dentro del `<Route element={<PublicLayout />}>`:

```jsx
<Route path="/brochure" element={<BrochurePage />} />
```

La ruta queda justo después de la línea del Marketplace:

```jsx
<Route path="/" element={<Marketplace />} />
<Route path="/brochure" element={<BrochurePage />} />
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: Build exitoso

---

### Task 3: Verificación final

- [ ] **Step 1: Verificar que la ruta funciona**

Run: `npm run dev`
Visitar: `http://localhost:5173/brochure`
Expected: Página del brochure se renderiza con preview HTML y botón de descarga PDF.

- [ ] **Step 2: Commit**

```bash
git add src/pages/public/BrochurePage.jsx src/App.jsx
git commit -m "feat: pagina brochure con descarga PDF para clientes"
```
