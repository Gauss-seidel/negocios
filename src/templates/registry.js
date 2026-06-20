// Registro de plantillas visuales para barberías
// Cada plantilla define su propia experiencia de animación y movimiento

// Definición de tipos de animación
const ANIMATION_STYLES = {
  // Classic: fade in suave, movimiento vertical
  classic: {
    name: 'classic',
    cardEntry: { type: 'fadeInUp', duration: 0.6, delay: 0.1 },
    heroEntry: { type: 'fadeIn', duration: 0.8, delay: 0 },
    buttonHover: { type: 'scale', scale: 1.05 },
    transition: 'all 0.5s ease-out',
  },
  // Modern: slide from right, rápido y limpio
  modern: {
    name: 'modern',
    cardEntry: { type: 'slideInRight', duration: 0.4, delay: 0.05 },
    heroEntry: { type: 'slideInRight', duration: 0.6, delay: 0 },
    buttonHover: { type: 'translate', x: 2 },
    transition: 'all 0.3s ease-out',
  },
  // Dark: scale + fade, más dinámico
  dark: {
    name: 'dark',
    cardEntry: { type: 'scaleIn', duration: 0.5, delay: 0.08 },
    heroEntry: { type: 'scaleInRotate', duration: 0.7, delay: 0.1 },
    buttonHover: { type: 'scale', scale: 1.08 },
    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  // Premium: animaciones lentas y elegantes
  premium: {
    name: 'premium',
    cardEntry: { type: 'fadeInUp', duration: 0.8, delay: 0.15 },
    heroEntry: { type: 'fadeIn', duration: 1, delay: 0.2 },
    buttonHover: { type: 'scale', scale: 1.03 },
    transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
  // Vibrant: animaciones rápidas y energéticas
  vibrant: {
    name: 'vibrant',
    cardEntry: { type: 'slideInUp', duration: 0.3, delay: 0.05 },
    heroEntry: { type: 'slideInDown', duration: 0.5, delay: 0 },
    buttonHover: { type: 'bounce', scale: 1.1 },
    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
}

export const TEMPLATES = {
  classic: {
    id: 'classic',
    name: 'Clásica',
    description: 'Estilo tradicional con tonos cálidos',
    thumbnail: '/templates/classic.jpg',
    config: {
      fonts: { heading: 'serif', body: 'sans-serif' },
      layout: 'centered',
      borderRadius: 'md',
      shadows: 'soft',
      animation: ANIMATION_STYLES.classic,
    },
  },
  modern: {
    id: 'modern',
    name: 'Moderna',
    description: 'Minimalista y elegante',
    thumbnail: '/templates/modern.jpg',
    config: {
      fonts: { heading: 'sans-serif', body: 'sans-serif' },
      layout: 'fullwidth',
      borderRadius: 'sm',
      shadows: 'medium',
      animation: ANIMATION_STYLES.modern,
    },
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Estilo oscuro y sofisticado',
    thumbnail: '/templates/dark.jpg',
    config: {
      fonts: { heading: 'sans-serif', body: 'sans-serif' },
      layout: 'fullwidth',
      borderRadius: 'lg',
      shadows: 'hard',
      animation: ANIMATION_STYLES.dark,
      colors: {
       text: '#f8fafc',
      },
      
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Diseño de lujo con tipografía elegante',
    thumbnail: '/templates/premium.jpg',
    config: {
      fonts: { heading: 'Playfair Display, serif', body: 'Inter, sans-serif' },
      layout: 'centered',
      borderRadius: 'lg',
      shadows: 'soft',
      animation: ANIMATION_STYLES.premium,
    },
  },
  vibrant: {
    id: 'vibrant',
    name: 'Vibrante',
    description: 'Colores vivos y moderno',
    thumbnail: '/templates/vibrant.jpg',
    config: {
      fonts: { heading: 'sans-serif', body: 'sans-serif' },
      layout: 'fullwidth',
      borderRadius: 'md',
      shadows: 'medium',
      animation: ANIMATION_STYLES.vibrant,
    },
  },
}

export function getTemplate(templateId) {
  return TEMPLATES[templateId] || TEMPLATES.classic
}

export function getTemplateConfig(templateId, colors = {}) {
  const template = getTemplate(templateId)
  return {
    ...template.config,
    colors: {
      primary: '#1a1a2e',
      secondary: '#16213e',
      accent: '#e94560',
      background: '#ffffff',
      text: '#1a1a2e',
      textSecondary: '#64748b',
      ...colors,
    },
  }
}

export function getAnimationStyle(templateId) {
  const template = getTemplate(templateId)
  return template.config.animation || ANIMATION_STYLES.classic
}
