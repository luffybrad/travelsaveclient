// src/app/guards/public.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class PublicGuard implements CanActivate {
  private readonly PUBLIC_ROUTES = ['email-confirmation', 'reset-password'];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentPath = route.routeConfig?.path || '';
    const fullPath = state.url;

    console.log('🛡️ PublicGuard - Path:', fullPath);

    const isPublicRoute = this.PUBLIC_ROUTES.some((r) => fullPath.includes(r) || currentPath === r);

    if (isPublicRoute) {
      return true;
    }

    // Check if user is authenticated
    const token = this.authService.getToken();
    const isAuth = !!token;
    const isAdmin = this.authService.isAdmin();

    console.log('🛡️ PublicGuard - Is authenticated:', isAuth);
    console.log('🛡️ PublicGuard - Is admin:', isAdmin);

    if (isAuth) {
      if (isAdmin) {
        console.log('🛡️ PublicGuard - Redirecting admin to /admin');
        this.router.navigate(['/admin']);
      } else {
        console.log('🛡️ PublicGuard - Redirecting user to /');
        this.router.navigate(['/']);
      }
      return false;
    }

    return true;
  }
}
