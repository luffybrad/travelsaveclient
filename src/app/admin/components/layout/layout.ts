import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

interface NavItem {
  path: string;
  icon: string; // FontAwesome icon class (without 'fa-')
  label: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html',
})
export class AdminLayoutComponent {
  isSidebarOpen = true;
  userName: string = 'Admin';

  navItems: NavItem[] = [
    { path: '/admin/dashboard', icon: 'chart-pie', label: 'Dashboard' },
    { path: '/admin/users', icon: 'users', label: 'Users' },
    { path: '/admin/plans', icon: 'file-alt', label: 'Plans' },
    { path: '/admin/ledger', icon: 'coins', label: 'Ledger' },
    { path: '/admin/profile', icon: 'user-cog', label: 'Profile' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.userName = this.authService.getUserName() || 'Admin';
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    this.authService.logout();
  }
}
