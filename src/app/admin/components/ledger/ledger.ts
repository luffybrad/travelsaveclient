import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { LedgerEntry } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';

declare const Chart: any;

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ledger.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLedgerComponent implements OnInit, OnDestroy, AfterViewInit {
  // Data
  entries: LedgerEntry[] = [];
  filteredEntries: LedgerEntry[] = [];
  isLoading = true;
  error: string | null = null;

  // Filters
  searchTerm = '';
  filterType = 'All';
  transactionTypes = ['All', 'Deposit', 'Withdrawal', 'Expense', 'Refund'];

  // Summary
  totalTransactions = 0;
  netBalance = 0;
  totalDeposits = 0;
  totalWithdrawalsAndExpenses = 0;

  // Charts
  private lineChart: any;
  private pieChart: any;
  @ViewChild('lineChartCanvas') lineChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieChartCanvas') pieChartCanvas!: ElementRef<HTMLCanvasElement>;

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadLedger();

    // Debounce search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.filterEntries();
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    // Charts are initialized after data loads
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  loadLedger(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getLedgerEntries()
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
            this.entries = response.data;
            this.filterEntries();
            this.calculateSummary();
            setTimeout(() => this.initCharts(), 200);
          } else {
            this.error = response.message || 'Failed to load ledger';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  onSearchInput(term: string): void {
    this.searchSubject.next(term);
  }

  filterEntries(): void {
    let filtered = this.entries;

    if (this.filterType !== 'All') {
      filtered = filtered.filter((e) => e.transactionType === this.filterType);
    }

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
    this.calculateSummary();
    this.cdr.markForCheck();
  }

  calculateSummary(): void {
    this.totalTransactions = this.filteredEntries.length;
    this.netBalance = this.filteredEntries.reduce((sum, e) => sum + e.amount, 0);
    this.totalDeposits = this.entries
      .filter((e) => e.transactionType === 'Deposit')
      .reduce((sum, e) => sum + e.amount, 0);
    this.totalWithdrawalsAndExpenses = this.entries
      .filter((e) => e.transactionType === 'Withdrawal' || e.transactionType === 'Expense')
      .reduce((sum, e) => sum + e.amount, 0);
  }

  // ------ Currency Formatting (KSh) ------
  formatCurrency(amount: number): string {
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}KSh ${Math.abs(amount).toFixed(2)}`;
  }

  // ------ UI Helpers ------
  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      Deposit: 'bg-green-100 text-green-800',
      Withdrawal: 'bg-red-100 text-red-800',
      Expense: 'bg-yellow-100 text-yellow-800',
      Refund: 'bg-blue-100 text-blue-800',
    };
    return map[type] || 'bg-gray-100 text-gray-800';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      Deposit: 'fa-arrow-down',
      Withdrawal: 'fa-arrow-up',
      Expense: 'fa-receipt',
      Refund: 'fa-undo-alt',
    };
    return map[type] || 'fa-circle';
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      Success: 'bg-green-100 text-green-800',
      Pending: 'bg-yellow-100 text-yellow-800',
      Failed: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  }

  getAmountColor(amount: number): string {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // ------ Charts ------
  private initCharts(): void {
    this.destroyCharts();

    // Line Chart: Daily Deposit / Withdrawal / Refund Trend
    const lineCtx = this.lineChartCanvas?.nativeElement;
    if (lineCtx) {
      // Aggregations by date
      const deposits: Record<string, number> = {};
      const withdrawals: Record<string, number> = {};
      const refunds: Record<string, number> = {};

      this.entries.forEach((e) => {
        const date = new Date(e.createdAt).toLocaleDateString();
        if (e.transactionType === 'Deposit') {
          deposits[date] = (deposits[date] || 0) + e.amount;
        } else if (e.transactionType === 'Withdrawal') {
          withdrawals[date] = (withdrawals[date] || 0) + Math.abs(e.amount);
        } else if (e.transactionType === 'Refund') {
          refunds[date] = (refunds[date] || 0) + Math.abs(e.amount);
        }
      });

      const allDates = new Set([
        ...Object.keys(deposits),
        ...Object.keys(withdrawals),
        ...Object.keys(refunds),
      ]);
      const labels = Array.from(allDates).sort();

      const depositData = labels.map((d) => deposits[d] || 0);
      const withdrawalData = labels.map((d) => withdrawals[d] || 0);
      const refundData = labels.map((d) => refunds[d] || 0);

      this.lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Deposits',
              data: depositData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Withdrawals',
              data: withdrawalData,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Refunds',
              data: refundData,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true } },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: (value: any) => 'KSh ' + value.toFixed(0) },
            },
          },
        },
      });
    }

    // Pie Chart (unchanged, already includes refunds)
    const pieCtx = this.pieChartCanvas?.nativeElement;
    if (pieCtx) {
      const typeCount: Record<string, number> = {};
      this.entries.forEach((e) => {
        typeCount[e.transactionType] = (typeCount[e.transactionType] || 0) + 1;
      });
      const labels = Object.keys(typeCount);
      const values = Object.values(typeCount);
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

      this.pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors.slice(0, labels.length),
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, padding: 16 } },
          },
          cutout: '60%',
        },
      });
    }
  }

  private destroyCharts(): void {
    if (this.lineChart) {
      this.lineChart.destroy();
      this.lineChart = null;
    }
    if (this.pieChart) {
      this.pieChart.destroy();
      this.pieChart = null;
    }
  }
}
