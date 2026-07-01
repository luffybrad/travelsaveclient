// src/app/services/profile.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly API_URL = 'https://travelsaveapi.onrender.com/api/Profile';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getProfile(): Observable<any> {
    return this.http
      .get(`${this.API_URL}`, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  updateProfile(data: {
    userName: string;
    email: string;
    currentPassword: string;
  }): Observable<any> {
    return this.http
      .patch(`${this.API_URL}`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<any> {
    return this.http
      .post(`${this.API_URL}/change-password`, data, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  deleteAccount(data: { currentPassword: string }): Observable<any> {
    return this.http
      .delete(`${this.API_URL}`, {
        headers: this.getHeaders(),
        body: data,
      })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('Profile API Error:', error);
    return throwError(() => error);
  }
}
