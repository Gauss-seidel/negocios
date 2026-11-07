import { describe, it, expect } from 'vitest'
import { UNLIMITED_THRESHOLD, isUnlimited, formatLimitShort, formatLimitCount } from './limits'

describe('isUnlimited', () => {
  it('trata 999999 y valores superiores como ilimitado', () => {
    expect(isUnlimited(UNLIMITED_THRESHOLD)).toBe(true)
    expect(isUnlimited(1000000)).toBe(true)
  })

  it('trata null/undefined como ilimitado (sin plan cargado)', () => {
    expect(isUnlimited(null)).toBe(true)
    expect(isUnlimited(undefined)).toBe(true)
  })

  it('no considera ilimitados los límites reales', () => {
    expect(isUnlimited(0)).toBe(false)
    expect(isUnlimited(1)).toBe(false)
    expect(isUnlimited(3)).toBe(false)
    expect(isUnlimited(10)).toBe(false)
  })

  it('valores inválidos o negativos se tratan como finitos (no exponer ∞ por error)', () => {
    expect(isUnlimited(-1)).toBe(false)
    expect(isUnlimited(NaN)).toBe(false)
  })
})

describe('formatLimitShort', () => {
  it('nunca expone 999999 como número', () => {
    expect(formatLimitShort(999999)).toBe('∞')
  })

  it('muestra los límites finitos tal cual', () => {
    expect(formatLimitShort(3)).toBe('3')
    expect(formatLimitShort(10)).toBe('10')
    expect(formatLimitShort(1)).toBe('1')
  })

  it('formatea 0 y negativos como valores finitos', () => {
    expect(formatLimitShort(0)).toBe('0')
    expect(formatLimitShort(-1)).toBe('-1')
  })
})

describe('formatLimitCount', () => {
  it('devuelve ∞ para planes ilimitados', () => {
    expect(formatLimitCount(999999)).toBe('∞')
  })

  it('separa miles para límites finitos grandes', () => {
    expect(formatLimitCount(1000)).toMatch(/1[.,\s]?000/)
  })
})
