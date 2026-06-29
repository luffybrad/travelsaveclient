import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChildren,
  QueryList,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { DashboardStats } from '../../../models/admin.model';
import { AuthService } from '../../../services/auth.service';

declare const Chart: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush, // ✅ Performance
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
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

  @ViewChildren('barChartCanvas') barChartCanvas!: QueryList<ElementRef>;
  @ViewChildren('doughnutChartCanvas') doughnutChartCanvas!: QueryList<ElementRef>;

  // Activity icons
  activityIcons: Record<string, string> = {
    user_registered: 'fa-user-plus',
    plan_created: 'fa-plus-circle',
    deposit_made: 'fa-arrow-down',
    withdrawal_made: 'fa-arrow-up',
    expense_added: 'fa-receipt',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.userName = this.authService.getUserName() || 'Admin';
  }

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  loadDashboardStats(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getDashboardStats()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.stats = response.data;
            this.filteredActivities = response.data.recentActivities || [];
            this.applyFilter();
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
    this.cdr.markForCheck();
  }

  getActivityIcon(type: string): string {
    return this.activityIcons[type] || 'fa-circle';
  }

  // ✅ KSh currency formatter
  formatCurrency(value: number): string {
    return `KSh ${value.toFixed(2)}`;
  }

  private initCharts(): void {
    if (!this.stats) return;
    this.destroyCharts();

    // ---- Bar Chart: Deposits, Withdrawals, Expenses, Refunds ----
    const barCtx = document.getElementById('barChart') as HTMLCanvasElement;
    if (barCtx) {
      // ✅ Include refunds (from backend) – ensure stats.totalRefunds exists
      const refunds = (this.stats as any).totalRefunds || 0;

      this.barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['Deposits', 'Withdrawals', 'Expenses', 'Refunds'],
          datasets: [
            {
              label: 'Amount (KSh)',
              data: [
                this.stats.totalDeposits || 0,
                Math.abs(this.stats.totalWithdrawals || 0),
                Math.abs(this.stats.totalExpenses || 0),
                refunds,
              ],
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
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
              ticks: { callback: (value: any) => 'KSh ' + value.toFixed(0) },
            },
          },
        },
      });
    }

    // ---- Doughnut Chart: Plan Status Distribution (unchanged) ----
    const doughnutCtx = document.getElementById('doughnutChart') as HTMLCanvasElement;
    if (doughnutCtx) {
      this.adminService
        .getAllPlans()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
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
              this.initDoughnutFallback(doughnutCtx);
            }
          },
          error: () => this.initDoughnutFallback(doughnutCtx),
        });
    }
  }

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

  private destroyCharts(): void {
    if (this.barChart) {
      this.barChart.destroy();
      this.barChart = null;
    }
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
      this.doughnutChart = null;
    }
  }
}
