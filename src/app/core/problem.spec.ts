import { HttpErrorResponse } from '@angular/common/http';
import { isNoAccount, problemFrom } from './problem';

describe('problemFrom', () => {
  it('keeps the API title and detail for insufficient funds and unknown accounts', () => {
    const funds = problemFrom(
      new HttpErrorResponse({
        status: 422,
        error: {
          type: 'https://quickbank.dev/problems/insufficient-funds',
          title: 'Insufficient funds',
          status: 422,
          detail: 'Account 10000001 has 0.00 BRL in cash, which is less than 25.00 BRL.',
        },
      }),
    );
    expect(funds.title).toBe('Insufficient funds');
    expect(funds.detail).toContain('less than 25.00 BRL');

    const unknown = problemFrom(
      new HttpErrorResponse({
        status: 404,
        error: {
          type: 'https://quickbank.dev/problems/unknown-account',
          title: 'Unknown account',
          status: 404,
          detail: 'No account uses the number 10000099. If it was just opened, wait a second and retry.',
        },
      }),
    );
    expect(unknown.title).toBe('Unknown account');
    expect(isNoAccount(unknown)).toBe(false);
  });

  it('treats only the open-an-account 404 as an empty account', () => {
    const empty = problemFrom(
      new HttpErrorResponse({
        status: 404,
        error: {
          type: 'https://quickbank.dev/problems/not-found',
          title: 'Not found',
          status: 404,
          detail: 'Open an account first.',
        },
      }),
    );
    expect(isNoAccount(empty)).toBe(true);
    expect(empty.detail).toBe('Open an account first.');
  });
});
