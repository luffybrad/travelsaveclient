// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpHeaders,
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
    // Skip adding token for auth endpoints
    if (req.url.includes('/api/Auth/') && !req.url.includes('/api/Auth/refresh')) {
      return next.handle(req);
    }

    // Skip token for health endpoints
    if (req.url.includes('/api/Admin/system/health')) {
      return next.handle(req);
    }

    // Skip OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next.handle(req);
    }

    console.log('🔄 Interceptor - Request:', req.url);
    console.log('🔄 Interceptor - Method:', req.method);

    const token = this.authService.getToken();
    console.log('🔄 Interceptor - Token exists:', !!token);
    if (token) {
      console.log('🔄 Interceptor - Token preview:', token.substring(0, 20) + '...');
    }

    let authReq = req;

    if (token) {
      authReq = this.addTokenToRequest(req, token);
      console.log('🔄 Interceptor - Added token to request');
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
          console.log('🔄 Interceptor - Handling 401 error for:', req.url);
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
    console.log('🔄 Interceptor - Entering handle401Error');
    console.log('🔄 Interceptor - isRefreshing:', this.isRefreshing);

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
            console.log('🔄 Interceptor - New token obtained:', !!newToken);
            this.refreshTokenSubject.next(newToken);

            // ✅ IMPORTANT: Update the request with the new token
            const newRequest = this.addTokenToRequest(request, newToken);
            console.log('🔄 Interceptor - Retrying request with new token');
            return next.handle(newRequest);
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
      console.log('🔄 Interceptor - Refresh already in progress, waiting for token');
      return this.refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          console.log('🔄 Interceptor - Got new token from queue, retrying request');
          return next.handle(this.addTokenToRequest(request, token!));
        }),
      );
    }
  }
}
