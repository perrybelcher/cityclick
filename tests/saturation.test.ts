import { describe, it, expect } from 'vitest';
import { computeNaicsSaturation } from '../src/lib/saturation';

describe('computeNaicsSaturation', () => {
  it('correctly classifies an underserved market', () => {
    // 50,000 population, only 2 coffee shops (0.4 per 10k vs US avg 2.15)
    const result = computeNaicsSaturation(2, 50000, 2.15);
    expect(result.per10kResidents).toBe(0.4);
    expect(result.saturationIndex).toBeLessThan(80);
    expect(result.status).toBe('underserved');
  });

  it('correctly classifies a balanced market', () => {
    // 100,000 population, 22 coffee shops (2.2 per 10k vs US avg 2.15)
    const result = computeNaicsSaturation(22, 100000, 2.15);
    expect(result.per10kResidents).toBe(2.2);
    expect(result.saturationIndex).toBeGreaterThanOrEqual(80);
    expect(result.saturationIndex).toBeLessThanOrEqual(120);
    expect(result.status).toBe('balanced');
  });

  it('correctly classifies a saturated market', () => {
    // 100,000 population, 45 coffee shops (4.5 per 10k vs US avg 2.15)
    const result = computeNaicsSaturation(45, 100000, 2.15);
    expect(result.per10kResidents).toBe(4.5);
    expect(result.saturationIndex).toBeGreaterThan(120);
    expect(result.status).toBe('saturated');
  });

  it('applies Empirical Bayes shrinkage for small population micro-towns', () => {
    // Micro-town with 2,000 people and 0 coffee shops: raw density is 0.
    // Smoothing pulls it toward US average (2.15) rather than saying 0% indefinitely.
    const microZero = computeNaicsSaturation(0, 2000, 2.15);
    expect(microZero.per10kResidents).toBe(0);
    // (2000*0 + 10000*2.15) / (2000 + 10000) = 21500 / 12000 = 1.791
    // 1.791 / 2.15 * 100 = 83.3 -> 83
    expect(microZero.saturationIndex).toBe(83);
    expect(microZero.status).toBe('balanced');
  });

  it('throws on invalid inputs', () => {
    expect(() => computeNaicsSaturation(5, 0, 2.15)).toThrow('Population must be greater than zero');
    expect(() => computeNaicsSaturation(-1, 50000, 2.15)).toThrow('Establishments cannot be negative');
    expect(() => computeNaicsSaturation(5, 50000, 0)).toThrow('US average per 10k must be positive');
  });
});
