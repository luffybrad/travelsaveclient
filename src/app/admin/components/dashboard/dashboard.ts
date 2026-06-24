import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { DashboardStats } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  isLoading = true;
  error: string | null = null;

  // Icon classes for activity types (FontAwesome)
  activityIcons: Record<string, string> = {
    user_registered: 'fa-user-plus',
    plan_created: 'fa-plus-circle',
    deposit_made: 'fa-arrow-down',
    withdrawal_made: 'fa-arrow-up',
    expense_added: 'fa-receipt',
  };

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getDashboardStats()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
          } else {
            this.error = response.message || 'Failed to load dashboard stats';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  getActivityIcon(type: string): string {
    return this.activityIcons[type] || 'fa-circle';
  }

  // Format currency with dollar sign and 2 decimals
  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }
}
