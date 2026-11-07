import { describe, it, expect } from 'vitest'
import { PLANS, ROLES } from './constants'

describe('PLANS', () => {
  it('tiene los 3 planes con precios correctos', () => {
    expect(PLANS.BASIC.price).toBe(100000)
    expect(PLANS.PROFESSIONAL.price).toBe(150000)
    expect(PLANS.PREMIUM.price).toBe(200000)
  })
  it('reservas ilimitadas en los 3 planes', () => {
    expect(PLANS.BASIC.maxMonthlyBookings).toBe(Infinity)
    expect(PLANS.PROFESSIONAL.maxMonthlyBookings).toBe(Infinity)
    expect(PLANS.PREMIUM.maxMonthlyBookings).toBe(Infinity)
  })
  it('limites de barberos/sucursales', () => {
    expect(PLANS.BASIC.maxBarbers).toBe(3)
    expect(PLANS.BASIC.maxBranches).toBe(1)
    expect(PLANS.PROFESSIONAL.maxBarbers).toBe(10)
    expect(PLANS.PROFESSIONAL.maxBranches).toBe(3)
    expect(PLANS.PREMIUM.maxBarbers).toBe(Infinity)
    expect(PLANS.PREMIUM.maxBranches).toBe(Infinity)
  })
})

describe('ROLES', () => {
  it('tiene los roles esperados', () => {
    expect(ROLES.SUPER_ADMIN).toBe('super_admin')
    expect(ROLES.BUSINESS_ADMIN).toBe('business_admin')
    expect(ROLES.BARBER).toBe('barber')
  })
})