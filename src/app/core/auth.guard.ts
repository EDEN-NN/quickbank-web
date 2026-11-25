import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.init();
  if (auth.signedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/']);
};
