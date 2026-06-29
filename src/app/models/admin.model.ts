// src/app/models/admin.models.ts
export interface User {
  id: string;
  userName: string;
  email: string;
  emailConfirmed: boolean;
  roles: string[];
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  targetBudget: number;
  currentBalance: number;
  currency: string;
  status: 'Active' | 'Completed' | 'Archived';
  ownerId: string;
  ownerName: string;
  memberCount: number;
  createdAt: string;
  completedAt?: string;
}

export interface LedgerEntry {
  id: number;
  planId: number;
  userId: string;
  userName: string;
  transactionType: 'Deposit' | 'Withdrawal' | 'Expense' | 'Refund';
  amount: number;
  description: string;
  createdAt: string;
  paymentStatus: 'Pending' | 'Success' | 'Failed';
  paystackReference?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalPlans: number;
  activePlans: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalExpenses: number;
  totalBalance: number;
  recentActivities: RecentActivity[];
}

export interface RecentActivity {
  id: string;
  type: 'user_registered' | 'plan_created' | 'deposit_made' | 'withdrawal_made' | 'expense_added';
  description: string;
  timestamp: string;
  userEmail?: string;
  planName?: string;
  amount?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  statusCode: number;
  timestamp: string;
}

export interface PlanDetail extends Plan {
  members: PlanMember[];
  ledgerEntries: LedgerEntry[];
}

export interface PlanMember {
  userId: string;
  userName: string;
  role: string;
  email: string;
  joinedAt: string;
}
