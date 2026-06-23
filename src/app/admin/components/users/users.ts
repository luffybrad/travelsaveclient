// src/app/admin/users/users.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { User } from '../../../models/admin.model';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';
  selectedUser: User | null = null;
  showRoleModal = false;
  isUpdating = false;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.error = null;

    this.adminService
      .getUsers()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.users = response.data;
            this.filteredUsers = this.users;
          } else {
            this.error = response.message || 'Failed to load users';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  filterUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = this.users;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(
      (user) =>
        user.email.toLowerCase().includes(term) ||
        user.userName.toLowerCase().includes(term) ||
        user.id.toLowerCase().includes(term),
    );
  }

  openRoleModal(user: User): void {
    this.selectedUser = user;
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
  }

  updateUserRole(role: string): void {
    if (!this.selectedUser) return;

    this.isUpdating = true;
    const roles = [role];

    this.adminService
      .updateUserRole(this.selectedUser.id, roles)
      .pipe(finalize(() => (this.isUpdating = false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update user in list
            const index = this.users.findIndex((u) => u.id === this.selectedUser!.id);
            if (index !== -1) {
              this.users[index].roles = roles;
            }
            this.filterUsers();
            this.closeRoleModal();
          } else {
            this.error = response.message || 'Failed to update user role';
          }
        },
        error: (error) => {
          this.error = error?.error?.message || 'An unexpected error occurred';
        },
      });
  }

  deleteUser(user: User): void {
    if (
      !confirm(
        `Are you sure you want to delete user "${user.email}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.adminService.deleteUser(user.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.users = this.users.filter((u) => u.id !== user.id);
          this.filterUsers();
        } else {
          this.error = response.message || 'Failed to delete user';
        }
      },
      error: (error) => {
        this.error = error?.error?.message || 'An unexpected error occurred';
      },
    });
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800';
      case 'User':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
