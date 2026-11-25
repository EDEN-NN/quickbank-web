export interface Account {
  accountNumber: string;
  ownerName: string;
  cashAvailable: string;
  creditLimit: string;
  creditUsed: string;
  creditAvailable: string;
  currency: string;
}

export interface StatementLine {
  id: string;
  occurredAt: string;
  type: string;
  amount: string;
  counterparty: string;
  runningBalance: string;
  transferId: string | null;
}

export interface DepositReceipt {
  depositId: string;
  status: string;
  accountNumber: string;
  amount: string;
  currency: string;
}

export interface Profile {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Credit {
  creditLimit: string;
  creditLimitMax: string;
  creditUsed: string;
  creditAvailable: string;
  currency: string;
}

export interface TransferReceipt {
  transferId: string;
  fromAccount: string;
  toAccount: string;
  amount: string;
  fromBalanceAfter: string;
  toBalanceAfter: string;
  currency: string;
}
