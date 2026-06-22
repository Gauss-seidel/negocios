# Guía de Responsividad — Frontend Admin

> Priorizar CSS puro antes que JavaScript. JS solo cuando el layout cambie drásticamente.

## Principios

1. **CSS puro primero** — `overflow-x: auto`, `flex-wrap`, `grid`, `clamp()`, `min()`, `max()` resuelven el 80% de los casos sin JS.
2. **JS solo cuando cambia la estructura** — si mobile necesita un layout completamente diferente (cards en vez de tabla), usa `useResponsiveTable`.
3. **Un solo breakpoint** — todas las pantallas admin usan `767px` (definido en `useResponsiveTable`). No crear breakpoints ad-hoc.

## Cuándo usar cada enfoque

| Problema | Solución |
|----------|----------|
| Tabla muy ancha, necesita scroll | `overflow-x-auto` en el contenedor |
| Inputs/botones se desbordan | `flex-wrap`, `w-full` en mobile |
| Columnas se apilan naturalmente | CSS Grid con `grid-template-columns: repeat(auto-fit, minmax(...))` |
| Tabla → Cards (cambio estructural) | `useResponsiveTable` + render condicional |

## Cómo usar `useResponsiveTable`

```jsx
import { useResponsiveTable } from '../../hooks/useResponsiveTable'

function MiComponente() {
  const { isMobile } = useResponsiveTable()

  return (
    <>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </>
  )
}
```

## Patrón para tablas → cards

```jsx
{isEmpty ? (
  <EmptyState />
) : isMobile ? (
  <div className="space-y-3 p-4">
    {items.map(item => (
      <div key={item.id} className="rounded-2xl border border-white/[0.06] bg-card-dark p-4">
        {/* Avatar + nombre + metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>...</div>
          <div>...</div>
        </div>
        {/* Badges */}
        <div className="flex items-center gap-2 text-xs mb-3">
          <span className="badge">...</span>
        </div>
        {/* Acciones */}
        <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] pt-3">
          <button>...</button>
        </div>
      </div>
    ))}
  </div>
) : (
  <div className="overflow-x-auto">
    <table>...</table>
  </div>
)}
```

## NO hacer

- ❌ Crear `useMediaQuery` inline en cada componente
- ❌ Usar breakpoints distintos en distintas páginas admin
- ❌ Añadir librerías de responsividad （ya tienes `useResponsiveTable`）
- ❌ Cambiar la tabla desktop al agregar la vista mobile
