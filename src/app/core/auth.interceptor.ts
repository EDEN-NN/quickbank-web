import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiBaseUrl) || isPublicAuth(req.url)) {
    return next(req);
  }
  const auth = inject(AuthService);
  return from(auth.ensureToken()).pipe(
    switchMap((token) => next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))),
  );
};

function isPublicAuth(url: string): boolean {
  return (
    url.startsWith(`${environment.apiBaseUrl}/api/auth/login`) ||
    url.startsWith(`${environment.apiBaseUrl}/api/auth/registrations`) ||
    url.startsWith(`${environment.apiBaseUrl}/api/auth/refresh`)
  );
}
