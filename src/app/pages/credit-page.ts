import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuickBankApi } from '../core/api.service';
import { Credit } from '../core/models';
import { formatBrl } from '../core/money';
import { problemFrom } from '../core/problem';

@Component({
  selector: 'app-credit-page',
  imports: [RouterLink],
  templateUrl: './credit-page.html',
})
export class CreditPage {
  private readonly api = inject(QuickBankApi);

  protected readonly formatBrl = formatBrl;
  protected readonly loading = signal(true);
  protected readonly missing = signal(false);
  protected readonly saving = signal(false);
  protected readonly credit = signal<Credit | null>(null);
  protected readonly draft = signal('');
  protected readonly notice = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected step(direction: 1 | -1): void {
    const current = this.credit();
    if (!current) {
      return;
    }
    const base = numberOrNull(this.draft()) ?? numberOrNull(current.creditLimit) ?? 0;
    const next = Math.round((base + direction * 100) * 100) / 100;
    this.draft.set(next.toFixed(2));
    this.error.set(null);
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const current = this.credit();
    if (!current || this.saving()) {
      return;
    }
    const requested = numberOrNull(this.draft());
    const max = numberOrNull(current.creditLimitMax) ?? 0;
    const used = numberOrNull(current.creditUsed) ?? 0;
    if (requested === null || requested < 0 || requested > max || requested < used) {
      this.error.set('Informe um valor entre o crédito em uso e o teto da conta. Não use números negativos.');
      this.notice.set(null);
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      const updated = await this.api.changeCredit(requested.toFixed(2));
      this.credit.set(updated);
      this.draft.set(updated.creditLimit);
      this.notice.set('Limite atualizado.');
    } catch (error) {
      const problem = problemFrom(error);
      this.error.set(
        problem.type.endsWith('/credit-limit-rejected') || problem.status === 409
          ? 'Não foi possível alterar o limite de crédito.'
          : 'Não foi possível alterar o limite de crédito.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const credit = await this.api.credit();
      this.credit.set(credit);
      this.draft.set(credit.creditLimit);
    } catch (error) {
      if (problemFrom(error).status === 404) {
        this.missing.set(true);
      } else {
        this.error.set('Não foi possível consultar o crédito.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}

function numberOrNull(raw: string): number | null {
  const text = raw.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return null;
  }
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
