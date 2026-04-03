import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SubscriptionService } from '../services/subscription.service';
import { map, catchError, of } from 'rxjs';

export const subscriptionGuard: CanActivateFn = () => {
  const subService = inject(SubscriptionService);
  const router = inject(Router);

  return subService.checkStatus().pipe(
    map((status) => {
      if (status.active) {
        return true;
      }
      router.navigate(['/subscription']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/subscription']);
      return of(false);
    }),
  );
};
