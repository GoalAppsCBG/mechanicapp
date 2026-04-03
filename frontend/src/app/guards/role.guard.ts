import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Role-based guard. Checks user role against the route's `data.section`.
 * If the user has no access to the section, redirects to /dashboard.
 *
 * Usage:
 *   { path: 'inventory', component: ..., canActivate: [authGuard, roleGuard], data: { section: 'inventory' } }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const section = route.data?.['section'] as string | undefined;

  // No section specified means no role restriction beyond authentication
  if (!section) return true;

  if (authService.hasAccess(section)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
