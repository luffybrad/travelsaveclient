import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs/internal/Subscription';

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
export class AdminLayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = true;
  userName: string = 'Admin';
  private subscription!: Subscription;
  isDropdownOpen = false;

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

  ngOnInit(): void {
    this.subscription = this.authService.currentUser$.subscribe((user) => {
      this.userName = user?.userName || 'Admin';
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation(); // Prevent the click from propagating to the document
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  // Optionally, close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdownContainer = document.querySelector('.user-dropdown-container');
    if (dropdownContainer && !dropdownContainer.contains(target)) {
      this.closeDropdown();
    }
  }
}
