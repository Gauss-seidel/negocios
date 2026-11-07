import { describe, it, expect } from 'vitest'
import { fmtCurrency } from './format'

describe('fmtCurrency', () => {
  it('formatea en guaranies sin decimales', () => {
    expect(fmtCurrency(100000)).toContain('100')
  })
  it('maneja null', () => {
    expect(fmtCurrency(null)).toContain('0')
  })
  it('maneja NaN', () => {
    expect(fmtCurrency(NaN)).toContain('0')
  })
})