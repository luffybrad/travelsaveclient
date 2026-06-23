// src/app/admin/plans/plans.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { Plan } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plans.html',
})
export class AdminPlansComponent implements OnInit {
  plans: Plan[] = [];
  filteredPlans: Plan[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';
  filterStatus = 'All';
  selectedPlan: Plan | null = null;
  showStatusModal = false;
  isUpdating = false;

  statuses = ['All', 'Active', 'Completed', 'Archived'];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getAllPlans()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.plans = response.data;
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

  filterPlans(): void {
    let filtered = this.plans;

    // Filter by status
    if (this.filterStatus !== 'All') {
      filtered = filtered.filter((p) => p.status === this.filterStatus);
    }

    // Filter by search term
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
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update plan in list
            const index = this.plans.findIndex((p) => p.id === this.selectedPlan!.id);
            if (index !== -1) {
              this.plans[index].status = status as Plan['status'];
            }
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

    this.adminService.deletePlan(plan.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.plans = this.plans.filter((p) => p.id !== plan.id);
          this.filterPlans();
        } else {
          this.error = response.message || 'Failed to delete plan';
        }
      },
      error: (error) => {
        this.error = error?.error?.message || 'An unexpected error occurred';
      },
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}
