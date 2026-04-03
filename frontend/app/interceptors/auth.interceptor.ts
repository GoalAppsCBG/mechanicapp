import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Don't attach token to login requests
  if (req.url.includes('/api/auth/login')) {
    return next(req);
  }

  const token = authService.token;
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token expired or invalid — force logout
        authService.logout();
        router.navigate(['/login']);
      } else if (
        error.status === 403 &&
        error.error?.code === 'SUBSCRIPTION_REQUIRED'
      ) {
        router.navigate(['/subscription']);
      }
      return throwError(() => error);
    }),
  );
};
