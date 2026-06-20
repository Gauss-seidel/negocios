// Roles de usuario
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  BUSINESS_ADMIN: 'business_admin',
  BARBER: 'barber',
}

// Estados de barbería
export const BUSINESS_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
}

// Estados de reserva
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
}

// Métodos de pago
export const PAYMENT_METHODS = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  CARD: 'card',
  QR: 'qr',
}

// Tipos de feriados
export const HOLIDAY_TYPES = {
  HOLIDAY: 'holiday',
  VACATION: 'vacation',
  BLOCKED: 'blocked',
}

// Tipos de movimiento de caja
export const CASH_MOVEMENT_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  WITHDRAWAL: 'withdrawal',
}

// Tipos de movimiento de inventario
export const INVENTORY_MOVEMENT_TYPES = {
  IN: 'in',
  OUT: 'out',
}

// Estados de notificación
export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
}

// Días de la semana
export const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

// Planes de suscripción
export const PLANS = {
  BASIC: { maxBarbers: 3, maxBranches: 1, maxMonthlyBookings: 100, price: 9.99 },
  PROFESSIONAL: { maxBarbers: 10, maxBranches: 3, maxMonthlyBookings: 500, price: 19.99 },
  PREMIUM: { maxBarbers: Infinity, maxBranches: Infinity, maxMonthlyBookings: Infinity, price: 39.99 },
}
