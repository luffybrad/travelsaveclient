// src/app/admin/layout/layout.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html',
})
export class AdminLayoutComponent {
  isSidebarOpen = true;
  userName: string | null = null;

  menuItems = [
    { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/admin/users', icon: '👥', label: 'Users' },
    { path: '/admin/plans', icon: '📋', label: 'Plans' },
    { path: '/admin/ledger', icon: '💰', label: 'Ledger' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.userName = this.authService.getUserName();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
