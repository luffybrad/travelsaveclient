import {
  Component,
  OnInit,
  ElementRef,
  ViewChildren,
  QueryList,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // ✅ Add this
import { AdminService } from '../../../services/admin.service';
import { DashboardStats } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

declare const Chart: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule], // ✅ Include FormsModule
  templateUrl: './dashboard.html',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  stats: DashboardStats | null = null;
  isLoading = true;
  error: string | null = null;
  userName: string = 'Admin';

  // Filter state
  activityFilter: string = 'all';
  filteredActivities: any[] = [];

  // Chart instances
  private barChart: any;
  private doughnutChart: any;

  // Canvas references
  @ViewChildren('barChartCanvas') barChartCanvas!: QueryList<ElementRef>;
  @ViewChildren('doughnutChartCanvas') doughnutChartCanvas!: QueryList<ElementRef>;

  // Activity types for filter dropdown
  activityTypes = [
    'all',
    'user_registered',
    'plan_created',
    'deposit_made',
    'withdrawal_made',
    'expense_added',
  ];

  // FontAwesome icons for activity types
  activityIcons: Record<string, string> = {
    user_registered: 'fa-user-plus',
    plan_created: 'fa-plus-circle',
    deposit_made: 'fa-arrow-down',
    withdrawal_made: 'fa-arrow-up',
    expense_added: 'fa-receipt',
  };

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
  ) {
    this.userName = this.authService.getUserName() || 'Admin';
  }

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  ngAfterViewInit(): void {
    // Charts are initialized after data loads
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
            this.filteredActivities = response.data.recentActivities || [];
            this.applyFilter();
            // Wait for DOM to render then init charts
            setTimeout(() => this.initCharts(), 300);
          } else {
            this.error = response.message || 'Failed to load dashboard stats';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  applyFilter(): void {
    if (!this.stats) return;
    if (this.activityFilter === 'all') {
      this.filteredActivities = this.stats.recentActivities || [];
    } else {
      this.filteredActivities = (this.stats.recentActivities || []).filter(
        (a) => a.type === this.activityFilter,
      );
    }
  }

  getActivityIcon(type: string): string {
    return this.activityIcons[type] || 'fa-circle';
  }

  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  private initCharts(): void {
    if (!this.stats) return;

    // Destroy previous charts if they exist
    if (this.barChart) this.barChart.destroy();
    if (this.doughnutChart) this.doughnutChart.destroy();

    // ---- Bar Chart: Deposits, Withdrawals, Expenses ----
    const barCtx = document.getElementById('barChart') as HTMLCanvasElement;
    if (barCtx) {
      this.barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['Deposits', 'Withdrawals', 'Expenses'],
          datasets: [
            {
              label: 'Amount ($)',
              data: [
                this.stats.totalDeposits || 0,
                Math.abs(this.stats.totalWithdrawals || 0),
                Math.abs(this.stats.totalExpenses || 0),
              ],
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value: any) => '$' + value.toFixed(2) },
            },
          },
        },
      });
    }

    // ---- Doughnut Chart: Plan Status Distribution ----
    const doughnutCtx = document.getElementById('doughnutChart') as HTMLCanvasElement;
    if (doughnutCtx) {
      // Fetch real plan statuses from the API
      this.adminService.getAllPlans().subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const statusMap: Record<string, number> = {};
            res.data.forEach((p: any) => {
              statusMap[p.status] = (statusMap[p.status] || 0) + 1;
            });
            const labels = Object.keys(statusMap);
            const values = Object.values(statusMap);
            const colors = ['#3b82f6', '#10b981', '#6b7280', '#ef4444'];
            this.doughnutChart = new Chart(doughnutCtx, {
              type: 'doughnut',
              data: {
                labels: labels,
                datasets: [
                  {
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 3,
                    borderColor: '#ffffff',
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
                },
                cutout: '70%',
              },
            });
          } else {
            // Fallback if API fails
            this.initDoughnutFallback(doughnutCtx);
          }
        },
        error: () => {
          this.initDoughnutFallback(doughnutCtx);
        },
      });
    }
  }

  // Fallback when plan status API fails: show Active vs Inactive
  private initDoughnutFallback(ctx: HTMLCanvasElement): void {
    const active = this.stats?.activePlans || 0;
    const inactive = (this.stats?.totalPlans || 0) - active;
    this.doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Completed/Archived'],
        datasets: [
          {
            data: [active, inactive],
            backgroundColor: ['#3b82f6', '#6b7280'],
            borderWidth: 3,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } },
        },
        cutout: '70%',
      },
    });
  }
}
