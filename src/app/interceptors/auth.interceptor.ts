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
import { catchError, filter, take, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const isLoginOrRegister =
      req.url.includes('/api/Auth/admin/login') ||
      req.url.includes('/api/Auth/user/login') ||
      req.url.includes('/api/Auth/admin/register') ||
      req.url.includes('/api/Auth/user/register');

    if (isLoginOrRegister) {
      console.log('🔄 Interceptor - Skipping login/register:', req.url);
      return next.handle(req);
    }

    if (req.method === 'OPTIONS') {
      return next.handle(req);
    }

    console.log('🔄 Interceptor - Request:', req.url);

    // ✅ If request already has Authorization header, skip adding one
    if (req.headers.has('Authorization')) {
      console.log('🔄 Interceptor - Request already has Authorization, skipping');
      return next.handle(req);
    }

    const token = this.authService.getToken();
    console.log('🔄 Interceptor - Token exists:', !!token);

    let authReq = req.clone({ withCredentials: false }); // Always disable credentials

    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        withCredentials: false,
      });
      console.log('🔄 Interceptor - ✅ Added Authorization header');
    } else {
      console.log('🔄 Interceptor - ❌ No token available');
    }

    return next.handle(authReq).pipe(
      tap({
        next: (event: any) => {
          if (event && event.status) {
            console.log('✅ Interceptor - Response status:', event.status);
          }
        },
        error: (error: any) => {
          console.log('❌ Interceptor - Error status:', error.status);
        },
      }),
      catchError((error) => {
        console.log('❌ Interceptor - Caught error:', error.status, error.message);
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
            localStorage.setItem('access_token', newToken);
            this.refreshTokenSubject.next(newToken);
            const newRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json',
              },
              withCredentials: false,
            });
            return next.handle(newRequest);
          }
          console.log('🔄 Interceptor - Refresh failed, clearing auth data');
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
          const newRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token!}`,
              'Content-Type': 'application/json',
            },
            withCredentials: false,
          });
          return next.handle(newRequest);
        }),
      );
    }
  }
}
