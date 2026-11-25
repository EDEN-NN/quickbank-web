import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { loadAccount } from '../core/account-loader';
import { QuickBankApi } from '../core/api.service';
import { Account, StatementLine } from '../core/models';
import { ApiProblem } from '../core/problem';
import { StatementTable } from '../shared/statement-table';

@Component({
  selector: 'app-statement-page',
  imports: [RouterLink, StatementTable],
  templateUrl: './statement-page.html',
})
export class StatementPage {
  private readonly api = inject(QuickBankApi);

  protected readonly loading = signal(true);
  protected readonly account = signal<Account | null>(null);
  protected readonly lines = signal<StatementLine[]>([]);
  protected readonly loadError = signal<ApiProblem | null>(null);

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const snapshot = await loadAccount(this.api);
      this.account.set(snapshot.account);
      this.lines.set(snapshot.lines);
      this.loadError.set(snapshot.error);
    } finally {
      this.loading.set(false);
    }
  }
}
