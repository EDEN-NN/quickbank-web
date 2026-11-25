const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const when = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatBrl(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return amount;
  }
  return brl.format(value);
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return when.format(date);
}

export function movementLabel(type: string): string {
  switch (type) {
    case 'DEPOSIT':
      return 'Deposit';
    case 'TRANSFER_OUT':
      return 'Transfer sent';
    case 'TRANSFER_IN':
      return 'Transfer received';
    default:
      return type;
  }
}

export function signedAmount(type: string, amount: string): string {
  const shown = formatBrl(amount);
  return type === 'TRANSFER_OUT' ? `− ${shown}` : `+ ${shown}`;
}

export function normalizeAmount(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (/^\d+,\d{1,2}$/.test(trimmed)) {
    return trimmed.replace(',', '.');
  }
  return trimmed;
}

export function inputValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.value : '';
}
