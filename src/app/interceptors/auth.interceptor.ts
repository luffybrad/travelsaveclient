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
    // ✅ Only skip login and register endpoints
    const isLoginOrRegister =
      req.url.includes('/api/Auth/admin/login') ||
      req.url.includes('/api/Auth/user/login') ||
      req.url.includes('/api/Auth/admin/register') ||
      req.url.includes('/api/Auth/user/register');

    if (isLoginOrRegister) {
      console.log('🔄 Interceptor - Skipping login/register:', req.url);
      return next.handle(req);
    }

    // Skip OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next.handle(req);
    }

    console.log('🔄 Interceptor - Request:', req.url);

    // ✅ Get token directly from localStorage - bypass authService
    const token = localStorage.getItem('access_token');
    console.log('🔄 Interceptor - Token from localStorage:', !!token);
    console.log('🔄 Interceptor - Token preview:', token ? token.substring(0, 30) + '...' : 'null');

    let authReq = req;

    if (token) {
      // ✅ Force clone the request with the token
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('🔄 Interceptor - ✅ Added Authorization header');
      console.log('🔄 Interceptor - ✅ Authorization:', `Bearer ${token.substring(0, 20)}...`);
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
            localStorage.setItem('access_token', newToken); // ✅ Force save
            this.refreshTokenSubject.next(newToken);
            // ✅ Retry the original request with new token
            const newRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json',
              },
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
          });
          return next.handle(newRequest);
        }),
      );
    }
  }
}
