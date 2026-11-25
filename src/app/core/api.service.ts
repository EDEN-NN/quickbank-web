import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Account, Credit, DepositReceipt, Profile, StatementLine, TransferReceipt } from './models';

@Injectable({ providedIn: 'root' })
export class QuickBankApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  me(): Promise<Account> {
    return firstValueFrom(this.http.get<Account>(`${this.base}/api/accounts/me`));
  }

  open(): Promise<Account> {
    return firstValueFrom(this.http.post<Account>(`${this.base}/api/accounts`, {}));
  }

  statement(): Promise<StatementLine[]> {
    return firstValueFrom(this.http.get<StatementLine[]>(`${this.base}/api/accounts/me/statement`));
  }

  deposit(amount: string, idempotencyKey: string): Promise<DepositReceipt> {
    return firstValueFrom(
      this.http.post<DepositReceipt>(
        `${this.base}/api/accounts/me/deposits`,
        { amount },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      ),
    );
  }

  depositStatus(id: string): Promise<DepositReceipt> {
    return firstValueFrom(
      this.http.get<DepositReceipt>(`${this.base}/api/deposits/${encodeURIComponent(id)}`),
    );
  }

  profile(): Promise<Profile> {
    return firstValueFrom(this.http.get<Profile>(`${this.base}/api/profile`));
  }

  updateProfile(email: string, firstName: string, lastName: string): Promise<Profile> {
    return firstValueFrom(
      this.http.put<Profile>(`${this.base}/api/profile`, { email, firstName, lastName }),
    );
  }

  credit(): Promise<Credit> {
    return firstValueFrom(this.http.get<Credit>(`${this.base}/api/accounts/me/credit`));
  }

  changeCredit(creditLimit: string): Promise<Credit> {
    return firstValueFrom(this.http.put<Credit>(`${this.base}/api/accounts/me/credit`, { creditLimit }));
  }

  transfer(toAccountNumber: string, amount: string, idempotencyKey: string): Promise<TransferReceipt> {
    return firstValueFrom(
      this.http.post<TransferReceipt>(
        `${this.base}/api/transfers`,
        { toAccountNumber, amount },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      ),
    );
  }
}
