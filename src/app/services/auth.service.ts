// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import {
  LoginRequest,
  RegisterRequest,
  AdminLoginRequest,
  AdminRegisterRequest,
  AuthResponse,
  ApiResponse,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'https://travelsaveapi.onrender.com/api/Auth';
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAdminSubject = new BehaviorSubject<boolean>(false);
  public isAdmin$ = this.isAdminSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        this.isAdminSubject.next(user?.roles?.includes('Admin') || false);
      } catch {
        this.clearAuthData();
      }
    }
  }

  // User Registration
  registerUser(data: RegisterRequest): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/user/register`, data)
      .pipe(catchError(this.handleError));
  }

  // User Login
  loginUser(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/user/login`, data).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.setAuthData(response.data);
        }
      }),
      catchError(this.handleError),
    );
  }

  // Admin Registration
  registerAdmin(data: AdminRegisterRequest): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/admin/register`, data)
      .pipe(catchError(this.handleError));
  }

  // Admin Login
  loginAdmin(data: AdminLoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/admin/login`, data).pipe(
      tap((response) => {
        console.log('🔑 loginAdmin response:', response);
        if (response.success && response.data) {
          // The API returns the access token as 'token'
          const token = response.data.token;
          const refreshToken = response.data.refreshToken;
          console.log('🔑 Token from API:', token?.substring(0, 30) + '...');
          console.log('🔑 Refresh token from API:', refreshToken?.substring(0, 30) + '...');
          this.setAuthData({
            token: token,
            refreshToken: refreshToken,
            userName: response.data.userName,
            roles: response.data.roles,
          });
          console.log('🔑 Token stored?', !!localStorage.getItem(this.TOKEN_KEY));
          console.log('🔑 Refresh stored?', !!localStorage.getItem(this.REFRESH_TOKEN_KEY));
        }
      }),
      catchError(this.handleError),
    );
  }

  // Refresh Token
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<AuthResponse>(`${this.API_URL}/refresh`, { refreshToken }).pipe(
      tap((response) => {
        if (response.success && response.data) {
          const newToken = response.data.token;
          if (newToken) {
            localStorage.setItem(this.TOKEN_KEY, newToken);
          }
          // Update refresh token if provided (token rotation)
          if (response.data.refreshToken) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.data.refreshToken);
          }
          // Update user data if provided
          if (response.data.userName) {
            localStorage.setItem(
              this.USER_KEY,
              JSON.stringify({
                userName: response.data.userName,
                roles: response.data.roles || [],
              }),
            );
            this.currentUserSubject.next({
              userName: response.data.userName,
              roles: response.data.roles || [],
            });
          }
          this.isAdminSubject.next(response.data.roles?.includes('Admin') || false);
        }
      }),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  // Logout
  logout(): void {
    const token = this.getToken();
    if (token) {
      this.http
        .post(
          `${this.API_URL}/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        .subscribe({
          next: () => {
            this.clearAuthData();
            this.router.navigate(['/admin/login']);
          },
          error: () => {
            this.clearAuthData();
            this.router.navigate(['/admin/login']);
          },
        });
    } else {
      this.clearAuthData();
      this.router.navigate(['/admin/login']);
    }
  }

  // Forgot Password
  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/forgot-password`, { email })
      .pipe(catchError(this.handleError));
  }

  // Reset Password
  resetPassword(email: string, otp: string, newPassword: string): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/reset-password`, {
        email,
        otp,
        newPassword,
      })
      .pipe(catchError(this.handleError));
  }

  // Resend Confirmation
  resendConfirmation(email: string): Observable<ApiResponse<any>> {
    return this.http
      .post<ApiResponse<any>>(`${this.API_URL}/resend-confirmation`, { email })
      .pipe(catchError(this.handleError));
  }

  confirmEmail(userId: string, token: string): Observable<ApiResponse<any>> {
    return this.http
      .get<ApiResponse<any>>(`${this.API_URL}/confirm-email`, {
        params: {
          userId: userId,
          token: token,
        },
      })
      .pipe(catchError(this.handleError));
  }

  // Token Management
  private setAuthData(data: {
    token: string;
    refreshToken: string;
    userName: string;
    roles: string[];
  }): void {
    localStorage.setItem(this.TOKEN_KEY, data.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(
      this.USER_KEY,
      JSON.stringify({
        userName: data.userName,
        roles: data.roles,
      }),
    );

    this.currentUserSubject.next({
      userName: data.userName,
      roles: data.roles,
    });
    this.isAdminSubject.next(data.roles?.includes('Admin') || false);
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAdminSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user?.roles?.includes('Admin') || false;
      } catch {
        return false;
      }
    }
    return false;
  }

  getUserName(): string | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user?.userName || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  getUserRoles(): string[] {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user?.roles || [];
      } catch {
        return [];
      }
    }
    return [];
  }

  public clearLocalSessionAndRedirect(): void {
    this.clearAuthData(); // private method, but accessible inside the class
    this.router.navigate(['/admin/login']);
  }
}
