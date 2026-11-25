import { Account, StatementLine } from './models';
import { ApiProblem, isNoAccount, problemFrom } from './problem';
import { QuickBankApi } from './api.service';

export interface AccountSnapshot {
  account: Account | null;
  lines: StatementLine[];
  error: ApiProblem | null;
}

export async function loadAccount(api: QuickBankApi): Promise<AccountSnapshot> {
  try {
    const account = await api.me();
    try {
      const lines = await api.statement();
      return { account, lines, error: null };
    } catch (error) {
      return { account, lines: [], error: problemFrom(error) };
    }
  } catch (error) {
    const problem = problemFrom(error);
    if (isNoAccount(problem)) {
      return { account: null, lines: [], error: null };
    }
    return { account: null, lines: [], error: problem };
  }
}
