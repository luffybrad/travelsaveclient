// src/app/guards/public.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PublicGuard implements CanActivate {
  // ✅ Routes that should be accessible even when authenticated
  private readonly PUBLIC_ROUTES = ['email-confirmation', 'reset-password'];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentPath = route.routeConfig?.path || '';
    const fullPath = state.url;

    // ✅ Check if current route is in the public routes list
    const isPublicRoute = this.PUBLIC_ROUTES.some((r) => fullPath.includes(r) || currentPath === r);

    if (isPublicRoute) {
      return true;
    }

    // For other routes, redirect if authenticated
    if (this.authService.isAuthenticated()) {
      if (this.authService.isAdmin()) {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/']);
      }
      return false;
    }

    return true;
  }
}
