// src/app/guards/admin-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap, delay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AdminAuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean> | Promise<boolean> | boolean {
    console.log('🛡️ AdminAuthGuard - Checking access for:', state.url);
    console.log('🛡️ AdminAuthGuard - Token exists:', !!this.authService.getToken());
    console.log('🛡️ AdminAuthGuard - Is admin:', this.authService.isAdmin());

    // Check if user is authenticated
    const token = this.authService.getToken();
    if (!token) {
      console.log('🛡️ AdminAuthGuard - No token, redirecting to login');
      this.router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check if user has admin role
    if (!this.authService.isAdmin()) {
      console.log('🛡️ AdminAuthGuard - Not admin, redirecting to home');
      this.router.navigate(['/']);
      return false;
    }

    console.log('🛡️ AdminAuthGuard - Access granted');
    return true;
  }
}
