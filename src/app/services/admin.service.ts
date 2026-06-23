// src/app/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { User, Plan, LedgerEntry, DashboardStats, ApiResponse } from '../models/admin.model';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly API_URL = 'https://travelsaveapi.onrender.com/api';

  constructor(private http: HttpClient) {}

  // Dashboard
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http
      .get<ApiResponse<DashboardStats>>(`${this.API_URL}/Admin/dashboard/stats`)
      .pipe(catchError(this.handleError));
  }

  // Users
  getUsers(): Observable<ApiResponse<User[]>> {
    return this.http
      .get<ApiResponse<User[]>>(`${this.API_URL}/Admin/users`)
      .pipe(catchError(this.handleError));
  }

  getUserById(userId: string): Observable<ApiResponse<User>> {
    return this.http
      .get<ApiResponse<User>>(`${this.API_URL}/Admin/users/${userId}`)
      .pipe(catchError(this.handleError));
  }

  updateUserRole(userId: string, roles: string[]): Observable<ApiResponse<any>> {
    return this.http
      .put<ApiResponse<any>>(`${this.API_URL}/Admin/users/${userId}/roles`, { roles })
      .pipe(catchError(this.handleError));
  }

  deleteUser(userId: string): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.API_URL}/Admin/users/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // Plans
  getAllPlans(): Observable<ApiResponse<Plan[]>> {
    return this.http
      .get<ApiResponse<Plan[]>>(`${this.API_URL}/Admin/plans`)
      .pipe(catchError(this.handleError));
  }

  getPlanById(planId: number): Observable<ApiResponse<Plan>> {
    return this.http
      .get<ApiResponse<Plan>>(`${this.API_URL}/Admin/plans/${planId}`)
      .pipe(catchError(this.handleError));
  }

  updatePlanStatus(planId: number, status: string): Observable<ApiResponse<any>> {
    return this.http
      .patch<ApiResponse<any>>(`${this.API_URL}/Admin/plans/${planId}/status`, { status })
      .pipe(catchError(this.handleError));
  }

  deletePlan(planId: number): Observable<ApiResponse<any>> {
    return this.http
      .delete<ApiResponse<any>>(`${this.API_URL}/Admin/plans/${planId}`)
      .pipe(catchError(this.handleError));
  }

  // Ledger
  getLedgerEntries(planId?: number): Observable<ApiResponse<LedgerEntry[]>> {
    const url = planId
      ? `${this.API_URL}/Admin/ledger?planId=${planId}`
      : `${this.API_URL}/Admin/ledger`;
    return this.http.get<ApiResponse<LedgerEntry[]>>(url).pipe(catchError(this.handleError));
  }

  getLedgerByUser(userId: string): Observable<ApiResponse<LedgerEntry[]>> {
    return this.http
      .get<ApiResponse<LedgerEntry[]>>(`${this.API_URL}/Admin/ledger/user/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // System
  getSystemHealth(): Observable<any> {
    return this.http.get(`${this.API_URL}/Admin/system/health`).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('Admin API Error:', error);
    return throwError(() => error);
  }
}
