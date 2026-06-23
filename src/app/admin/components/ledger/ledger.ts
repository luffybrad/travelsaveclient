// src/app/admin/ledger/ledger.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { LedgerEntry } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ledger.html',
})
export class AdminLedgerComponent implements OnInit {
  entries: LedgerEntry[] = [];
  filteredEntries: LedgerEntry[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';
  filterType = 'All';
  transactionTypes = ['All', 'Deposit', 'Withdrawal', 'Expense', 'Refund'];
  totalAmount = 0;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadLedger();
  }

  loadLedger(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getLedgerEntries()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.entries = response.data;
            this.filterEntries();
            this.calculateTotals();
          } else {
            this.error = response.message || 'Failed to load ledger';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  filterEntries(): void {
    let filtered = this.entries;

    // Filter by type
    if (this.filterType !== 'All') {
      filtered = filtered.filter((e) => e.transactionType === this.filterType);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.userName.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term) ||
          e.paystackReference?.toLowerCase().includes(term),
      );
    }

    this.filteredEntries = filtered;
    this.calculateTotals();
  }

  calculateTotals(): void {
    this.totalAmount = this.filteredEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'Deposit':
        return 'bg-green-100 text-green-800';
      case 'Withdrawal':
        return 'bg-red-100 text-red-800';
      case 'Expense':
        return 'bg-yellow-100 text-yellow-800';
      case 'Refund':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'Deposit':
        return '💰';
      case 'Withdrawal':
        return '💸';
      case 'Expense':
        return '🧾';
      case 'Refund':
        return '🔄';
      default:
        return '📌';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Success':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatCurrency(amount: number): string {
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  }

  getAmountColor(amount: number): string {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  }
}
