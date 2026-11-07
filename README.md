# BarberShifts — Frontend

Plataforma de gestión y reservas para barberías y peluquerías. Marketplace público con administración multirol: super admin, dueño de negocio y barbero.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + Vite 8 |
| Estilos | CSS vanilla, utilitario modular |
| Backend | Supabase (auth, base de datos, RLS) |
| Charts | Chart.js + react-chartjs-2 |
| PDF | jsPDF + jspdf-autotable |
| Ruteo | React Router DOM v7 |
| Calidad | ESLint 10 |

## Roles del sistema

- **super_admin** — gestión global de barberías, planes, configuración del sistema
- **business_admin** — dueño de barbería: servicios, horarios, barberos, caja, inventario, reportes
- **barber** — dashboard de turnos asignados y gestión de trabajo diario

## Módulos

### Público
- `/` — Marketplace con listado de barberías
- `/barberia/:slug` — Página pública de cada barbería
- `/barberia/:slug/reservar` — Booking público para reservar turnos

### Admin (`/admin/*`)
- Login con Supabase Auth
- Dashboard de negocio: métricas, reservas, ingresos
- Gestión de servicios, barberos, horarios
- Sistema de caja (ingresos/egresos/retiros)
- Inventario con control de stock
- Reportes y exportación de datos
- Apariencia del perfil público
- Planes de suscripción (GS: básico, profesional, premium)

### Super Admin (`/admin/dashboard/*`)
- Panel global con métricas de todas las barberías
- Gestión de planes y suscripciones
- Administración de barberos del sistema
- Configuración global

### Barbero (`/admin/mi-trabajo`)
- Dashboard con turnos del día
- Gestión de estado de citas

## Empezar

```bash
# 1. Clonar e instalar
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de Supabase

# 3. Iniciar en desarrollo
npm run dev

# 4. Build para producción
npm run build
npm run preview
```

## Variables de entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
```

Para aplicar migraciones SQL en Supabase:

```bash
# Instalar Supabase CLI (si no está)
npm install -g supabase

# Vincular proyecto
supabase link --project-ref TU_PROJECT_REF

# Ver el estado y el procedimiento ANTES de aplicar nada:
#   supabase/migrations/README.md
# Nota: `supabase db push` está bloqueado por el historial de 20260703
# hasta ejecutar `supabase migration repair --status applied 20260703`.
```

Las migraciones también pueden aplicarse manualmente desde el SQL Editor del
dashboard. El procedimiento verificado, el rollback y las queries de verificación
están en [`supabase/migrations/README.md`](supabase/migrations/README.md).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Build producción |
| `npm run preview` | Vista previa del build |
| `npm run lint` | ESLint |
| `npm run test` | Tests unitarios (Vitest) |
| `npm run test:watch` | Tests en modo watch |

## Estructura

```
src/
├── api/                 # Capa de servicios API
├── assets/              # Imágenes y recursos estáticos
├── components/          # Componentes compartidos
│   ├── charts/          # Gráficos (Chart.js)
│   ├── ui/              # UI primitives (Button, Card, Input, Modal)
│   └── ProtectedRoute   # Guard de rutas por rol
├── contexts/            # Contextos de React
│   └── AuthContext      # Auth + sesión + roles
├── hooks/               # Custom hooks
├── layouts/             # Layouts por rol (Public, Admin, SuperAdmin, Barber)
├── lib/                 # Configuraciones (Supabase client, constantes)
├── pages/               # Páginas por módulo
│   ├── admin/           # Paneles admin y super admin (17 páginas)
│   ├── barber/          # Dashboard del barbero
│   ├── barberia/        # Página pública de barbería + booking
│   └── public/          # Marketplace
├── styles/              # CSS utilitario modular
├── templates/           # Templates reutilizables
├── utils/               # Utilidades (formatos, helpers)
├── App.jsx              # Router principal
├── index.css            # Estilos globales
└── main.jsx             # Entry point
```

## Licencia

Uso interno — proyecto privado.
