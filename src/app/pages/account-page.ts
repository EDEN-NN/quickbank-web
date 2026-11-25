import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { loadAccount } from '../core/account-loader';
import { QuickBankApi } from '../core/api.service';
import { Account, DepositReceipt, StatementLine } from '../core/models';
import { formatBrl, inputValue, normalizeAmount } from '../core/money';
import { ApiProblem, CarriedProblem, problemFrom } from '../core/problem';
import { StatementTable } from '../shared/statement-table';

@Component({
  selector: 'app-account-page',
  imports: [RouterLink, StatementTable],
  templateUrl: './account-page.html',
})
export class AccountPage {
  private readonly api = inject(QuickBankApi);
  private destroyed = false;

  protected readonly formatBrl = formatBrl;
  protected readonly inputValue = inputValue;

  protected readonly loading = signal(true);
  protected readonly opening = signal(false);
  protected readonly depositing = signal(false);
  protected readonly transferring = signal(false);
  protected readonly account = signal<Account | null>(null);
  protected readonly lines = signal<StatementLine[]>([]);
  protected readonly loadError = signal<ApiProblem | null>(null);
  protected readonly actionError = signal<ApiProblem | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly depositWatch = signal<DepositReceipt | null>(null);
  protected readonly depositAmount = signal('');
  protected readonly transferTo = signal('');
  protected readonly transferAmount = signal('');
  protected readonly recent = computed(() => this.lines().slice(-5));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const snapshot = await loadAccount(this.api);
      if (this.destroyed) {
        return;
      }
      this.account.set(snapshot.account);
      this.lines.set(snapshot.lines);
      this.loadError.set(snapshot.error);
    } finally {
      if (!this.destroyed) {
        this.loading.set(false);
      }
    }
  }

  protected async openAccount(): Promise<void> {
    this.opening.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    try {
      const opened = await this.api.open();
      if (this.destroyed) {
        return;
      }
      this.account.set(opened);
      this.lines.set([]);
      this.notice.set(
        `Account ${opened.accountNumber} is open. Cash starts at ${formatBrl(opened.cashAvailable)} and the credit line is ${formatBrl(opened.creditLimit)}. A mock email was queued.`,
      );
    } catch (error) {
      if (!this.destroyed) {
        this.actionError.set(problemFrom(error));
      }
    } finally {
      if (!this.destroyed) {
        this.opening.set(false);
      }
    }
  }

  protected async deposit(event: Event): Promise<void> {
    event.preventDefault();
    const amount = normalizeAmount(this.depositAmount());
    if (amount === '') {
      this.actionError.set({
        type: '',
        title: 'Amount required',
        status: 400,
        detail: 'Enter the amount in BRL, for example 100.00.',
      });
      return;
    }
    this.depositing.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    const beforeCash = this.account()?.cashAvailable ?? null;
    try {
      let receipt = await this.api.deposit(amount, crypto.randomUUID());
      this.depositWatch.set(receipt);
      if (receipt.status !== 'POSTED') {
        receipt = await this.pollDeposit(receipt.depositId);
      }
      let caughtUp = false;
      try {
        caughtUp = await this.refreshUntil(() => this.account()?.cashAvailable !== beforeCash);
      } catch (error) {
        if (!this.destroyed) {
          this.actionError.set(problemFrom(error));
        }
      }
      if (this.destroyed) {
        return;
      }
      const posted =
        receipt.status === 'POSTED'
          ? `Deposit of ${formatBrl(receipt.amount)} posted to ${receipt.accountNumber}.`
          : `Deposit of ${formatBrl(receipt.amount)} is still ${receipt.status}. Refresh in a moment if cash does not move.`;
      this.notice.set(
        receipt.status === 'POSTED' && !caughtUp
          ? `${posted} The statement has not caught up yet. Refresh in a moment.`
          : posted,
      );
      if (receipt.status === 'POSTED') {
        this.depositAmount.set('');
      }
    } catch (error) {
      if (!this.destroyed) {
        this.actionError.set(problemFrom(error));
      }
    } finally {
      if (!this.destroyed) {
        this.depositing.set(false);
        if (this.depositWatch()?.status === 'POSTED') {
          this.depositWatch.set(null);
        }
      }
    }
  }

  protected async transfer(event: Event): Promise<void> {
    event.preventDefault();
    const toAccountNumber = this.transferTo().trim();
    const amount = normalizeAmount(this.transferAmount());
    if (toAccountNumber === '' || amount === '') {
      this.actionError.set({
        type: '',
        title: 'Transfer needs an account and an amount',
        status: 400,
        detail: 'Enter the destination account number and the amount in BRL.',
      });
      return;
    }
    this.transferring.set(true);
    this.actionError.set(null);
    this.notice.set(null);
    const beforeCount = this.lines().length;
    const beforeCash = this.account()?.cashAvailable ?? null;
    try {
      const receipt = await this.api.transfer(toAccountNumber, amount, crypto.randomUUID());
      let caughtUp = false;
      try {
        caughtUp = await this.refreshUntil(
          () => this.lines().length > beforeCount || this.account()?.cashAvailable !== beforeCash,
        );
      } catch (error) {
        if (!this.destroyed) {
          this.actionError.set(problemFrom(error));
        }
      }
      if (this.destroyed) {
        return;
      }
      const sent = `Sent ${formatBrl(receipt.amount)} to ${receipt.toAccount}. Cash left on this account: ${formatBrl(receipt.fromBalanceAfter)}.`;
      this.notice.set(
        caughtUp ? sent : `${sent} The statement has not caught up yet. Refresh in a moment.`,
      );
      this.transferTo.set('');
      this.transferAmount.set('');
    } catch (error) {
      if (!this.destroyed) {
        this.actionError.set(problemFrom(error));
      }
    } finally {
      if (!this.destroyed) {
        this.transferring.set(false);
      }
    }
  }

  private async pollDeposit(id: string): Promise<DepositReceipt> {
    let latest: DepositReceipt | null = null;
    for (let attempt = 0; attempt < 20 && !this.destroyed; attempt++) {
      latest = await this.api.depositStatus(id);
      this.depositWatch.set(latest);
      if (latest.status === 'POSTED') {
        return latest;
      }
      await wait(400);
    }
    if (!latest) {
      throw new Error('Deposit status was not returned.');
    }
    return latest;
  }

  private async refreshUntil(done: () => boolean): Promise<boolean> {
    for (let attempt = 0; attempt < 10 && !this.destroyed; attempt++) {
      const snapshot = await loadAccount(this.api);
      if (snapshot.error) {
        throw new CarriedProblem(snapshot.error);
      }
      this.account.set(snapshot.account);
      this.lines.set(snapshot.lines);
      if (done()) {
        return true;
      }
      await wait(400);
    }
    return done();
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
