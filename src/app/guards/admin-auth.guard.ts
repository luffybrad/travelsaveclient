// src/app/guards/admin-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

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
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // ✅ Check if token is expired and try to refresh
    const token = this.authService.getToken();
    if (!token) {
      return this.authService.refreshToken().pipe(
        switchMap(() => {
          if (this.authService.isAdmin()) {
            return of(true);
          }
          this.router.navigate(['/']);
          return of(false);
        }),
        catchError(() => {
          this.router.navigate(['/admin/login']);
          return of(false);
        }),
      );
    }

    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
