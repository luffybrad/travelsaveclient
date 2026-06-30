import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { Router } from '@angular/router';
import { ProfileService } from '../../../services/profile.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProfileComponent implements OnInit, OnDestroy {
  // Profile Information
  profile = {
    id: '',
    userName: '',
    email: '',
    emailConfirmed: false,
    roles: [] as string[],
  };

  // Edit Profile
  editProfile = {
    userName: '',
    email: '',
    currentPassword: '',
  };
  isEditing = false;
  updateLoading = false;
  updateSuccess = false;
  updateError = '';

  // Change Password
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  passwordLoading = false;
  passwordSuccess = false;
  passwordError = '';

  // Delete Account
  deleteLoading = false;
  deleteError = '';
  showDeleteConfirm = false;

  private destroy$ = new Subject<void>();

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProfile(): void {
    this.profileService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.profile = response.data;
            this.editProfile.userName = response.data.userName;
            this.editProfile.email = response.data.email;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Failed to load profile', error);
        },
      });
  }

  // --- Update Profile ---
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.editProfile.userName = this.profile.userName;
      this.editProfile.email = this.profile.email;
      this.editProfile.currentPassword = '';
      this.updateSuccess = false;
      this.updateError = '';
    }
  }

  saveProfile(): void {
    if (!this.editProfile.currentPassword) {
      this.updateError = 'Current password is required to update profile.';
      this.cdr.markForCheck();
      return;
    }
    this.updateLoading = true;
    this.updateError = '';
    this.updateSuccess = false;

    this.profileService
      .updateProfile(this.editProfile)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.updateLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.updateSuccess = true;
            this.profile.userName = response.data.userName;
            this.profile.email = response.data.email;
            this.profile.emailConfirmed = response.data.emailConfirmed;
            // Update stored user data in AuthService
            const userData = {
              userName: response.data.userName,
              roles: this.profile.roles,
            };
            localStorage.setItem('user_data', JSON.stringify(userData));
            this.isEditing = false;
            this.cdr.markForCheck();
          } else {
            this.updateError = response.message || 'Failed to update profile.';
          }
        },
        error: (error) => {
          this.updateError = error?.error?.message || 'An unexpected error occurred.';
        },
      });
  }

  // --- Change Password ---
  changePassword(): void {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.passwordError = 'New passwords do not match.';
      this.cdr.markForCheck();
      return;
    }
    if (this.passwordData.newPassword.length < 6) {
      this.passwordError = 'New password must be at least 6 characters.';
      this.cdr.markForCheck();
      return;
    }
    this.passwordLoading = true;
    this.passwordError = '';
    this.passwordSuccess = false;

    this.profileService
      .changePassword({
        currentPassword: this.passwordData.currentPassword,
        newPassword: this.passwordData.newPassword,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.passwordLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.passwordSuccess = true;
            this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
            this.cdr.markForCheck();
          } else {
            this.passwordError = response.message || 'Failed to change password.';
          }
        },
        error: (error) => {
          this.passwordError = error?.error?.message || 'An unexpected error occurred.';
        },
      });
  }

  // --- Delete Account ---
  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  deleteAccount(): void {
    if (!this.passwordData.currentPassword) {
      this.deleteError = 'Please enter your current password to delete your account.';
      this.cdr.markForCheck();
      return;
    }
    this.deleteLoading = true;
    this.deleteError = '';

    this.profileService
      .deleteAccount({ currentPassword: this.passwordData.currentPassword })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.deleteLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.authService.logout();
          } else {
            this.deleteError = response.message || 'Failed to delete account.';
          }
        },
        error: (error) => {
          this.deleteError = error?.error?.message || 'An unexpected error occurred.';
        },
      });
  }

  // UI helpers
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
