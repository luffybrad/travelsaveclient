// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ✅ ONLY skip login and register endpoints (not all auth endpoints)
    const isLoginOrRegister =
      req.url.includes('/api/Auth/admin/login') ||
      req.url.includes('/api/Auth/user/login') ||
      req.url.includes('/api/Auth/admin/register') ||
      req.url.includes('/api/Auth/user/register');

    if (isLoginOrRegister) {
      console.log('🔄 Interceptor - Skipping login/register:', req.url);
      return next.handle(req);
    }

    // Skip OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next.handle(req);
    }

    console.log('🔄 Interceptor - Request:', req.url);

    const token = this.authService.getToken();
    console.log('🔄 Interceptor - Token exists:', !!token);

    let authReq = req;

    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('🔄 Interceptor - Added Authorization header');
    } else {
      console.log('🔄 Interceptor - No token available');
    }

    return next.handle(authReq).pipe(
      catchError((error) => {
        console.log('❌ Interceptor - Error:', error.status, error.message);
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          !req.url.includes('/api/Auth/login') &&
          !req.url.includes('/api/Auth/refresh')
        ) {
          console.log('🔄 Interceptor - Handling 401 error');
          return this.handle401Error(authReq, next);
        }
        return throwError(() => error);
      }),
    );
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      console.log('🔄 Interceptor - Starting token refresh');
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          console.log('🔄 Interceptor - Refresh response:', response.success);
          this.isRefreshing = false;
          if (response.success && response.data) {
            const newToken = response.data.accessToken;
            console.log('🔄 Interceptor - New token obtained');
            this.refreshTokenSubject.next(newToken);
            // ✅ Retry the original request with new token
            return next.handle(this.addTokenToRequest(request, newToken));
          }
          console.log('🔄 Interceptor - Refresh failed, logging out');
          this.authService.logout();
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError((error) => {
          console.log('🔄 Interceptor - Refresh error:', error);
          this.isRefreshing = false;
          this.authService.logout();
          return throwError(() => error);
        }),
      );
    } else {
      console.log('🔄 Interceptor - Refresh already in progress, waiting');
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          console.log('🔄 Interceptor - Using new token from queue');
          return next.handle(this.addTokenToRequest(request, token!));
        }),
      );
    }
  }
}
