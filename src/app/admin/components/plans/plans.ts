import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AdminService } from '../../../services/admin.service';
import { Plan, PlanDetail } from '../../../models/admin.model';

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPlansComponent implements OnInit, OnDestroy {
  plans: Plan[] = [];
  filteredPlans: Plan[] = [];
  isLoading = true;
  error: string | null = null;
  selectedPlanDetail: PlanDetail | null = null;
  showDetailModal = false;
  isLoadingDetail = false;

  // Filters
  searchTerm = '';
  filterStatus = 'All';
  statuses = ['All', 'Active', 'Completed', 'Archived'];

  // Summary stats
  totalPlans = 0;
  activePlans = 0;
  completedPlans = 0;
  archivedPlans = 0;

  // Modal
  selectedPlan: Plan | null = null;
  showStatusModal = false;
  isUpdating = false;

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPlans();

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterPlans();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getAllPlans()
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
            this.plans = response.data;
            this.calculateSummary();
            this.filterPlans();
          } else {
            this.error = response.message || 'Failed to load plans';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  viewPlanDetails(plan: Plan): void {
    this.isLoadingDetail = true;
    this.adminService
      .getPlanById(plan.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingDetail = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedPlanDetail = response.data;
            this.showDetailModal = true;
          } else {
            this.error = response.message || 'Failed to load plan details';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedPlanDetail = null;
  }

  calculateSummary(): void {
    this.totalPlans = this.plans.length;
    this.activePlans = this.plans.filter((p) => p.status === 'Active').length;
    this.completedPlans = this.plans.filter((p) => p.status === 'Completed').length;
    this.archivedPlans = this.plans.filter((p) => p.status === 'Archived').length;
  }

  onSearchInput(term: string): void {
    this.searchSubject.next(term);
  }

  filterPlans(): void {
    let filtered = this.plans;

    if (this.filterStatus !== 'All') {
      filtered = filtered.filter((p) => p.status === this.filterStatus);
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.ownerName.toLowerCase().includes(term),
      );
    }

    this.filteredPlans = filtered;
  }

  openStatusModal(plan: Plan): void {
    this.selectedPlan = plan;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
    this.showStatusModal = false;
    this.selectedPlan = null;
  }

  updatePlanStatus(status: string): void {
    if (!this.selectedPlan) return;

    this.isUpdating = true;

    this.adminService
      .updatePlanStatus(this.selectedPlan.id, status)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isUpdating = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            const index = this.plans.findIndex((p) => p.id === this.selectedPlan!.id);
            if (index !== -1) {
              this.plans[index].status = status as Plan['status'];
            }
            this.calculateSummary();
            this.filterPlans();
            this.closeStatusModal();
          } else {
            this.error = response.message || 'Failed to update plan status';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  deletePlan(plan: Plan): void {
    if (
      !confirm(`Are you sure you want to delete plan "${plan.name}"? This action cannot be undone.`)
    ) {
      return;
    }

    this.adminService
      .deletePlan(plan.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.plans = this.plans.filter((p) => p.id !== plan.id);
            this.calculateSummary();
            this.filterPlans();
            this.cdr.markForCheck();
          } else {
            this.error = response.message || 'Failed to delete plan';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  // UI Helpers
  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      Active: 'bg-green-100 text-green-800',
      Completed: 'bg-blue-100 text-blue-800',
      Archived: 'bg-gray-100 text-gray-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  }

  formatCurrency(amount: number): string {
    return `KSh ${amount.toFixed(2)}`;
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      Deposit: 'bg-green-100 text-green-800',
      Withdrawal: 'bg-red-100 text-red-800',
      Expense: 'bg-yellow-100 text-yellow-800',
      Refund: 'bg-blue-100 text-blue-800',
    };
    return map[type] || 'bg-gray-100 text-gray-800';
  }

  getAmountColor(amount: number): string {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  }
}
