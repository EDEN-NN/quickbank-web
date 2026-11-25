import { formatBrl, formatWhen, movementLabel, normalizeAmount, signedAmount } from './money';

describe('money', () => {
  it('formats BRL the way the bank displays cash', () => {
    expect(formatBrl('2000.00')).toBe('R$\u00a02.000,00');
    expect(formatBrl('0.00')).toBe('R$\u00a00,00');
  });

  it('labels movements and signs outgoing transfers', () => {
    expect(movementLabel('DEPOSIT')).toBe('Deposit');
    expect(movementLabel('TRANSFER_IN')).toBe('Transfer received');
    expect(signedAmount('TRANSFER_OUT', '25.00')).toContain('−');
    expect(signedAmount('DEPOSIT', '100.00')).toContain('+');
  });

  it('accepts a comma decimal and shows Sao Paulo time', () => {
    expect(normalizeAmount('25,50')).toBe('25.50');
    expect(normalizeAmount(' 100.00 ')).toBe('100.00');
    expect(formatWhen('2026-11-24T15:00:00Z')).toContain('2026');
    expect(formatWhen('2026-11-24T15:00:00Z')).toContain('12:00');
  });
});
