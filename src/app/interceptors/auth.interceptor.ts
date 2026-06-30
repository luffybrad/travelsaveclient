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
    // Skip adding Authorization for login, register, and refresh
    const isSkippedEndpoint =
      req.url.includes('/api/Auth/admin/login') ||
      req.url.includes('/api/Auth/user/login') ||
      req.url.includes('/api/Auth/admin/register') ||
      req.url.includes('/api/Auth/user/register') ||
      req.url.includes('/api/Auth/refresh');

    if (isSkippedEndpoint) {
      console.log('🔄 Interceptor - Skipping auth endpoint:', req.url);
      return next.handle(req);
    }

    if (req.method === 'OPTIONS') {
      return next.handle(req);
    }

    console.log('🔄 Interceptor - Request:', req.url);

    // Start with a clone that disables credentials
    let authReq = req.clone({ withCredentials: false });

    // Only add Authorization header if not already present
    if (!req.headers.has('Authorization')) {
      const token = this.authService.getToken();
      console.log('🔄 Interceptor - Token exists:', !!token);

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
    } else {
      console.log('🔄 Interceptor - Request already has Authorization, skipping add');
    }

    // ✅ Apply error handling to EVERY request
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
    const refreshToken = this.authService.getRefreshToken();
    if (!refreshToken) {
      console.log('🔄 Interceptor - No refresh token, redirecting to login');
      this.authService.clearLocalSessionAndRedirect();
      return throwError(() => new Error('No refresh token'));
    }

    if (!this.isRefreshing) {
      console.log('🔄 Interceptor - Starting token refresh');
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          console.log('🔄 Interceptor - Refresh response:', response.success);
          this.isRefreshing = false;
          if (response.success && response.data) {
            const newToken = response.data.token || response.data.accessToken;
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
          this.authService.clearLocalSessionAndRedirect();
          return throwError(() => new Error('Token refresh failed'));
        }),
        catchError((error) => {
          console.log('🔄 Interceptor - Refresh error:', error);
          this.isRefreshing = false;
          this.authService.clearLocalSessionAndRedirect();
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
