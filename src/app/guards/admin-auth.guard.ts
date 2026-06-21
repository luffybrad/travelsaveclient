// src/app/guards/admin-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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

    if (!this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }
}
